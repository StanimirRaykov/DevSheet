using System.Net;
using System.Text.Json;
using DevSheet.Api;
using DevSheet.Domain.Entities;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;

namespace DevSheet.Tests;

public class SummaryApiTests(WebApplicationFactory<Program> factory) : IClassFixture<WebApplicationFactory<Program>>, IDisposable
{
    private readonly ApiHost _api = new(factory);

    private async Task<User> NewUser(string slug, bool published = false)
    {
        using var db = _api.Db();
        var user = new User { DisplayName = slug, Slug = slug, IsPublished = published };
        db.Users.Add(user);
        await db.SaveChangesAsync();
        return user;
    }

    private async Task<Guid> NewProject(User owner, ProjectStatus status)
    {
        using var db = _api.Db();
        var name = "repo-" + Guid.NewGuid().ToString("N")[..8];
        var repo = new GithubRepo { UserId = owner.Id, GithubRepoId = Random.Shared.NextInt64(), Name = name, HtmlUrl = "https://github.com/x/" + name };
        var project = new Project { UserId = owner.Id, GithubRepoId = repo.Id, Status = status };
        db.GithubRepos.Add(repo);
        db.Projects.Add(project);
        await db.SaveChangesAsync();
        return project.Id;
    }

    private async Task Link(Guid projectId, string skill, LinkStatus status)
    {
        using var db = _api.Db();
        var s = await db.Skills.FirstOrDefaultAsync(x => x.Name == skill);
        if (s is null) db.Skills.Add(s = new Skill { Name = skill });
        db.ProjectSkills.Add(new ProjectSkill { ProjectId = projectId, SkillId = s.Id, Status = status });
        await db.SaveChangesAsync();
    }

    private async Task<JsonElement> Summary(User user)
    {
        var r = await _api.Client(user.Id).GetAsync("/api/me/summary");
        Assert.Equal(HttpStatusCode.OK, r.StatusCode);
        return JsonDocument.Parse(await r.Content.ReadAsStringAsync()).RootElement;
    }

    [Fact]
    public async Task A_new_account_has_nothing()
    {
        var s = await Summary(await NewUser("sum-empty"));

        Assert.False(s.GetProperty("isPublished").GetBoolean());
        Assert.False(s.GetProperty("hasHeadline").GetBoolean());
        Assert.False(s.GetProperty("hasSummary").GetBoolean());
        Assert.Equal(0, s.GetProperty("experience").GetInt32());
        Assert.Equal(0, s.GetProperty("projects").GetProperty("pending").GetInt32());
        Assert.Equal(0, s.GetProperty("confirmedSkills").GetInt32());
        Assert.Equal(JsonValueKind.Null, s.GetProperty("github").ValueKind);
    }

    [Fact]
    public async Task Counts_my_profile_career_projects_and_skills()
    {
        var ana = await NewUser("sum-ana", published: true);
        using (var db = _api.Db())
        {
            db.Profiles.Add(new Profile { UserId = ana.Id, Headline = "Backend developer", Summary = " " });
            db.WorkExperiences.Add(new WorkExperience { UserId = ana.Id, Company = "Acme", Title = "Dev", StartDate = new DateOnly(2021, 4, 1) });
            db.Languages.Add(new Language { UserId = ana.Id, Name = "Bulgarian", IsMotherTongue = true });
            db.Languages.Add(new Language { UserId = ana.Id, Name = "English" });
            db.GithubConnections.Add(new GithubConnection { UserId = ana.Id, GithubId = Random.Shared.NextInt64(), Login = "ana-dev", LastSyncedAt = new DateTime(2026, 11, 20, 8, 0, 0, DateTimeKind.Utc) });
            await db.SaveChangesAsync();
        }
        var visible = await NewProject(ana, ProjectStatus.Visible);
        var other = await NewProject(ana, ProjectStatus.Visible);
        var hidden = await NewProject(ana, ProjectStatus.Hidden);
        var pending = await NewProject(ana, ProjectStatus.Pending);
        await NewProject(ana, ProjectStatus.Pending);
        await Link(visible, "C#", LinkStatus.Confirmed);
        await Link(other, "C#", LinkStatus.Confirmed);          // the same skill twice: counted once
        await Link(visible, "Docker", LinkStatus.Confirmed);
        await Link(hidden, "Rust-sum", LinkStatus.Confirmed);   // not on the page: not counted
        await Link(pending, "Go", LinkStatus.Suggested);
        await Link(other, "Go", LinkStatus.Suggested);          // one suggested skill
        await Link(pending, "Zig-sum", LinkStatus.Rejected);

        var s = await Summary(ana);

        Assert.True(s.GetProperty("isPublished").GetBoolean());
        Assert.Equal("sum-ana", s.GetProperty("slug").GetString());
        Assert.True(s.GetProperty("hasHeadline").GetBoolean());
        Assert.False(s.GetProperty("hasSummary").GetBoolean()); // blank does not count
        Assert.Equal(1, s.GetProperty("experience").GetInt32());
        Assert.Equal(0, s.GetProperty("education").GetInt32());
        Assert.Equal(2, s.GetProperty("languages").GetInt32());
        var projects = s.GetProperty("projects");
        Assert.Equal(2, projects.GetProperty("pending").GetInt32());
        Assert.Equal(2, projects.GetProperty("visible").GetInt32());
        Assert.Equal(1, projects.GetProperty("hidden").GetInt32());
        Assert.Equal(2, s.GetProperty("confirmedSkills").GetInt32());
        Assert.Equal(1, s.GetProperty("suggestedSkills").GetInt32());
        Assert.Equal("ana-dev", s.GetProperty("github").GetProperty("login").GetString());
        Assert.StartsWith("2026-11-20T08:00:00", s.GetProperty("github").GetProperty("lastSyncedAt").GetString());
    }

    [Fact]
    public async Task Counts_only_my_own_data()
    {
        var ana = await NewUser("sum-mine");
        var bob = await NewUser("sum-bob");
        var bobs = await NewProject(bob, ProjectStatus.Visible);
        await NewProject(bob, ProjectStatus.Pending);
        await Link(bobs, "C#", LinkStatus.Confirmed);
        using (var db = _api.Db())
        {
            db.WorkExperiences.Add(new WorkExperience { UserId = bob.Id, Company = "Bob Ltd", Title = "Dev", StartDate = new DateOnly(2020, 1, 1) });
            await db.SaveChangesAsync();
        }

        var s = await Summary(ana);

        Assert.Equal(0, s.GetProperty("experience").GetInt32());
        Assert.Equal(0, s.GetProperty("projects").GetProperty("visible").GetInt32());
        Assert.Equal(0, s.GetProperty("projects").GetProperty("pending").GetInt32());
        Assert.Equal(0, s.GetProperty("confirmedSkills").GetInt32());
    }

    [Fact]
    public async Task Anonymous_gets_401()
    {
        var r = await _api.Client().GetAsync("/api/me/summary");
        Assert.Equal(HttpStatusCode.Unauthorized, r.StatusCode);
    }

    public void Dispose() => _api.Dispose();
}
