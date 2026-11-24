using System.Net;
using System.Xml;
using System.Xml.Linq;
using System.Xml.Schema;
using DevSheet.Api;
using DevSheet.Application.Career;
using DevSheet.Application.Cv;
using DevSheet.Domain.Entities;
using DevSheet.Infrastructure.Career;
using DevSheet.Infrastructure.Cv;
using Microsoft.AspNetCore.Mvc.Testing;
using static DevSheet.Infrastructure.Cv.EuropassXmlExporter;

namespace DevSheet.Tests;

/// <summary>The Europass Candidate XML export, checked against the unofficial XSD in Europass/ (see NOTICE.md there).</summary>
public class EuropassXmlTests
{
    private static readonly XmlSchemaSet Schema = LoadSchema();

    private static XmlSchemaSet LoadSchema()
    {
        var set = new XmlSchemaSet { XmlResolver = new XmlUrlResolver() };
        set.Add(null, Path.Combine(AppContext.BaseDirectory, "Europass", "europass-candidate.xsd"));
        set.Compile();
        return set;
    }

    /// <summary>Serializes to bytes, parses back and validates, so the test sees exactly what the user downloads.</summary>
    private static XDocument ExportAndValidate(CvModel cv)
    {
        var bytes = Export(cv);
        var doc = XDocument.Load(new MemoryStream(bytes));
        var problems = new List<string>();
        doc.Validate(Schema, (_, e) => problems.Add($"{e.Severity}: {e.Message}"));
        Assert.True(problems.Count == 0, string.Join("\n", problems));
        return doc;
    }

    private static CvModel Empty(string name = "Ana Petrova") => new(name, "", "", "", "", "", [], [], [], []);

    private static CvModel Full() => new(
        "Ana Petrova", "Backend developer", "I build APIs.\n\nAnd the tools around them.", "ana.petrova@example.com",
        "Plovdiv, Bulgaria", "github.com/ana-example",
        ["C#", "PostgreSQL", "Docker"],
        [new CvExperience("Backend developer", "Example Ledger Ltd", new(2022, 3, 1), null, "Payments API.\nOn-call."),
         new CvExperience("Intern", "Example Maps", new(2020, 6, 1), new(2020, 9, 1), "")],
        [new CvEducation("Technical University of Sofia", "BSc Computer Science", new(2018, 9, 1), new(2022, 6, 1)),
         new CvEducation("Example Online School", "", null, null)],
        [new CvProject("ledger", "A double-entry ledger.", "https://github.com/ana-example/ledger", ["C#", "PostgreSQL"])])
    {
        Languages =
        [
            new CvLanguage("Bulgarian", true, null, null, null, null, null) { IsoCode = "bg" },
            new CvLanguage("English", false, CefrLevel.C1, CefrLevel.C1, CefrLevel.B2, CefrLevel.B2, CefrLevel.B2) { IsoCode = "en" },
        ],
        Certifications = [new CvCertification("Example Cloud Associate", "Example Cloud", new(2024, 5, 10), "https://example.com/cert")],
        Phone = "+359 88 123 4567", CountryCode = "bg", City = "Plovdiv",
    };

    private static IEnumerable<string> Values(XDocument d, XName name) => d.Descendants(name).Select(e => e.Value);

