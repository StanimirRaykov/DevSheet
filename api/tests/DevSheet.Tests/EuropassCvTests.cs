using System.Security.Claims;
using System.Text;
using DevSheet.Api.Controllers;
using DevSheet.Application.Career;
using DevSheet.Application.Cv;
using DevSheet.Domain.Entities;
using DevSheet.Infrastructure.Career;
using DevSheet.Infrastructure.Cv;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using UglyToad.PdfPig;

namespace DevSheet.Tests;

public class EuropassCvDataTests
{
    private static LanguageInput Foreign(string name, CefrLevel level) => new(name, null, false, level, level, level, level, level);

    [Fact]
    public async Task Cv_model_carries_only_my_languages_and_certifications_in_display_order()
    {
        using var t = new TestDb();
        var me = t.AddUser("ana");
        var other = t.AddUser("bob");
        var svc = new CareerService(t.Db, new FakeClock(new DateTimeOffset(2026, 11, 17, 0, 0, 0, TimeSpan.Zero)));
        await svc.CreateLanguageAsync(me.Id, Foreign("Spanish", CefrLevel.A2));
        await svc.CreateLanguageAsync(me.Id, new("Bulgarian", "bg", true, null, null, null, null, null));
        await svc.CreateLanguageAsync(other.Id, Foreign("Klingon", CefrLevel.C2));
        await svc.CreateCertificationAsync(me.Id, new("Old cert", "X", new(2020, 1, 1), null));
        await svc.CreateCertificationAsync(me.Id, new("New cert", "X", new(2025, 1, 1), null));
        await svc.CreateCertificationAsync(other.Id, new("Bobs cert", "X", null, null));

        var cv = await new CvDataService(t.Db).BuildAsync(me.Id);

        Assert.Equal(["Bulgarian", "Spanish"], cv!.Languages.Select(l => l.Name)); // native first
        Assert.Equal(["New cert", "Old cert"], cv.Certifications.Select(c => c.Name)); // newest first
    }

    [Fact]
    public async Task User_without_languages_or_certifications_gets_empty_lists()
    {
        using var t = new TestDb();
        var cv = await new CvDataService(t.Db).BuildAsync(t.AddUser().Id);
        Assert.Empty(cv!.Languages);
        Assert.Empty(cv.Certifications);
    }
}

public class EuropassStylePdfTests
{
    private static string Text(byte[] pdf)
    {
        using var doc = PdfDocument.Open(pdf);
        return string.Join("\n", doc.GetPages().Select(p => p.Text));
    }

    private static CvModel Empty() => new("Ana", "", "", "", "", "github.com/ana", [], [], [], []);

    private static CvModel Full() => new("Ana Petrova", "Backend developer", "About text", "ana@example.com", "Sofia", "github.com/ana",
        ["C#", "Docker"],
        [new("Developer", "Acme Corp", new(2024, 3, 1), null, "Built APIs")],
        [new("TU Sofia", "BSc Informatics", new(2022, 9, 1), null)],
        [new("DevSheet", "Portfolio platform", "https://github.com/ana/devsheet", ["C#"])])
    {
        Languages =
        [
            new("Bulgarian", true, null, null, null, null, null),
            new("English", false, CefrLevel.C1, CefrLevel.C1, CefrLevel.B2, CefrLevel.B2, CefrLevel.B2),
            new("German", false, CefrLevel.A2, null, null, null, CefrLevel.A1),
        ],
        Certifications = [new("AZ-900", "Microsoft", new(2025, 5, 1), "https://learn.microsoft.com/c")],
    };

    [Fact]
    public void Output_is_a_real_pdf()
    {
        var bytes = EuropassStyleCvRenderer.Render(Full());
        Assert.Equal("%PDF", Encoding.ASCII.GetString(bytes, 0, 4));
        Assert.True(bytes.Length > 1000);
    }

