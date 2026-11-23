using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using DevSheet.Api;
using DevSheet.Domain.Entities;
using DevSheet.Infrastructure.Skills;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;

namespace DevSheet.Tests;

public class SkillLinksApiTests(WebApplicationFactory<Program> factory) : IClassFixture<WebApplicationFactory<Program>>, IDisposable
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

    private async Task<Guid> NewProject(User owner, string name, ProjectStatus status = ProjectStatus.Visible)
    {
        using var db = _api.Db();
        var repo = new GithubRepo { UserId = owner.Id, GithubRepoId = Random.Shared.NextInt64(), Name = name, HtmlUrl = "https://github.com/x/" + name };
        var project = new Project { UserId = owner.Id, GithubRepoId = repo.Id, Status = status };
        db.GithubRepos.Add(repo);
        db.Projects.Add(project);
        await db.SaveChangesAsync();
        return project.Id;
    }

    /// <summary>The skill with this name (the seeder may have added it already), linked to the project.</summary>
    private async Task<Guid> Link(Guid projectId, string skill, LinkStatus status)
    {
        using var db = _api.Db();
        var s = await db.Skills.FirstOrDefaultAsync(x => x.Name == skill);
        if (s is null) db.Skills.Add(s = new Skill { Name = skill });
        db.ProjectSkills.Add(new ProjectSkill { ProjectId = projectId, SkillId = s.Id, Status = status });
        await db.SaveChangesAsync();
        return s.Id;
    }

    private async Task<LinkStatus> StatusOf(Guid projectId, Guid skillId)
    {
        using var db = _api.Db();
        return (await db.ProjectSkills.SingleAsync(l => l.ProjectId == projectId && l.SkillId == skillId)).Status;
    }

    private static async Task<JsonElement> Json(HttpResponseMessage r) => JsonDocument.Parse(await r.Content.ReadAsStringAsync()).RootElement;

    [Fact]
    public async Task The_list_groups_my_links_by_skill_with_category_and_project_status()
    {
        var ana = await NewUser("sk-list");
        var api = await NewProject(ana, "api-gateway");
        var draft = await NewProject(ana, "draft-tool", ProjectStatus.Pending);
        await Link(api, "C#", LinkStatus.Confirmed);
        await Link(draft, "C#", LinkStatus.Suggested);
        await Link(draft, "Zig-sk-list", LinkStatus.Rejected);

        var list = await Json(await _api.Client(ana.Id).GetAsync("/api/me/skill-links"));

        Assert.Equal(2, list.GetArrayLength());
        var csharp = list[0];
        Assert.Equal("C#", csharp.GetProperty("name").GetString());
        Assert.Equal("Languages", csharp.GetProperty("category").GetString());
        var projects = csharp.GetProperty("projects");
        Assert.Equal("api-gateway", projects[0].GetProperty("projectTitle").GetString());
        Assert.Equal(1, projects[0].GetProperty("status").GetInt32());
        Assert.Equal("draft-tool", projects[1].GetProperty("projectTitle").GetString());
        Assert.Equal(0, projects[1].GetProperty("projectStatus").GetInt32());
        Assert.Equal("Other", list[1].GetProperty("category").GetString());
    }

    [Fact]
    public async Task The_list_contains_only_my_projects()
    {
        var ana = await NewUser("sk-mine");
        var bob = await NewUser("sk-theirs");
        await Link(await NewProject(ana, "ana-repo"), "Go", LinkStatus.Suggested);
        await Link(await NewProject(bob, "bob-repo"), "Go", LinkStatus.Confirmed);
        await Link(await NewProject(bob, "bob-other"), "Elixir-sk", LinkStatus.Confirmed);

        var body = await _api.Client(ana.Id).GetStringAsync("/api/me/skill-links");

        Assert.Contains("ana-repo", body);
        Assert.DoesNotContain("bob-repo", body);
        Assert.DoesNotContain("Elixir-sk", body);
    }

    [Fact]
    public async Task Bulk_sets_the_links_and_can_put_them_back_to_suggested()
    {
        var ana = await NewUser("sk-bulk");
        var a = await NewProject(ana, "a");
        var b = await NewProject(ana, "b");
        var go = await Link(a, "Go", LinkStatus.Suggested);
        await Link(b, "Go", LinkStatus.Suggested);
        var other = await Link(b, "Rust", LinkStatus.Suggested);
        var client = _api.Client(ana.Id);
        var links = new[] { new SkillLinkKey(a, go), new SkillLinkKey(b, go) };

        var confirm = await client.PatchAsJsonAsync("/api/me/skill-links", new { links, status = 1 });
        Assert.Equal(HttpStatusCode.OK, confirm.StatusCode);
        Assert.Equal(2, (await Json(confirm)).GetProperty("updated").GetInt32());
        Assert.Equal(LinkStatus.Confirmed, await StatusOf(a, go));
        Assert.Equal(LinkStatus.Confirmed, await StatusOf(b, go));
        Assert.Equal(LinkStatus.Suggested, await StatusOf(b, other));

        var undo = await client.PatchAsJsonAsync("/api/me/skill-links", new { links, status = 0 });
        Assert.Equal(HttpStatusCode.OK, undo.StatusCode);
        Assert.Equal(LinkStatus.Suggested, await StatusOf(a, go));
    }

    [Fact]
    public async Task Bulk_with_someone_elses_link_changes_nothing()
    {
        var ana = await NewUser("sk-own");
        var bob = await NewUser("sk-other");
        var mine = await NewProject(ana, "mine");
        var theirs = await NewProject(bob, "theirs");
        var go = await Link(mine, "Go", LinkStatus.Suggested);
        await Link(theirs, "Go", LinkStatus.Suggested);

        var r = await _api.Client(ana.Id).PatchAsJsonAsync("/api/me/skill-links",
            new { links = new[] { new SkillLinkKey(mine, go), new SkillLinkKey(theirs, go) }, status = 2 });

        Assert.Equal(HttpStatusCode.NotFound, r.StatusCode);
        Assert.Equal(LinkStatus.Suggested, await StatusOf(mine, go));
        Assert.Equal(LinkStatus.Suggested, await StatusOf(theirs, go));
    }

    [Fact]
    public async Task Bulk_with_a_link_that_does_not_exist_changes_nothing()
    {
        var ana = await NewUser("sk-missing");
        var p = await NewProject(ana, "p");
        var go = await Link(p, "Go", LinkStatus.Suggested);

        var r = await _api.Client(ana.Id).PatchAsJsonAsync("/api/me/skill-links",
            new { links = new[] { new SkillLinkKey(p, go), new SkillLinkKey(p, Guid.NewGuid()) }, status = 1 });

        Assert.Equal(HttpStatusCode.NotFound, r.StatusCode);
        Assert.Equal(LinkStatus.Suggested, await StatusOf(p, go));
    }

    [Fact]
    public async Task Bulk_rejects_a_bad_status_or_count()
    {
        var ana = await NewUser("sk-bad");
        var p = await NewProject(ana, "p");
        var go = await Link(p, "Go", LinkStatus.Suggested);
        var client = _api.Client(ana.Id);

        var badStatus = await client.PatchAsJsonAsync("/api/me/skill-links", new { links = new[] { new SkillLinkKey(p, go) }, status = 5 });
        var none = await client.PatchAsJsonAsync("/api/me/skill-links", new { links = Array.Empty<SkillLinkKey>(), status = 1 });
        var tooMany = await client.PatchAsJsonAsync("/api/me/skill-links", new
        {
            links = Enumerable.Range(0, ProjectSkillService.BulkMax + 1).Select(_ => new SkillLinkKey(p, Guid.NewGuid())), status = 1,
        });

        Assert.Equal(HttpStatusCode.BadRequest, badStatus.StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, none.StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, tooMany.StatusCode);
        Assert.Equal(LinkStatus.Suggested, await StatusOf(p, go));
    }

    [Fact]
    public async Task Both_need_a_signed_in_user()
    {
        var client = _api.Client();
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/me/skill-links")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized,
            (await client.PatchAsJsonAsync("/api/me/skill-links", new { links = new[] { new SkillLinkKey(Guid.NewGuid(), Guid.NewGuid()) }, status = 1 })).StatusCode);
    }

    public void Dispose() => _api.Dispose();
}
