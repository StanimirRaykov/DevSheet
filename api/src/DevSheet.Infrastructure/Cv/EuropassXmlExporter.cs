using System.Globalization;
using System.Net;
using System.Text;
using System.Xml;
using System.Xml.Linq;
using DevSheet.Application.Career;
using DevSheet.Application.Cv;
using DevSheet.Domain.Entities;

namespace DevSheet.Infrastructure.Cv;

/// <summary>
/// The CV as a Europass "Candidate" XML document (the format the Europass online editor imports since 2020). Built from
/// the same privacy-filtered <see cref="CvModel"/> as the PDFs, so only visible projects and confirmed skills appear.
/// The Commission publishes no schema for this format; the structure follows the unofficial XSD and reference from
/// github.com/J0ker98/europass-cv (CC-BY-4.0), copied into the test project. See docs/EUROPASS.md for the mapping.
/// </summary>
public static class EuropassXmlExporter
{
    public static readonly XNamespace Ep = "http://www.europass.eu/1.0";
    public static readonly XNamespace Hr = "http://www.hr-xml.org/3";
    public static readonly XNamespace Oa = "http://www.openapplications.org/oagis/9";
    public static readonly XNamespace Eures = "http://www.europass_eures.eu/1.0";
    private static readonly XNamespace Xsi = "http://www.w3.org/2001/XMLSchema-instance";

    /// <summary>The language the CV is written in. DevSheet's own texts and section names are English.</summary>
    private const string CvLanguage = "en";

    public static byte[] Export(CvModel cv)
    {
        var settings = new XmlWriterSettings { Encoding = new UTF8Encoding(false), Indent = true };
        using var stream = new MemoryStream();
        using (var writer = XmlWriter.Create(stream, settings)) Build(cv).Save(writer);
        return stream.ToArray();
    }

    public static XDocument Build(CvModel cv)
    {
        var (given, family) = SplitName(cv.Name);
        var name = new XElement(Ep + "PersonName", new XElement(Oa + "GivenName", Clean(given)), new XElement(Hr + "FamilyName", Clean(family)));
        var email = Has(cv.Email) ? Channel("Email", new XElement(Oa + "URI", Clean(cv.Email))) : null;

        var sections = new List<string>();
        var profile = new XElement(Ep + "CandidateProfile", new XAttribute("languageCode", CvLanguage),
            Summary(cv),
            Employment(cv, sections),
            Education(cv, sections),
            Languages(cv, sections),
            Skills(cv, sections),
            Custom("Projects", cv.Projects.Select(Project)),
            Custom("Certifications", cv.Certifications.Select(Certification)));

        return new XDocument(new XDeclaration("1.0", "UTF-8", "yes"),
            new XElement(Ep + "Candidate",
                new XAttribute(Xsi + "schemaLocation", "http://www.europass.eu/1.0 Candidate.xsd"),
                new XAttribute(XNamespace.Xmlns + "oa", Oa),
                new XAttribute(XNamespace.Xmlns + "eures", Eures),
                new XAttribute(XNamespace.Xmlns + "hr", Hr),
                new XAttribute(XNamespace.Xmlns + "xsi", Xsi),
                Identifier(Hr + "DocumentID", "DocumentIdentifier", "4.0"),
                new XElement(Ep + "CandidateSupplier",
                    Identifier(Hr + "PartyID", "PartyID", "1.0"),
                    new XElement(Hr + "PartyName", "Owner"),
                    new XElement(Ep + "PersonContact", new XElement(name), email is null ? null : new XElement(email)),
                    new XElement(Hr + "PrecedenceCode", 1)),
                new XElement(Ep + "CandidatePerson",
                    name,
                    email,
                    Phone(cv),
                    Has(cv.GithubUrl) ? Channel("Web", new XElement(Oa + "URI", Clean(AbsoluteUrl(cv.GithubUrl)))) : null,
                    Address(cv),
                    cv.Languages.Where(l => l.IsMotherTongue).Select(l =>
                    {
                        var (scheme, value) = LanguageCode(l);
                        return new XElement(Ep + "PrimaryLanguageCode", new XAttribute("name", scheme), value);
                    })),
                profile,
                new XElement(Ep + "RenderingInformation",
                    new XElement(Ep + "Design",
                        new XElement(Ep + "Template", "Template1"),
                        new XElement(Ep + "Color", "Default"),
                        new XElement(Ep + "FontSize", "Medium"),
                        new XElement(Ep + "Logo", "FirstPage"),
                        new XElement(Ep + "PageNumbers", "true"),
                        // Without this list the editor imports the sections but shows none of them. Custom sections
                        // (projects, certifications) are added by the editor itself.
                        new XElement(Ep + "SectionsOrder",
                            sections.Select(s => new XElement(Ep + "Section", new XElement(Ep + "Title", s))))))));
    }