    [Fact]
    public void A_full_cv_validates_and_fills_every_section()
    {
        var d = ExportAndValidate(Full());
        var person = d.Root!.Element(Ep + "CandidatePerson")!;

        Assert.Equal("Ana", person.Element(Ep + "PersonName")!.Element(Oa + "GivenName")!.Value);
        Assert.Equal("Petrova", person.Element(Ep + "PersonName")!.Element(Hr + "FamilyName")!.Value);
        var phone = person.Elements(Ep + "Communication").Single(c => c.Element(Ep + "ChannelCode")?.Value == "Telephone");
        Assert.Equal("359", phone.Element(Ep + "CountryDialing")!.Value);
        Assert.Equal("881234567", phone.Element(Oa + "DialNumber")!.Value);
        Assert.Equal("https://github.com/ana-example", person.Elements(Ep + "Communication")
            .Single(c => c.Element(Ep + "ChannelCode")?.Value == "Web").Element(Oa + "URI")!.Value);
        var address = person.Descendants(Ep + "Address").Single();
        Assert.Equal("Plovdiv", address.Element(Oa + "CityName")!.Value);
        Assert.Equal("bg", address.Element(Ep + "CountryCode")!.Value);
        Assert.Equal(["bul"], person.Elements(Ep + "PrimaryLanguageCode").Select(e => e.Value));

        Assert.Equal(["2022-03", "2020-06"], Values(d, Eures + "StartDate"));
        Assert.Equal(["true", "false"], Values(d, Hr + "CurrentIndicator"));
        Assert.Equal("<p>Payments API.<br>On-call.</p>", d.Descendants(Oa + "Description").Single().Value);
        Assert.Equal(["BSc Computer Science"], Values(d, Hr + "DegreeName"));

        var english = d.Descendants(Ep + "PersonQualifications").Single().Element(Ep + "PersonCompetency")!;
        Assert.Equal("eng", english.Element(Ep + "CompetencyID")!.Value);
        Assert.Equal(["CEF-Understanding-Listening", "CEF-Understanding-Reading", "CEF-Speaking-Interaction", "CEF-Speaking-Production", "CEF-Writing-Production"],
            english.Descendants(Hr + "CompetencyDimensionTypeCode").Select(e => e.Value));
        Assert.Equal(["C1", "C1", "B2", "B2", "B2"], english.Descendants(Hr + "ScoreText").Select(e => e.Value));

        Assert.Equal(["C#", "PostgreSQL", "Docker"], Values(d, Hr + "CompetencyName"));
        var custom = d.Descendants(Ep + "Others").Select(o => (o.Element(Ep + "Title")!.Value, o.Element(Ep + "Other")!.Element(Ep + "Title")!.Value));
        Assert.Equal([("Projects", "ledger"), ("Certifications", "Example Cloud Associate")], custom);
        Assert.Equal(["work-experience", "education-training", "language", "profile-skills"],
            d.Descendants(Ep + "SectionsOrder").Single().Elements().Select(s => s.Value));
        Assert.Equal("en", d.Root!.Element(Ep + "CandidateProfile")!.Attribute("languageCode")!.Value);
    }

    [Fact]
    public void A_cv_with_only_a_name_validates_and_lists_no_sections()
    {
        var d = ExportAndValidate(Empty());
        Assert.Empty(d.Descendants(Ep + "SectionsOrder").Single().Elements());
        Assert.Empty(d.Root!.Element(Ep + "CandidatePerson")!.Elements(Ep + "Communication"));
    }

    [Fact]
    public void A_cv_without_any_name_still_validates()
    {
        var d = ExportAndValidate(Empty(""));
        Assert.Equal("", d.Descendants(Oa + "GivenName").First().Value);
    }

    [Fact]
    public void Cyrillic_survives_and_markup_in_user_text_stays_text()
    {
        var cv = Empty("Ана Петрова") with { Summary = "Пиша <script>alert(1)</script> & \"кавички\"\u0001" };
        var bytes = Export(cv);
        var d = ExportAndValidate(cv);

        Assert.Equal("Ана", d.Descendants(Oa + "GivenName").First().Value);
        Assert.Equal("Петрова", d.Descendants(Hr + "FamilyName").First().Value);
        // The editor unescapes the node once and reads HTML: the user's "<script>" must still be text after that.
        Assert.Equal("<p>Пиша &lt;script&gt;alert(1)&lt;/script&gt; &amp; &quot;кавички&quot;</p>", d.Descendants(Hr + "ExecutiveSummary").Single().Value);
        Assert.DoesNotContain("<script>", System.Text.Encoding.UTF8.GetString(bytes));
    }

    [Fact]
    public void A_language_without_a_known_code_is_written_as_free_text()
    {
        var cv = Empty() with
        {
            Languages =
            [
                new CvLanguage("Klingon", false, CefrLevel.A1, null, null, null, null) { IsoCode = "qq" },
                new CvLanguage("Shopski", true, null, null, null, null, null),
            ],
        };
        var d = ExportAndValidate(cv);

        var foreign = d.Descendants(Ep + "CompetencyID").Single();
        Assert.Equal(("FREE_TEXT", "Klingon"), (foreign.Attribute("schemeName")!.Value, foreign.Value));
        var native = d.Descendants(Ep + "PrimaryLanguageCode").Single();
        Assert.Equal(("FREE_TEXT", "Shopski"), (native.Attribute("name")!.Value, native.Value));
    }

    [Fact]
    public void Duplicate_skills_are_written_once()
    {
        var d = ExportAndValidate(Empty() with { Skills = ["Docker", "docker", " Docker "] });
        Assert.Equal(["Docker"], Values(d, Hr + "CompetencyName"));
    }

