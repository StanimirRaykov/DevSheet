using System.Text.Json;
using DevSheet.Application.Abstractions;
using DevSheet.Domain.Entities;
using DevSheet.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Octokit;

namespace DevSheet.Infrastructure.GitHub;

public class GitHubSyncService(AppDbContext db, ITokenProtector tokens) : IGitHubSyncService
{
    private static readonly TimeSpan MinInterval = TimeSpan.FromMinutes(15);
    private const int MaxRepos = 30; // demo cap: one languages call per repo

    public async Task<int> SyncAsync(Guid userId, CancellationToken ct = default)
    {
        var user = await db.Users.Include(u => u.Repos).FirstAsync(u => u.Id == userId, ct);
        if (user.EncryptedGithubToken is null) return 0;
        if (user.LastSyncedAt is { } last && DateTime.UtcNow - last < MinInterval) return 0;

        var client = new GitHubClient(new ProductHeaderValue("DevSheet"))
        {
            Credentials = new Credentials(tokens.Unprotect(user.EncryptedGithubToken))
        };

        var remote = (await client.Repository.GetAllForUser(user.GithubLogin))
            .Where(r => !r.Private)
            .OrderByDescending(r => r.PushedAt)
            .Take(MaxRepos)
            .ToList();

        var seen = new HashSet<long>();
        var added = 0;
        foreach (var r in remote)
        {
            seen.Add(r.Id);
            var langs = await client.Repository.GetAllLanguages(r.Owner.Login, r.Name);
            var langsJson = JsonSerializer.Serialize(langs.ToDictionary(l => l.Name, l => l.NumberOfBytes));

            var repo = user.Repos.FirstOrDefault(x => x.GithubRepoId == r.Id);
            if (repo is null)
            {
                repo = new GithubRepo { UserId = user.Id, GithubRepoId = r.Id };
                db.GithubRepos.Add(repo);
                // New repos arrive Pending: never public until the user approves.
                db.Projects.Add(new DevSheet.Domain.Entities.Project { UserId = user.Id, GithubRepoId = repo.Id, Status = ProjectStatus.Pending });
                added++;
            }
            repo.Name = r.Name;
            repo.Description = r.Description;
            repo.HtmlUrl = r.HtmlUrl;
            repo.Stars = r.StargazersCount;
            repo.IsFork = r.Fork;
            repo.PushedAt = r.PushedAt?.UtcDateTime;
            repo.LanguagesJson = langsJson;
            repo.SourceMissing = false;
        }

        // Repos that vanished keep their Project; just flag the source.
        foreach (var gone in user.Repos.Where(x => !seen.Contains(x.GithubRepoId)))
            gone.SourceMissing = true;

        user.LastSyncedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        return added;
    }
}
