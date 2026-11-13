using DevSheet.Domain.Entities;
using DevSheet.Infrastructure.GitHub;
using Microsoft.EntityFrameworkCore;

namespace DevSheet.Tests;

public class GitHubSyncServiceTests
{
    private static (GitHubSyncService svc, TestDb t, FakeSource src, FakeClock clock, User user) Setup()
    {
        var t = new TestDb();
        var src = new FakeSource();
        var clock = new FakeClock(new DateTimeOffset(2026, 11, 16, 9, 0, 0, TimeSpan.Zero));
        var user = t.AddUser();
        return (new GitHubSyncService(t.Db, new PassthroughProtector(), src, clock), t, src, clock, user);
    }

    [Fact]
    public async Task New_repos_arrive_as_Pending_projects()
    {
        var (svc, t, src, _, user) = Setup();
        using var _ = t;
        src.Repos = [FakeSource.Repo(1, "a"), FakeSource.Repo(2, "b")];

        var added = await svc.SyncAsync(user.Id);

        Assert.Equal(2, added);
        var projects = await t.Db.Projects.ToListAsync();
        Assert.Equal(2, projects.Count);
        Assert.All(projects, p => Assert.Equal(ProjectStatus.Pending, p.Status));
    }

    [Fact]
    public async Task Resync_updates_synced_data_but_never_overwrites_user_edits()
    {
        var (svc, t, src, clock, user) = Setup();
        using var _ = t;
        src.Repos = [FakeSource.Repo(1, "a", stars: 1)];
        await svc.SyncAsync(user.Id);

        var project = await t.Db.Projects.SingleAsync();
        project.TitleOverride = "My nicer title";
        project.Status = ProjectStatus.Visible;
        await t.Db.SaveChangesAsync();

        clock.Advance(GitHubSyncService.MinInterval + TimeSpan.FromMinutes(1));
        src.Repos = [FakeSource.Repo(1, "a", stars: 99)];
        var added = await svc.SyncAsync(user.Id);

        Assert.Equal(0, added);
        var repo = await t.Db.GithubRepos.SingleAsync();
        Assert.Equal(99, repo.Stars); // synced layer refreshed
        var again = await t.Db.Projects.SingleAsync();
        Assert.Equal("My nicer title", again.TitleOverride); // user layer intact
        Assert.Equal(ProjectStatus.Visible, again.Status);
    }

    [Fact]
    public async Task Vanished_repo_is_flagged_and_its_project_kept()
    {
        var (svc, t, src, clock, user) = Setup();
        using var _ = t;
        src.Repos = [FakeSource.Repo(1, "a"), FakeSource.Repo(2, "b")];
        await svc.SyncAsync(user.Id);

        clock.Advance(GitHubSyncService.MinInterval + TimeSpan.FromMinutes(1));
        src.Repos = [FakeSource.Repo(1, "a")];
        await svc.SyncAsync(user.Id);

        Assert.Equal(2, await t.Db.Projects.CountAsync());
        var gone = await t.Db.GithubRepos.SingleAsync(r => r.GithubRepoId == 2);
        Assert.True(gone.SourceMissing);
        var kept = await t.Db.GithubRepos.SingleAsync(r => r.GithubRepoId == 1);
        Assert.False(kept.SourceMissing);
    }

    [Fact]
    public async Task Sync_is_throttled_within_the_minimum_interval()
    {
        var (svc, t, src, clock, user) = Setup();
        using var _ = t;
        src.Repos = [FakeSource.Repo(1)];
        await svc.SyncAsync(user.Id);

        clock.Advance(TimeSpan.FromMinutes(5));
        var added = await svc.SyncAsync(user.Id);

        Assert.Equal(0, added);
        Assert.Equal(1, src.Calls); // GitHub was not called again
    }
}
