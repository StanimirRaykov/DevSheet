using DevSheet.Domain.Entities;
using DevSheet.Infrastructure.GitHub;
using Microsoft.EntityFrameworkCore;

namespace DevSheet.Tests;

public class SkillSuggestionSyncTests
{
    private static (GitHubSyncService svc, TestDb t, FakeSource src, FakeClock clock, User user) Setup()
    {
        var t = new TestDb();
        t.SeedSkills();
        var src = new FakeSource();
        var clock = new FakeClock(new DateTimeOffset(2026, 11, 16, 9, 0, 0, TimeSpan.Zero));
        var user = t.AddUser();
        return (new GitHubSyncService(t.Db, new PassthroughProtector(), src, clock), t, src, clock, user);
    }

    private static void NextSyncWindow(FakeClock c) => c.Advance(GitHubSyncService.MinInterval + TimeSpan.FromMinutes(1));

    [Fact]
    public async Task Sync_creates_Suggested_links_for_main_languages()
    {
        var (svc, t, src, _, user) = Setup();
        using var _ = t;
        src.Repos = [FakeSource.Repo(1, languages: new() { ["C#"] = 900, ["Dockerfile"] = 100, ["Brainfuck"] = 1 })];

        await svc.SyncAsync(user.Id);

        var links = await t.Db.ProjectSkills.Include(l => l.Skill).ToListAsync();
        Assert.Equal(["C#", "Docker"], links.Select(l => l.Skill!.Name).OrderBy(n => n));
        Assert.All(links, l => Assert.Equal(LinkStatus.Suggested, l.Status));
    }

    [Fact]
    public async Task Fork_gets_no_suggestions()
    {
        var (svc, t, src, _, user) = Setup();
        using var _ = t;
        src.Repos = [FakeSource.Repo(1, isFork: true)];

        await svc.SyncAsync(user.Id);

        Assert.Equal(1, await t.Db.Projects.CountAsync());
        Assert.Equal(0, await t.Db.ProjectSkills.CountAsync());
    }

    [Fact]
    public async Task Unknown_language_creates_no_skill_rows()
    {
        var (svc, t, src, _, user) = Setup();
        using var _ = t;
        var before = await t.Db.Skills.CountAsync();
        src.Repos = [FakeSource.Repo(1, languages: new() { ["Brainfuck"] = 100 })];

        await svc.SyncAsync(user.Id);

        Assert.Equal(before, await t.Db.Skills.CountAsync());
        Assert.Equal(0, await t.Db.ProjectSkills.CountAsync());
    }

    [Fact]
    public async Task Resync_does_not_duplicate_links()
    {
        var (svc, t, src, clock, user) = Setup();
        using var _ = t;
        src.Repos = [FakeSource.Repo(1)];
        await svc.SyncAsync(user.Id);
        var first = await t.Db.ProjectSkills.CountAsync();

        NextSyncWindow(clock);
        await svc.SyncAsync(user.Id);
        NextSyncWindow(clock);
        await svc.SyncAsync(user.Id);

        Assert.True(first > 0);
        Assert.Equal(first, await t.Db.ProjectSkills.CountAsync());
    }

    [Fact]
    public async Task Rejected_link_stays_Rejected_after_resync()
    {
        var (svc, t, src, clock, user) = Setup();
        using var _ = t;
        src.Repos = [FakeSource.Repo(1)];
        await svc.SyncAsync(user.Id);
        var link = await t.Db.ProjectSkills.SingleAsync(l => l.SkillId == t.SkillId("C#"));
        link.Status = LinkStatus.Rejected;
        await t.Db.SaveChangesAsync();

        NextSyncWindow(clock);
        await svc.SyncAsync(user.Id);

        t.Db.ChangeTracker.Clear();
        var again = await t.Db.ProjectSkills.SingleAsync(l => l.SkillId == t.SkillId("C#"));
        Assert.Equal(LinkStatus.Rejected, again.Status);
    }

    [Fact]
    public async Task Confirmed_link_survives_resync_when_language_is_gone()
    {
        var (svc, t, src, clock, user) = Setup();
        using var _ = t;
        src.Repos = [FakeSource.Repo(1)];
        await svc.SyncAsync(user.Id);
        var link = await t.Db.ProjectSkills.SingleAsync(l => l.SkillId == t.SkillId("C#"));
        link.Status = LinkStatus.Confirmed;
        await t.Db.SaveChangesAsync();

        NextSyncWindow(clock);
        src.Repos = [FakeSource.Repo(1, languages: new() { ["Python"] = 1000 })];
        await svc.SyncAsync(user.Id);

        t.Db.ChangeTracker.Clear();
        var csharp = await t.Db.ProjectSkills.SingleAsync(l => l.SkillId == t.SkillId("C#"));
        Assert.Equal(LinkStatus.Confirmed, csharp.Status);
        var python = await t.Db.ProjectSkills.SingleAsync(l => l.SkillId == t.SkillId("Python"));
        Assert.Equal(LinkStatus.Suggested, python.Status); // new language is suggested alongside
    }
}
