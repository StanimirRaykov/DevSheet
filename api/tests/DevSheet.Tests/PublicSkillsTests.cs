using System.Text.Json;
using DevSheet.Api.Controllers;
using DevSheet.Domain.Entities;
using Microsoft.AspNetCore.Mvc;

namespace DevSheet.Tests;

public class PublicSkillsTests
{
    private static JsonElement Get(TestDb t, string slug)
    {
        var result = new PublicController(t.Db).Get(slug).GetAwaiter().GetResult();
        var ok = Assert.IsType<OkObjectResult>(result);
        // Same naming policy as ASP.NET's JSON defaults (camelCase) so tests see what clients see.
        return JsonSerializer.SerializeToElement(ok.Value, new JsonSerializerOptions(JsonSerializerDefaults.Web));
    }

    [Fact]
    public void Public_page_exposes_only_Confirmed_skills()
    {
        using var t = new TestDb();
        t.SeedSkills();
        var u = t.AddUser("erin", published: true);
        var p = t.AddProjectFor(u, "shown");
        t.Link(p, "C#", LinkStatus.Confirmed);
        t.Link(p, "Python", LinkStatus.Suggested);
        t.Link(p, "Docker", LinkStatus.Rejected);

        var json = Get(t, "erin").GetRawText();

        Assert.Contains("C#", json);
        Assert.DoesNotContain("Python", json);
        Assert.DoesNotContain("Docker", json);
    }

    [Fact]
    public void Matrix_lists_every_visible_project_using_a_skill()
    {
        using var t = new TestDb();
        t.SeedSkills();
        var u = t.AddUser("frank", published: true);
        var a = t.AddProjectFor(u, "alpha");
        var b = t.AddProjectFor(u, "beta");
        t.Link(a, "C#", LinkStatus.Confirmed);
        t.Link(b, "C#", LinkStatus.Confirmed);
        t.Link(a, "Docker", LinkStatus.Confirmed);

        var skills = Get(t, "frank").GetProperty("skills");

        var first = skills[0];
        Assert.Equal("C#", first.GetProperty("name").GetString());
        Assert.Equal(["alpha", "beta"], first.GetProperty("projects").EnumerateArray().Select(x => x.GetString()!).OrderBy(x => x));
        Assert.Equal("Docker", skills[1].GetProperty("name").GetString());
    }

    [Fact]
    public void Skills_of_pending_and_hidden_projects_stay_out_of_the_matrix()
    {
        using var t = new TestDb();
        t.SeedSkills();
        var u = t.AddUser("gina", published: true);
        var shown = t.AddProjectFor(u, "shown");
        var pending = t.AddProjectFor(u, "pending", ProjectStatus.Pending);
        var hidden = t.AddProjectFor(u, "hidden", ProjectStatus.Hidden);
        t.Link(shown, "C#", LinkStatus.Confirmed);
        t.Link(pending, "Rust", LinkStatus.Confirmed);
        t.Link(hidden, "Go", LinkStatus.Confirmed);

        var json = Get(t, "gina").GetRawText();

        Assert.Contains("C#", json);
        Assert.DoesNotContain("Rust", json);
        Assert.DoesNotContain("\"Go\"", json);
    }

    [Fact]
    public void Visible_project_without_confirmed_skills_gives_empty_matrix()
    {
        using var t = new TestDb();
        t.SeedSkills();
        var u = t.AddUser("hank", published: true);
        var p = t.AddProjectFor(u, "repo");
        t.Link(p, "C#", LinkStatus.Suggested);

        Assert.Equal(0, Get(t, "hank").GetProperty("skills").GetArrayLength());
    }
}
