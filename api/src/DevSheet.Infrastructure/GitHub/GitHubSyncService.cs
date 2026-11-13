using System.Text.Json;
using DevSheet.Application.Abstractions;
using DevSheet.Domain.Entities;
using DevSheet.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace DevSheet.Infrastructure.GitHub;

public class GitHubSyncService(
    AppDbContext db, ITokenProtector tokens, IGitHubRepoSource source, TimeProvider clock) : IGitHubSyncService
{
    public static readonly TimeSpan MinInterval = TimeSpan.FromMinutes(15);
    private const int MaxRepos = 30; // demo cap: one languages call per repo

    public async Task<int> SyncAsync(Guid userId, CancellationToken ct = default)
    {
        var user = await db.Users.Include(u => u.Repos).FirstAsync(u => u.Id == userId, ct);
        if (user.EncryptedGithubToken is null) return 0;
        var now = clock.GetUtcNow().UtcDateTime;
        if (user.LastSyncedAt is { } last && now - last < MinInterval) return 0;

        var remote = await source.GetPublicReposAsync(
            user.GithubLogin, tokens.Unprotect(user.EncryptedGithubToken), MaxRepos, ct);

        var seen = new HashSet<long>();
        var added = 0;
        foreach (var r in remote)
        {
            seen.Add(r.Id);
            var repo = user.Repos.FirstOrDefault(x => x.GithubRepoId == r.Id);
            if (repo is null)
            {
                repo = new GithubRepo { UserId = user.Id, GithubRepoId = r.Id };
                db.GithubRepos.Add(repo);
                // New repos arrive Pending: never public until the user approves.
                db.Projects.Add(new Project { UserId = user.Id, GithubRepoId = repo.Id, Status = ProjectStatus.Pending });
                added++;
            }
            // Only the synced layer is written here; Project (user layer) is never touched on re-sync.
            repo.Name = r.Name;
            repo.Description = r.Description;
            repo.HtmlUrl = r.HtmlUrl;
            repo.Stars = r.Stars;
            repo.IsFork = r.IsFork;
            repo.PushedAt = r.PushedAt;
            repo.LanguagesJson = JsonSerializer.Serialize(r.Languages);
            repo.SourceMissing = false;
        }

        // Repos that vanished keep their Project; just flag the source.
        foreach (var gone in user.Repos.Where(x => !seen.Contains(x.GithubRepoId)))
            gone.SourceMissing = true;

        user.LastSyncedAt = now;
        await db.SaveChangesAsync(ct);
        return added;
    }
}
