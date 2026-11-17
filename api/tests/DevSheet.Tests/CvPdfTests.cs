using System.Text;
using DevSheet.Application.Cv;
using DevSheet.Domain.Entities;
using DevSheet.Infrastructure.Career;
using DevSheet.Infrastructure.Cv;
using UglyToad.PdfPig;

namespace DevSheet.Tests;

public class CvPdfTests
{
    private static string Text(byte[] pdf)
    {
        using var doc = PdfDocument.Open(pdf);
        return string.Join("\n", doc.GetPages().Select(p => p.Text));
    }

    private static CvModel Empty() => new("Ana", "", "", "", "", "github.com/ana", [], [], [], []);

    [Fact]
    public void Output_is_a_real_pdf()
    {
        var bytes = ModernCvRenderer.Render(Empty());

        Assert.Equal("%PDF", Encoding.ASCII.GetString(bytes, 0, 4));
        Assert.True(bytes.Length > 1000);
    }

    [Fact]
    public void Empty_profile_still_produces_a_valid_pdf_without_blank_headings()
    {
        var text = Text(ModernCvRenderer.Render(Empty()));

        Assert.Contains("Ana", text);
        Assert.DoesNotContain("EXPERIENCE", text);
        Assert.DoesNotContain("SKILLS", text);
        Assert.DoesNotContain("PROJECTS", text);
        Assert.DoesNotContain("EDUCATION", text);
    }

    [Fact]
    public void Cyrillic_text_is_rendered()
    {
        var cv = Empty() with
        {
            Name = "Станимир Райков",
            Headline = "Софтуерен инженер",
            Experience = [new("Разработчик", "Фирма ЕООД", new(2024, 3, 1), null, "Разработка на API")],
        };

        var text = Text(ModernCvRenderer.Render(cv));

        Assert.Contains("Станимир", text);
        Assert.Contains("Софтуерен", text);
        Assert.Contains("Фирма", text);
    }

    [Fact]
    public async Task End_to_end_pdf_contains_only_confirmed_data_of_visible_projects()
    {
        using var t = new TestDb();
        t.SeedSkills();
        var u = t.AddUser("ana");
        var shown = t.AddProjectFor(u, "shown-project");
        var pending = t.AddProjectFor(u, "pending-project", ProjectStatus.Pending);
        var hidden = t.AddProjectFor(u, "hidden-project", ProjectStatus.Hidden);
        t.Link(shown, "TypeScript", LinkStatus.Confirmed);
        t.Link(shown, "Kotlin", LinkStatus.Suggested);
        t.Link(shown, "Scala", LinkStatus.Rejected);
        t.Link(pending, "Swift", LinkStatus.Confirmed);
        t.Link(hidden, "Ruby", LinkStatus.Confirmed);
        await new CareerService(t.Db).CreateExperienceAsync(u.Id, new("Acme Corp", "Engineer", new(2023, 1, 1), null, "Built things"));

        var model = await new CvDataService(t.Db).BuildAsync(u.Id);
        var text = Text(ModernCvRenderer.Render(model!));

        Assert.Contains("TypeScript", text);
        Assert.Contains("shown-project", text);
        Assert.Contains("Acme Corp", text);
        Assert.DoesNotContain("Kotlin", text);
        Assert.DoesNotContain("Scala", text);
        Assert.DoesNotContain("Swift", text);
        Assert.DoesNotContain("Ruby", text);
        Assert.DoesNotContain("pending-project", text);
        Assert.DoesNotContain("hidden-project", text);
    }

    [Fact]
    public void Long_content_wraps_onto_more_pages_instead_of_failing()
    {
        var many = Enumerable.Range(0, 40)
            .Select(i => new CvExperience($"Role {i}", $"Company {i}", new(2000 + i % 20, 1, 1), null, new string('x', 400)))
            .ToList();

        using var doc = PdfDocument.Open(ModernCvRenderer.Render(Empty() with { Experience = many }));

        Assert.True(doc.NumberOfPages > 1);
    }
}

public class CvFormatTests
{
    [Fact]
    public void Range_formats_months_and_open_end()
    {
        Assert.Equal("Jan 2023 – Present", CvFormat.Range(new(2023, 1, 5), null));
        Assert.Equal("Sep 2020 – Jun 2024", CvFormat.Range(new(2020, 9, 1), new(2024, 6, 30)));
        Assert.Equal("", CvFormat.Range(null, null));
        Assert.Equal("Jun 2024", CvFormat.Range(null, new(2024, 6, 1)));
    }
}