    [Fact]
    public void Every_job_has_an_empty_company_address_for_the_editor_preview()
    {
        // Without it the Europass preview crashes on the first job (it reads organisationAddress without a null check).
        var d = ExportAndValidate(Full());
        Assert.All(d.Descendants(Ep + "EmployerHistory"), job =>
        {
            var address = job.Element(Ep + "OrganizationContact")!.Element(Ep + "Communication")!.Element(Ep + "Address")!;
            Assert.Empty(address.Elements());
        });
    }

    [Fact]
    public void A_city_without_a_country_writes_no_address()
    {
        // The live importer answers 500 to a home address that has a city and no country.
        var d = ExportAndValidate(Empty() with { City = "Sofia", Location = "Sofia" });
        Assert.Empty(d.Descendants(Ep + "Address"));

        var withCountry = ExportAndValidate(Empty() with { City = "Sofia", CountryCode = "bg" });
        Assert.Equal(["Sofia", "bg"], withCountry.Descendants(Ep + "Address").Single().Elements().Select(e => e.Value));
        var countryOnly = ExportAndValidate(Empty() with { CountryCode = "bg" });
        Assert.Equal(["bg"], countryOnly.Descendants(Ep + "Address").Single().Elements().Select(e => e.Value));
    }

    [Theory]
    [InlineData("+359 88 123 4567", "", "bg")]    // no profile country: the owner of the calling code
    [InlineData("+1 415 555 0100", "ca", "ca")]   // shared code: the profile country when it matches
    [InlineData("+1 415 555 0100", "bg", "us")]   // shared code, other profile country: the main one
    [InlineData("+44 20 7946 0000", "", "gb")]
    public void The_phone_always_carries_a_country(string number, string profileCountry, string expected)
    {
        // Without CountryCode the editor flags the phone's prefix as invalid.
        var d = ExportAndValidate(Empty() with { Phone = number, CountryCode = profileCountry });
        var phone = d.Descendants(Ep + "Communication").Single(c => c.Element(Ep + "ChannelCode")?.Value == "Telephone");
        Assert.Equal(expected, phone.Element(Ep + "CountryCode")!.Value);
    }

    [Fact]
    public void A_phone_without_a_known_calling_code_is_left_out()
    {
        var d = ExportAndValidate(Empty() with { Phone = "0888 123 456" });
        Assert.Empty(d.Descendants(Ep + "CountryDialing"));
    }

    [Theory]
    [InlineData("Ana Petrova", "Ana", "Petrova")]
    [InlineData("Maria de la Cruz", "Maria", "de la Cruz")]
    [InlineData("  Ana   Petrova  ", "Ana", "Petrova")]
    [InlineData("Ana", "Ana", "")]
    [InlineData("", "", "")]
    public void The_name_is_split_at_the_first_space(string name, string given, string family) =>
        Assert.Equal((given, family), SplitName(name));
}

/// <summary>The data the XML is built from: phone and country follow the same privacy rules as email and location.</summary>
public class CvContactTests
{
    private static async Task<(TestDb t, User u)> Setup(bool showPhone, bool showLocation)
    {
        var t = new TestDb();
        var u = t.AddUser("ana");
        var r = await new CareerService(t.Db).UpsertProfileAsync(u.Id, new ProfileInput("Ana Petrova", "", "", "Plovdiv", "", false, showLocation,
            Phone: "+359 88 123 4567", CountryCode: "BG", ShowPhonePublicly: showPhone));
        Assert.Equal(Outcome.Ok, r.Outcome);
        return (t, u);
    }

    [Fact]
    public async Task The_owner_always_gets_phone_and_country()
    {
        var (t, u) = await Setup(showPhone: false, showLocation: false);
        using var _ = t;
        var cv = (await new CvDataService(t.Db).BuildAsync(u.Id))!;
        Assert.Equal("+359 88 123 4567", cv.Phone);
        Assert.Equal("bg", cv.CountryCode);
        Assert.Equal("Plovdiv, Bulgaria", cv.Location);
        Assert.Equal("Plovdiv", cv.City);
    }

    [Fact]
    public async Task A_visitor_gets_them_only_when_shown_publicly()
    {
        var (t, u) = await Setup(showPhone: false, showLocation: false);
        using var _ = t;
        var hidden = (await new CvDataService(t.Db).BuildAsync(u.Id, forVisitor: true))!;
        Assert.Equal(("", "", "", ""), (hidden.Phone, hidden.CountryCode, hidden.Location, hidden.City));

        var p = t.Db.Profiles.Single(x => x.UserId == u.Id);
        (p.ShowPhonePublicly, p.ShowLocationPublicly) = (true, true);
        await t.Db.SaveChangesAsync();
        var shown = (await new CvDataService(t.Db).BuildAsync(u.Id, forVisitor: true))!;
        Assert.Equal(("+359 88 123 4567", "bg", "Plovdiv, Bulgaria"), (shown.Phone, shown.CountryCode, shown.Location));
    }
}