    /// <summary>
    /// DevSheet keeps one name field; Europass wants given and family name. The first word is the given name and
    /// the rest the family name ("Maria de la Cruz" -> Maria / de la Cruz). One word: the family name stays empty and
    /// the person can fix it in the editor.
    /// </summary>
    public static (string Given, string Family) SplitName(string name)
    {
        var words = name.Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries);
        return words.Length switch
        {
            0 => ("", ""),
            1 => (words[0], ""),
            _ => (words[0], string.Join(' ', words[1..])),
        };
    }

    /// <summary>
    /// ISO 639-1 ("bg") to the ISO 639-2 code the editor lists ("bul"). A language without a code, or one .NET does not
    /// know, is written as free text with its name: still valid, and the editor shows it as typed.
    /// </summary>
    public static (string Scheme, string Value) LanguageCode(CvLanguage l)
    {
        if (l.IsoCode is { Length: 2 } code)
        {
            try
            {
                var three = CultureInfo.GetCultureInfo(code, predefinedOnly: true).ThreeLetterISOLanguageName;
                if (three.Length == 3 && three.All(char.IsAsciiLetterLower)) return ("NORMAL", three);
            }
            catch (CultureNotFoundException) { }
        }
        return ("FREE_TEXT", Clean(l.Name));
    }

    private static XElement? Summary(CvModel cv)
    {
        var parts = new List<string>();
        if (Has(cv.Headline)) parts.Add($"<p><strong>{Html(cv.Headline)}</strong></p>");
        if (Has(cv.Summary)) parts.Add(Paragraphs(cv.Summary));
        return parts.Count == 0 ? null : new XElement(Hr + "ExecutiveSummary", string.Concat(parts));
    }

    private static XElement? Employment(CvModel cv, List<string> sections)
    {
        if (cv.Experience.Count == 0) return null;
        sections.Add("work-experience");
        return new XElement(Ep + "EmploymentHistory", cv.Experience.Select(x =>
            new XElement(Ep + "EmployerHistory",
                new XElement(Hr + "OrganizationName", Clean(x.Company)),
                // DevSheet does not store where a job was, but the address must exist: the editor's preview reads
                // employerDetails.organisationAddress.addressPart1 without a null check and stops drawing the CV at
                // the first job without one. An empty Address imports as an address with no fields (checked 2026-11-24).
                new XElement(Ep + "OrganizationContact", new XElement(Ep + "Communication", new XElement(Ep + "Address"))),
                new XElement(Ep + "PositionHistory",
                    new XElement(Ep + "PositionTitle", new XAttribute("typeCode", "FREETEXT"), Clean(x.Title)),
                    new XElement(Eures + "EmploymentPeriod",
                        new XElement(Eures + "StartDate", Date(x.Start)),
                        x.End is { } end ? new XElement(Eures + "EndDate", Date(end)) : null,
                        new XElement(Hr + "CurrentIndicator", x.End is null ? "true" : "false")),
                    Has(x.Description) ? new XElement(Oa + "Description", Paragraphs(x.Description)) : null))));
    }

    private static XElement? Education(CvModel cv, List<string> sections)
    {
        if (cv.Education.Count == 0) return null;
        sections.Add("education-training");
        return new XElement(Ep + "EducationHistory", cv.Education.Select(e =>
            new XElement(Ep + "EducationOrganizationAttendance",
                new XElement(Hr + "OrganizationName", Clean(e.Institution)),
                e.Start is null && e.End is null ? null : new XElement(Ep + "AttendancePeriod",
                    e.Start is { } s ? new XElement(Ep + "StartDate", Date(s)) : null,
                    e.End is { } en ? new XElement(Ep + "EndDate", Date(en)) : null,
                    // Same reading as the PDFs: a start without an end is still going on.
                    new XElement(Ep + "Ongoing", e.Start is not null && e.End is null ? "true" : "false")),
                Has(e.Degree) ? new XElement(Ep + "EducationDegree", new XElement(Hr + "DegreeName", Clean(e.Degree))) : null)));
    }

    private static XElement? Languages(CvModel cv, List<string> sections)
    {
        var foreign = cv.Languages.Where(l => !l.IsMotherTongue).ToList();
        if (foreign.Count == 0) return null;
        sections.Add("language");
        return new XElement(Ep + "PersonQualifications", foreign.Select(l =>
        {
            var (scheme, value) = LanguageCode(l);
            return new XElement(Ep + "PersonCompetency",
                new XElement(Ep + "CompetencyID", new XAttribute("schemeName", scheme), value),
                new XElement(Hr + "TaxonomyID", "language"),
                Dimension("CEF-Understanding-Listening", l.Listening),
                Dimension("CEF-Understanding-Reading", l.Reading),
                Dimension("CEF-Speaking-Interaction", l.SpokenInteraction),
                Dimension("CEF-Speaking-Production", l.SpokenProduction),
                // Europass has one writing skill today ("production"); DevSheet's single Writing level maps to it.
                Dimension("CEF-Writing-Production", l.Writing));
        }));
    }

    private static XElement? Dimension(string code, CefrLevel? level) => level is { } v && Enum.IsDefined(v)
        ? new XElement(Eures + "CompetencyDimension",
            new XElement(Hr + "CompetencyDimensionTypeCode", code),
            new XElement(Eures + "Score", new XElement(Hr + "ScoreText", v.ToString())))
        : null;

    private static XElement? Skills(CvModel cv, List<string> sections)
    {
        // The editor rejects two skills with the same name.
        var skills = cv.Skills.Select(Clean).Where(Has).Distinct(StringComparer.OrdinalIgnoreCase).ToList();
        if (skills.Count == 0) return null;
        sections.Add("profile-skills");
        return new XElement(Ep + "Skills", skills.Select(s =>
            new XElement(Ep + "PersonCompetency", new XElement(Hr + "TaxonomyID", "Digital_Skill"), new XElement(Hr + "CompetencyName", s))));
    }

    private sealed record Entry(string Title, DateOnly? Date, string Description, string? Link);

    private static Entry Project(CvProject p)
    {
        var text = new List<string>();
        if (Has(p.Description)) text.Add(Paragraphs(p.Description!));
        if (p.Skills.Count > 0) text.Add($"<p>{Html(string.Join(", ", p.Skills))}</p>");
        return new Entry(p.Title, null, string.Concat(text), p.Url);
    }

    private static Entry Certification(CvCertification c) =>
        new(c.Name, c.Date, Has(c.Issuer) ? $"<p>{Html(c.Issuer)}</p>" : "", c.Url);

    /// <summary>
    /// A custom section. The importer keeps only the last entry of each Others, so every entry gets its own Others with
    /// the same section title and the editor merges them back into one section.
    /// </summary>
    private static IEnumerable<XElement> Custom(string title, IEnumerable<Entry> entries) =>
        entries.Where(e => Has(e.Title)).Select(e =>
            new XElement(Ep + "Others",
                new XElement(Ep + "Title", title),
                new XElement(Ep + "Other",
                    new XElement(Ep + "Title", Clean(e.Title)),
                    e.Date is { } d ? new XElement(Ep + "Date", new XElement(Ep + "StartDate", Date(d))) : null,
                    e.Description.Length > 0 ? new XElement(Ep + "Description", e.Description) : null,
                    Has(e.Link) ? new XElement(Ep + "Link", Clean(e.Link!)) : null)));

    private static XElement? Phone(CvModel cv)
    {
        if (Countries.SplitPhone(cv.Phone) is not { } phone) return null;
        // CountryDialing is mandatory (the importer rejects a telephone without it), and without CountryCode the
        // editor flags the prefix as invalid (checked against the live importer, 2026-11-24).
        return Channel("Telephone",
            new XElement(Ep + "UseCode", "mobile"),
            new XElement(Ep + "CountryDialing", phone.Dialing),
            new XElement(Oa + "DialNumber", phone.Number),
            Countries.ForPhone(phone, cv.CountryCode) is { } country ? new XElement(Ep + "CountryCode", country.Code) : null);
    }

    private static XElement? Address(CvModel cv)
    {
        // A home address with a city but no country crashes the live importer (HTTP 500, empty body, checked
        // 2026-11-24), so without a country there is no address at all. A country alone imports fine.
        if (!Has(cv.CountryCode)) return null;
        return new XElement(Ep + "Communication",
            new XElement(Ep + "UseCode", "home"),
            new XElement(Ep + "Address", new XAttribute("type", "home"),
                Has(cv.City) ? new XElement(Oa + "CityName", Clean(cv.City)) : null,
                Has(cv.CountryCode) ? new XElement(Ep + "CountryCode", cv.CountryCode) : null));
    }

    private static XElement Channel(string code, params object?[] content) =>
        new(Ep + "Communication", new XElement(Ep + "ChannelCode", code), content);

    private static XElement Identifier(XName name, string scheme, string version) =>
        new(name, new XAttribute("schemeID", "devsheet"), new XAttribute("schemeName", scheme),
            new XAttribute("schemeAgencyName", "EUROPASS"), new XAttribute("schemeVersionID", version));

    private static XElement Date(DateOnly d) => new(Hr + "FormattedDateTime", d.ToString("yyyy-MM", CultureInfo.InvariantCulture));

    /// <summary>
    /// Long texts are HTML that the editor stores escaped inside the text node. User text is HTML-encoded first, then
    /// LINQ to XML escapes the markup once more when it writes the node: "&lt;" in a summary arrives as text, not a tag.
    /// Blank lines start a paragraph, single line breaks become &lt;br&gt;.
    /// </summary>
    private static string Paragraphs(string text) =>
        string.Concat(Clean(text).Replace("\r\n", "\n").Split("\n\n", StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(p => $"<p>{string.Join("<br>", p.Split('\n').Select(line => Html(line.Trim())))}</p>"));

    private static string Html(string text) => WebUtility.HtmlEncode(Clean(text));

    /// <summary>Trimmed, without the control characters XML 1.0 cannot carry (they would make the file unreadable).</summary>
    private static string Clean(string text) =>
        new string(text.Where(c => c is '\n' or '\r' or '\t' || XmlConvert.IsXmlChar(c) && !char.IsControl(c) || char.IsSurrogate(c)).ToArray()).Trim();

    private static bool Has(string? text) => !string.IsNullOrWhiteSpace(text);

    private static string AbsoluteUrl(string url) => url.StartsWith("http", StringComparison.OrdinalIgnoreCase) ? url : "https://" + url;
}