    [Fact]
    public void Contains_the_europass_section_headings_and_the_honest_footer()
    {
        var text = Text(EuropassStyleCvRenderer.Render(Full()));

        foreach (var heading in new[] { "ABOUT ME", "WORK EXPERIENCE", "EDUCATION AND TRAINING", "LANGUAGE SKILLS",
                                        "DIGITAL AND TECHNICAL SKILLS", "CERTIFICATIONS", "PROJECTS" })
            Assert.Contains(heading, text);
        Assert.Contains("not an official Europass document", text);
    }

    [Fact]
    public void Language_table_shows_native_languages_separately_and_the_five_skill_levels()
    {
        var text = Text(EuropassStyleCvRenderer.Render(Full()));

        Assert.Contains("Mother tongue(s):", text);
        Assert.Contains("Bulgarian", text);
        foreach (var col in new[] { "UNDERSTANDING", "SPEAKING", "WRITING", "Listening", "Reading", "Spoken interaction", "Spoken production" })
            Assert.Contains(col, text);
        Assert.Contains("English", text);
        Assert.Contains("C1", text);
        Assert.Contains("B2", text);
        Assert.Contains("A2", text);
        Assert.Contains("A1", text);
        Assert.Contains("–", text); // missing levels shown as a dash
    }

    [Fact]
    public void Only_native_languages_means_no_level_table()
    {
        var cv = Empty() with { Languages = [new("Bulgarian", true, CefrLevel.C2, null, null, null, null)] };

        var text = Text(EuropassStyleCvRenderer.Render(cv));

        Assert.Contains("Mother tongue(s):", text);
        Assert.DoesNotContain("UNDERSTANDING", text);
        Assert.DoesNotContain("Other language(s)", text);
        Assert.DoesNotContain("C2", text); // a native language carries no level, even if stray data existed
    }

    [Fact]
    public void Empty_profile_gives_a_valid_pdf_without_blank_headings()
    {
        var text = Text(EuropassStyleCvRenderer.Render(Empty()));

        Assert.Contains("Ana", text);
        Assert.DoesNotContain("WORK EXPERIENCE", text);
        Assert.DoesNotContain("LANGUAGE SKILLS", text);
        Assert.DoesNotContain("CERTIFICATIONS", text);
        Assert.DoesNotContain("PROJECTS", text);
        Assert.Contains("not an official Europass document", text); // footer is always there
    }

    [Fact]
    public void Cyrillic_text_is_rendered()
    {
        var cv = Empty() with
        {
            Name = "Станимир Райков",
            Headline = "Софтуерен инженер",
            Languages = [new("Български", true, null, null, null, null, null), new("Немски", false, CefrLevel.B1, CefrLevel.B1, CefrLevel.A2, CefrLevel.A2, CefrLevel.A2)],
        };

        var text = Text(EuropassStyleCvRenderer.Render(cv));

        Assert.Contains("Станимир", text);
        Assert.Contains("Софтуерен", text);
        Assert.Contains("Български", text);
        Assert.Contains("Немски", text);
    }

    [Fact]
    public void Long_content_wraps_onto_more_pages()
    {
        var many = Enumerable.Range(0, 40)
            .Select(i => new CvExperience($"Role {i}", $"Company {i}", new(2000 + i % 20, 1, 1), null, new string('x', 400))).ToList();

        using var doc = PdfDocument.Open(EuropassStyleCvRenderer.Render(Empty() with { Experience = many }));

        Assert.True(doc.NumberOfPages > 1);
    }

