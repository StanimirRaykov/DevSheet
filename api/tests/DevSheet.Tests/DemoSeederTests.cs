using System.Net.Http.Json;
using System.Text.Json;
using DevSheet.Domain;
using DevSheet.Domain.Entities;
using DevSheet.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;

namespace DevSheet.Tests;

public class DemoSeederTests : IDisposable
{
    private readonly TestDb _t = new();

    public DemoSeederTests() => _t.SeedSkills();

    [Fact]
    public async Task Seeds_a_published_account_nobody_can_sign_in_to()
    {
        await DemoSeeder.SeedAsync(_t.Db);

        var demo = await _t.Db.Users.Include(u => u.Logins).Include(u => u.GithubConnection).SingleAsync();
        Assert.Equal(("demo", "Ana Petrova", true), (demo.Slug, demo.DisplayName, demo.IsPublished));
        Assert.Empty(demo.Logins);
        Assert.Null(demo.GithubConnection);
        Assert.True(ReservedSlugs.IsReserved(DemoSeeder.Slug)); // no real account can take the address
    }

    [Fact]
    public async Task Projects_are_visible_with_confirmed_skills_and_fictional_links()
    {
        await DemoSeeder.SeedAsync(_t.Db);

        var projects = await _t.Db.Projects.Include(p => p.GithubRepo).Include(p => p.Skills).ThenInclude(s => s.Skill).ToListAsync();
        Assert.Equal(3, projects.Count);
        Assert.All(projects, p => Assert.Equal(ProjectStatus.Visible, p.Status));
        Assert.All(projects, p => Assert.StartsWith("https://example.com/", p.GithubRepo!.HtmlUrl));
        Assert.Equal(
            ["C#", "PostgreSQL", "Python", "React", "TypeScript"],
            projects.SelectMany(p => p.Skills).Where(s => s.Status == LinkStatus.Confirmed).Select(s => s.Skill!.Name).Order());
    }

    [Fact]
    public async Task Running_again_changes_nothing()
    {
        await DemoSeeder.SeedAsync(_t.Db);
        var profile = await _t.Db.Profiles.SingleAsync();
        profile.Headline = "Edited by hand";
        await _t.Db.SaveChangesAsync();

        await DemoSeeder.SeedAsync(_t.Db);

        Assert.Equal(1, await _t.Db.Users.CountAsync());
        Assert.Equal(3, await _t.Db.Projects.CountAsync());
        Assert.Equal("Edited by hand", (await _t.Db.Profiles.SingleAsync()).Headline);
    }

    public void Dispose() => _t.Dispose();
}

public class DemoPublicPageTests(WebApplicationFactory<Program> factory) : IClassFixture<WebApplicationFactory<Program>>, IDisposable
{
    private readonly ApiHost _api = new(factory);

    [Fact]
    public async Task The_public_api_serves_the_demo_page_and_keeps_the_email_private()
    {
        using (var db = _api.Db())
        {
            await SkillSeeder.SeedAsync(db);
            await DemoSeeder.SeedAsync(db);
        }

        var page = await _api.Client().GetFromJsonAsync<JsonElement>("/api/public/demo");

        Assert.Equal("Ana Petrova", page.GetProperty("profile").GetProperty("fullName").GetString());
        Assert.Equal("Plovdiv", page.GetProperty("profile").GetProperty("location").GetString());
        Assert.Equal(JsonValueKind.Null, page.GetProperty("profile").GetProperty("email").ValueKind);
        Assert.Equal(JsonValueKind.Null, page.GetProperty("githubLogin").ValueKind);
        Assert.Equal(3, page.GetProperty("projects").GetArrayLength());
        Assert.Equal(5, page.GetProperty("skills").GetArrayLength());
        Assert.Equal(2, page.GetProperty("experience").GetArrayLength());
    }

    public void Dispose() => _api.Dispose();
}
