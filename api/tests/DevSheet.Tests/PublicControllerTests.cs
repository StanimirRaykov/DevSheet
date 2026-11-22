using DevSheet.Api.Controllers;
using DevSheet.Domain.Entities;
using Microsoft.AspNetCore.Mvc;
using DevSheet.Infrastructure.Cv;

namespace DevSheet.Tests;

public class PublicControllerTests
{
    private static void AddProject(TestDb t, User u, string name, ProjectStatus status)
    {
        var repo = new GithubRepo { UserId = u.Id, GithubRepoId = Random.Shared.NextInt64(), Name = name, HtmlUrl = "https://x/" + name };
        t.Db.GithubRepos.Add(repo);
        t.Db.Projects.Add(new Project { UserId = u.Id, GithubRepoId = repo.Id, Status = status });
        t.Db.SaveChanges();
    }

    [Fact]
    public async Task Unpublished_user_returns_404()
    {
        using var t = new TestDb();
        var u = t.AddUser("bob", published: false);
        AddProject(t, u, "secret", ProjectStatus.Visible);

        var result = await new PublicController(t.Db, new CvDataService(t.Db)).Get("bob");

        Assert.IsType<NotFoundResult>(result);
    }

    [Fact]
    public async Task Only_Visible_projects_are_exposed()
    {
        using var t = new TestDb();
        var u = t.AddUser("carol", published: true);
        AddProject(t, u, "shown", ProjectStatus.Visible);
        AddProject(t, u, "pending", ProjectStatus.Pending);
        AddProject(t, u, "hidden", ProjectStatus.Hidden);

        var result = await new PublicController(t.Db, new CvDataService(t.Db)).Get("carol");

        var ok = Assert.IsType<OkObjectResult>(result);
        var json = System.Text.Json.JsonSerializer.Serialize(ok.Value);
        Assert.Contains("shown", json);
        Assert.DoesNotContain("pending", json);
        Assert.DoesNotContain("hidden", json);
    }

    [Fact]
    public async Task Slug_lookup_is_case_insensitive()
    {
        using var t = new TestDb();
        t.AddUser("dave", published: true);

        var result = await new PublicController(t.Db, new CvDataService(t.Db)).Get("DAVE");

        Assert.IsType<OkObjectResult>(result);
    }
}
