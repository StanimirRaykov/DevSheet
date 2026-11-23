using System.Net;
using System.Net.Http.Json;
using DevSheet.Api;
using DevSheet.Api.Controllers;
using DevSheet.Domain.Entities;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;

namespace DevSheet.Tests;

public class ProjectStatusApiTests(WebApplicationFactory<Program> factory) : IClassFixture<WebApplicationFactory<Program>>, IDisposable
{
    private readonly ApiHost _api = new(factory);

    private async Task<User> NewUser(string slug)
    {
        using var db = _api.Db();
        var user = new User { DisplayName = slug, Slug = slug };
        db.Users.Add(user);
        await db.SaveChangesAsync();
        return user;
    }

    private async Task<Guid> NewProject(User owner, string name, ProjectStatus status = ProjectStatus.Pending)
    {
        using var db = _api.Db();
        var repo = new GithubRepo { UserId = owner.Id, GithubRepoId = Random.Shared.NextInt64(), Name = name, HtmlUrl = "https://github.com/x/" + name };
        var project = new Project { UserId = owner.Id, GithubRepoId = repo.Id, Status = status };
        db.GithubRepos.Add(repo);
        db.Projects.Add(project);
        await db.SaveChangesAsync();
        return project.Id;
    }

    private async Task<ProjectStatus> StatusOf(Guid id)
    {
        using var db = _api.Db();
        return (await db.Projects.SingleAsync(p => p.Id == id)).Status;
    }

    [Fact]
    public async Task Bulk_sets_the_status_of_all_the_given_projects()
    {
        var ana = await NewUser("bulk-ana");
        var a = await NewProject(ana, "a");
        var b = await NewProject(ana, "b");
        var untouched = await NewProject(ana, "c");

        var response = await _api.Client(ana.Id).PatchAsJsonAsync("/api/me/projects/status", new { ids = new[] { a, b, a }, status = 1 });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(2, (await response.Content.ReadFromJsonAsync<Dictionary<string, int>>())!["updated"]);
        Assert.Equal(ProjectStatus.Visible, await StatusOf(a));
        Assert.Equal(ProjectStatus.Visible, await StatusOf(b));
        Assert.Equal(ProjectStatus.Pending, await StatusOf(untouched));
    }

    [Fact]
    public async Task Bulk_with_someone_elses_project_changes_nothing()
    {
        var ana = await NewUser("bulk-own");
        var bob = await NewUser("bulk-other");
        var mine = await NewProject(ana, "mine");
        var theirs = await NewProject(bob, "theirs");

        var response = await _api.Client(ana.Id).PatchAsJsonAsync("/api/me/projects/status", new { ids = new[] { mine, theirs }, status = 2 });

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Equal(ProjectStatus.Pending, await StatusOf(mine));
        Assert.Equal(ProjectStatus.Pending, await StatusOf(theirs));
    }

    [Fact]
    public async Task Bulk_with_an_unknown_id_changes_nothing()
    {
        var ana = await NewUser("bulk-unknown");
        var mine = await NewProject(ana, "mine");

        var response = await _api.Client(ana.Id).PatchAsJsonAsync("/api/me/projects/status", new { ids = new[] { mine, Guid.NewGuid() }, status = 1 });

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Equal(ProjectStatus.Pending, await StatusOf(mine));
    }

    [Theory]
    [InlineData(3)]
    [InlineData(-1)]
    public async Task Bulk_rejects_an_unknown_status(int status)
    {
        var ana = await NewUser($"bulk-bad{status}");
        var mine = await NewProject(ana, "mine");

        var response = await _api.Client(ana.Id).PatchAsJsonAsync("/api/me/projects/status", new { ids = new[] { mine }, status });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal(ProjectStatus.Pending, await StatusOf(mine));
    }

    [Fact]
    public async Task Bulk_needs_at_least_one_id_and_not_too_many()
    {
        var ana = await NewUser("bulk-count");
        var client = _api.Client(ana.Id);

        var none = await client.PatchAsJsonAsync("/api/me/projects/status", new { ids = Array.Empty<Guid>(), status = 1 });
        var tooMany = await client.PatchAsJsonAsync("/api/me/projects/status",
            new { ids = Enumerable.Range(0, MeController.BulkMax + 1).Select(_ => Guid.NewGuid()), status = 1 });

        Assert.Equal(HttpStatusCode.BadRequest, none.StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, tooMany.StatusCode);
    }

    [Fact]
    public async Task Bulk_needs_a_signed_in_user()
    {
        var response = await _api.Client().PatchAsJsonAsync("/api/me/projects/status", new { ids = new[] { Guid.NewGuid() }, status = 1 });
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Single_rejects_an_unknown_status()
    {
        var ana = await NewUser("single-bad");
        var mine = await NewProject(ana, "mine");

        var response = await _api.Client(ana.Id).PatchAsJsonAsync($"/api/me/projects/{mine}/status", new { status = 7 });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal(ProjectStatus.Pending, await StatusOf(mine));
    }

    [Fact]
    public async Task Bulk_hidden_and_pending_projects_stay_off_the_public_page()
    {
        var ana = await NewUser("bulk-public");
        using (var db = _api.Db())
        {
            (await db.Users.SingleAsync(u => u.Id == ana.Id)).IsPublished = true;
            await db.SaveChangesAsync();
        }
        var shown = await NewProject(ana, "shown-repo");
        var hidden = await NewProject(ana, "hidden-repo");
        await NewProject(ana, "pending-repo");
        var client = _api.Client(ana.Id);
        await client.PatchAsJsonAsync("/api/me/projects/status", new { ids = new[] { shown, hidden }, status = 1 });
        await client.PatchAsJsonAsync("/api/me/projects/status", new { ids = new[] { hidden }, status = 2 });

        var page = await _api.Client().GetStringAsync("/api/public/bulk-public");

        Assert.Contains("shown-repo", page);
        Assert.DoesNotContain("hidden-repo", page);
        Assert.DoesNotContain("pending-repo", page);
    }

    [Fact]
    public async Task The_project_list_includes_when_the_repo_was_last_pushed()
    {
        var ana = await NewUser("list-pushed");
        var id = await NewProject(ana, "dated");
        using (var db = _api.Db())
        {
            var repo = await db.GithubRepos.SingleAsync(r => r.UserId == ana.Id);
            repo.PushedAt = new DateTime(2026, 3, 4, 5, 6, 7, DateTimeKind.Utc);
            await db.SaveChangesAsync();
        }

        var body = await _api.Client(ana.Id).GetStringAsync("/api/me/projects");

        Assert.Contains("\"pushedAt\":\"2026-03-04T05:06:07", body);
        Assert.Contains(id.ToString(), body);
    }

    public void Dispose() => _api.Dispose();
}
