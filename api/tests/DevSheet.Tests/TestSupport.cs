using DevSheet.Application.Abstractions;
using DevSheet.Domain.Entities;
using DevSheet.Infrastructure.Persistence;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;

namespace DevSheet.Tests;

/// <summary>Real relational behaviour (SQLite in-memory) without needing Postgres in CI.</summary>
public sealed class TestDb : IDisposable
{
    private readonly SqliteConnection _conn = new("DataSource=:memory:");
    public AppDbContext Db { get; }

    public TestDb()
    {
        _conn.Open();
        Db = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>().UseSqlite(_conn).Options);
        Db.Database.EnsureCreated();
    }

    public User AddUser(string login = "alice", bool published = false)
    {
        var u = new User { DisplayName = login, Slug = login, IsPublished = published };
        u.GithubConnection = new GithubConnection
        {
            UserId = u.Id, GithubId = Random.Shared.NextInt64(1, long.MaxValue), Login = login, EncryptedToken = "enc"
        };
        Db.Users.Add(u);
        Db.SaveChanges();
        return u;
    }

    /// <summary>Seeds the canonical skills and aliases (same seeder the app runs at startup).</summary>
    public void SeedSkills() => DevSheet.Infrastructure.Persistence.SkillSeeder.SeedAsync(Db).GetAwaiter().GetResult();

    public Project AddProjectFor(User u, string name, ProjectStatus status = ProjectStatus.Visible)
    {
        var repo = new GithubRepo { UserId = u.Id, GithubRepoId = Random.Shared.NextInt64(), Name = name, HtmlUrl = "https://x/" + name };
        var project = new Project { UserId = u.Id, GithubRepoId = repo.Id, Status = status };
        Db.GithubRepos.Add(repo);
        Db.Projects.Add(project);
        Db.SaveChanges();
        return project;
    }

    public void Link(Project p, string skillName, LinkStatus status)
    {
        Db.ProjectSkills.Add(new ProjectSkill { ProjectId = p.Id, SkillId = SkillId(skillName), Status = status });
        Db.SaveChanges();
    }

    public Guid SkillId(string name) => Db.Skills.Single(s => s.Name == name).Id;

    public void Dispose() { Db.Dispose(); _conn.Dispose(); }
}

public class FakeClock(DateTimeOffset start) : TimeProvider
{
    private DateTimeOffset _now = start;
    public override DateTimeOffset GetUtcNow() => _now;
    public void Advance(TimeSpan by) => _now += by;
}

public class FakeSource : IGitHubRepoSource
{
    public List<RemoteRepo> Repos { get; set; } = new();
    public int Calls { get; private set; }
    public Task<IReadOnlyList<RemoteRepo>> GetPublicReposAsync(string login, string token, int max, CancellationToken ct = default)
    {
        Calls++;
        return Task.FromResult<IReadOnlyList<RemoteRepo>>(Repos.ToList());
    }

    public static RemoteRepo Repo(long id, string name = "repo", int stars = 0,
        Dictionary<string, long>? languages = null, bool isFork = false) =>
        new(id, name, "desc", $"https://github.com/alice/{name}", stars, isFork, DateTime.UtcNow,
            languages ?? new Dictionary<string, long> { ["C#"] = 1000 });
}

public class PassthroughProtector : ITokenProtector
{
    public string Protect(string plain) => plain;
    public string Unprotect(string protectedValue) => protectedValue;
}