    [Fact]
    public async Task End_to_end_pdf_contains_only_confirmed_data_of_visible_projects_and_my_own_languages()
    {
        using var t = new TestDb();
        t.SeedSkills();
        var me = t.AddUser("ana");
        var other = t.AddUser("bob");
        var shown = t.AddProjectFor(me, "shown-project");
        var pending = t.AddProjectFor(me, "pending-project", ProjectStatus.Pending);
        var hidden = t.AddProjectFor(me, "hidden-project", ProjectStatus.Hidden);
        t.Link(shown, "TypeScript", LinkStatus.Confirmed);
        t.Link(shown, "Kotlin", LinkStatus.Suggested);
        t.Link(shown, "Scala", LinkStatus.Rejected);
        t.Link(pending, "Swift", LinkStatus.Confirmed);
        t.Link(hidden, "Ruby", LinkStatus.Confirmed);
        var career = new CareerService(t.Db);
        await career.CreateLanguageAsync(me.Id, new("English", "en", false, CefrLevel.B2, CefrLevel.B2, CefrLevel.B2, CefrLevel.B2, CefrLevel.B2));
        await career.CreateLanguageAsync(other.Id, new("Klingon", null, false, CefrLevel.C2, CefrLevel.C2, CefrLevel.C2, CefrLevel.C2, CefrLevel.C2));

        var model = await new CvDataService(t.Db).BuildAsync(me.Id);
        var text = Text(EuropassStyleCvRenderer.Render(model!));

        Assert.Contains("TypeScript", text);
        Assert.Contains("shown-project", text);
        Assert.Contains("English", text);
        Assert.DoesNotContain("Kotlin", text);
        Assert.DoesNotContain("Scala", text);
        Assert.DoesNotContain("Swift", text);
        Assert.DoesNotContain("Ruby", text);
        Assert.DoesNotContain("pending-project", text);
        Assert.DoesNotContain("hidden-project", text);
        Assert.DoesNotContain("Klingon", text);
    }
}

public class CvTemplateEndpointTests
{
    private static CvController Controller(TestDb t, User user)
    {
        var c = new CvController(new CvDataService(t.Db), t.Db)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext
                {
                    User = new ClaimsPrincipal(new ClaimsIdentity([new Claim("devsheet:uid", user.Id.ToString())], "test")),
                },
            },
        };
        return c;
    }

    [Fact]
    public async Task Europass_template_returns_a_pdf_with_a_clear_file_name()
    {
        using var t = new TestDb();
        var result = await Controller(t, t.AddUser("ana")).Download("europass");

        var file = Assert.IsType<FileContentResult>(result);
        Assert.Equal("application/pdf", file.ContentType);
        Assert.Equal("ana-cv-europass-style.pdf", file.FileDownloadName);
        Assert.Equal("%PDF", Encoding.ASCII.GetString(file.FileContents, 0, 4));
    }

    [Fact]
    public async Task Modern_is_the_default_template_and_names_are_case_insensitive()
    {
        using var t = new TestDb();
        var c = Controller(t, t.AddUser("ana"));

        Assert.Equal("ana-cv.pdf", Assert.IsType<FileContentResult>(await c.Download()).FileDownloadName);
        Assert.Equal("ana-cv-europass-style.pdf", Assert.IsType<FileContentResult>(await c.Download("EUROPASS")).FileDownloadName);
    }

    [Fact]
    public async Task The_two_templates_produce_different_documents()
    {
        using var t = new TestDb();
        var c = Controller(t, t.AddUser("ana"));

        var modern = Assert.IsType<FileContentResult>(await c.Download("modern")).FileContents;
        var europass = Assert.IsType<FileContentResult>(await c.Download("europass")).FileContents;

        Assert.False(modern.SequenceEqual(europass));
    }

    [Fact]
    public async Task Unknown_template_is_a_bad_request()
    {
        using var t = new TestDb();
        Assert.IsType<BadRequestObjectResult>(await Controller(t, t.AddUser("ana")).Download("fancy"));
    }

    [Fact]
    public async Task Missing_user_is_not_found()
    {
        using var t = new TestDb();
        var ghost = new User { Id = Guid.NewGuid() };
        Assert.IsType<NotFoundResult>(await Controller(t, ghost).Download("europass"));
    }
}
