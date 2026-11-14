using System.Text.Json;
using DevSheet.Application.Abstractions;
using DevSheet.Application.Skills;
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

        var aliasToSkillId = await db.SkillAliases.ToDictionaryAsync(a => a.Alias, a => a.SkillId, ct);
        var projectsByRepo = (await db.Projects.Include(p => p.Skills)
                .Where(p => p.UserId == user.Id && p.GithubRepoId != null).ToListAsync(ct))
            .ToDictionary(p => p.GithubRepoId!.Value);

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
                var created = new Project { UserId = user.Id, GithubRepoId = repo.Id, Status = ProjectStatus.Pending };
                db.Projects.Add(created);
                projectsByRepo[repo.Id] = created;
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

            // Suggest skills. Forks are skipped: their languages are not the user's work.
            if (!r.IsFork && projectsByRepo.TryGetValue(repo.Id, out var project))
                SuggestSkills(project, SkillDetector.Detect(r.Languages, aliasToSkillId));
        }

        // Repos that vanished keep their Project; just flag the source.
        foreach (var gone in user.Repos.Where(x => !seen.Contains(x.GithubRepoId)))
            gone.SourceMissing = true;

        user.LastSyncedAt = now;
        await db.SaveChangesAsync(ct);
        return added;
    }

    /// <summary>
    /// Idempotent by (project, skill): an existing link of any status (Suggested / Confirmed / Rejected)
    /// is left untouched, so re-sync never resets the user's decisions and never removes a link.
    /// </summary>
    private static void SuggestSkills(Project project, IEnumerable<Guid> skillIds)
    {
        foreach (var skillId in skillIds)
        {
            if (project.Skills.Any(ps => ps.SkillId == skillId)) continue;
            project.Skills.Add(new ProjectSkill { ProjectId = project.Id, SkillId = skillId, Status = LinkStatus.Suggested });
        }
    }
}