public class CountriesTests
{
    [Theory]
    [InlineData("+359 88 123 4567", "359", "881234567")]
    [InlineData("+1 (415) 555-0100", "1", "4155550100")]
    [InlineData("+44 20 7946 0000", "44", "2079460000")]
    [InlineData("+7 912 345-67-89", "7", "9123456789")]
    public void An_international_number_splits_into_calling_code_and_number(string phone, string dialing, string number) =>
        Assert.Equal(new PhoneParts(dialing, number), Countries.SplitPhone(phone));

    [Theory]
    [InlineData("0888 123 456")]        // no country code
    [InlineData("+359 88")]             // too short
    [InlineData("+359 88 123 4567 890 12")] // more than 15 digits
    [InlineData("+999 123 456 789")]    // no such calling code
    [InlineData("+359 88 CALL ME")]
    public void Anything_else_is_rejected(string phone) => Assert.Null(Countries.SplitPhone(phone));

    [Fact]
    public void Codes_are_unique_lower_case_and_calling_codes_are_digits()
    {
        Assert.Equal(Countries.All.Count, Countries.All.Select(c => c.Code).Distinct().Count());
        Assert.All(Countries.All, c =>
        {
            Assert.Matches("^[a-z]{2}$", c.Code);
            Assert.Matches("^[0-9]{1,3}$", c.Dialing);
            Assert.False(string.IsNullOrWhiteSpace(c.Name));
        });
        Assert.Equal("Bulgaria", Countries.Find("BG")!.Name);
        Assert.Equal(["Afghanistan", "Åland Islands", "Albania"], Countries.All.Take(3).Select(c => c.Name));
    }

    [Theory]
    [InlineData("Plovdiv", "bg", "Plovdiv, Bulgaria")]
    [InlineData("Plovdiv, Bulgaria", "bg", "Plovdiv, Bulgaria")]
    [InlineData("", "bg", "Bulgaria")]
    [InlineData("Plovdiv", "", "Plovdiv")]
    [InlineData("", "", "")]
    public void Place_joins_location_and_country_once(string location, string country, string expected) =>
        Assert.Equal(expected, CvFormat.Place(location, country));

    [Fact]
    public void The_profile_rejects_a_bad_phone_or_country()
    {
        var errors = CareerValidator.Validate(new ProfileInput("", "", "", "", "", false, false, Phone: "0888 123 456", CountryCode: "zz"));
        Assert.Contains("phone", errors.Keys);
        Assert.Contains("countryCode", errors.Keys);
        Assert.Empty(CareerValidator.Validate(new ProfileInput("", "", "", "", "", false, false, Phone: "+359 88 123 4567", CountryCode: "bg")));
    }
}

public class EuropassXmlApiTests(WebApplicationFactory<Program> factory) : IClassFixture<WebApplicationFactory<Program>>, IDisposable
{
    private readonly ApiHost _api = new(factory);

    [Fact]
    public async Task Downloads_my_cv_as_xml_with_nothing_of_another_user()
    {
        Guid id;
        using (var db = _api.Db())
        {
            var user = new User { DisplayName = "Ana Petrova", Slug = "cv-xml-ana" };
            var other = new User { DisplayName = "Bob Example", Slug = "cv-xml-bob" };
            db.Users.AddRange(user, other);
            db.Profiles.Add(new Profile { UserId = other.Id, FullName = "Bob Example", Phone = "+359 88 999 9999" });
            await db.SaveChangesAsync();
            id = user.Id;
        }

        var r = await _api.Client(id).GetAsync("/api/me/cv.xml");

        Assert.Equal(HttpStatusCode.OK, r.StatusCode);
        Assert.Equal("application/xml", r.Content.Headers.ContentType!.MediaType);
        Assert.Equal("cv-xml-ana-cv-europass.xml", r.Content.Headers.ContentDisposition!.FileName?.Trim('"'));
        var d = XDocument.Load(await r.Content.ReadAsStreamAsync());
        Assert.Equal("Ana", d.Descendants(Oa + "GivenName").First().Value);
        Assert.DoesNotContain("Bob", d.ToString());
        Assert.DoesNotContain("999", d.ToString());
    }

    [Fact]
    public async Task Anonymous_gets_401() =>
        Assert.Equal(HttpStatusCode.Unauthorized, (await _api.Client().GetAsync("/api/me/cv.xml")).StatusCode);

    public void Dispose() => _api.Dispose();
}
