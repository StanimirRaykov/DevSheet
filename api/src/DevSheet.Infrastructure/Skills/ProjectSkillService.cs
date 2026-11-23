using DevSheet.Application.Skills;
using DevSheet.Domain.Entities;
using DevSheet.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace DevSheet.Infrastructure.Skills;

public record SkillLinkDto(Guid SkillId, string Name, LinkStatus Status);
public record SkillOption(Guid Id, string Name);

/// <summary>One project a skill is linked to, with the link's status and the project's own status.</summary>
public record SkillProjectLink(Guid ProjectId, string ProjectTitle, ProjectStatus ProjectStatus, LinkStatus Status);

/// <summary>A skill on any of the caller's projects, with every link to it.</summary>
public record SkillSummary(Guid SkillId, string Name, string Category, IReadOnlyList<SkillProjectLink> Projects);

public record SkillLinkKey(Guid ProjectId, Guid SkillId);

/// <summary>Owner actions on skill links. Every method checks that the project belongs to the caller.</summary>
public class ProjectSkillService(AppDbContext db)
{
    public const int MaxNameLength = 60;
    public const int BulkMax = 500;

    /// <summary>
    /// Every skill linked to one of the caller's projects, A to Z, each with its links (project A to Z). Only the
    /// caller's projects are read, so another user's links to the same skill never appear.
    /// </summary>
    public async Task<IReadOnlyList<SkillSummary>> ListAsync(Guid userId, CancellationToken ct = default)
    {
        var rows = await db.ProjectSkills
            .Where(l => l.Project!.UserId == userId)
            .Select(l => new
            {
                l.SkillId, SkillName = l.Skill!.Name, l.ProjectId,
                Title = l.Project!.TitleOverride ?? l.Project.GithubRepo!.Name, ProjectStatus = l.Project.Status, l.Status,
            })
            .ToListAsync(ct);

        return rows
            .GroupBy(r => (r.SkillId, r.SkillName))
            .Select(g => new SkillSummary(g.Key.SkillId, g.Key.SkillName, SkillCatalog.CategoryOf(g.Key.SkillName),
                g.OrderBy(r => r.Title, StringComparer.OrdinalIgnoreCase)
                    .Select(r => new SkillProjectLink(r.ProjectId, r.Title, r.ProjectStatus, r.Status)).ToList()))
            .OrderBy(s => s.Name, StringComparer.OrdinalIgnoreCase)
            .ToList();
    }

    /// <summary>
    /// Sets several links to one status, Suggested included (that is how Undo and Restore put a skill back in the
    /// queue). All or nothing: null, and no change, when any link is not on one of the caller's projects.
    /// </summary>
    public async Task<int?> SetStatusesAsync(Guid userId, IReadOnlyCollection<SkillLinkKey> keys, LinkStatus status, CancellationToken ct = default)
    {
        var wanted = keys.ToHashSet();
        var projectIds = wanted.Select(k => k.ProjectId).Distinct().ToList();
        var skillIds = wanted.Select(k => k.SkillId).Distinct().ToList();
        var links = (await db.ProjectSkills
                .Where(l => l.Project!.UserId == userId && projectIds.Contains(l.ProjectId) && skillIds.Contains(l.SkillId))
                .ToListAsync(ct))
            .Where(l => wanted.Contains(new SkillLinkKey(l.ProjectId, l.SkillId)))
            .ToList();
        if (links.Count != wanted.Count) return null;

        foreach (var link in links) link.Status = status;
        await db.SaveChangesAsync(ct); // one transaction
        return links.Count;
    }

    /// <summary>Confirm or reject an existing link. False when the link is not on one of the caller's projects.</summary>
    public async Task<bool> SetStatusAsync(Guid userId, Guid projectId, Guid skillId, LinkStatus status, CancellationToken ct = default)
    {
        if (status == LinkStatus.Suggested) throw new ArgumentException("Only Confirmed or Rejected can be set.", nameof(status));

        var link = await db.ProjectSkills
            .Include(l => l.Project)
            .FirstOrDefaultAsync(l => l.ProjectId == projectId && l.SkillId == skillId && l.Project!.UserId == userId, ct);
        if (link is null) return false;

        link.Status = status;
        await db.SaveChangesAsync(ct);
        return true;
    }

    /// <summary>
    /// Add a skill by name as Confirmed. Resolves aliases ("ReactJS" -> React) and existing custom skills
    /// case-insensitively; only creates a new custom skill when nothing matches.
    /// Returns null when the project is not the caller's.
    /// </summary>
    public async Task<SkillLinkDto?> AddManualAsync(Guid userId, Guid projectId, string name, CancellationToken ct = default)
    {
        var display = string.Join(' ', (name ?? "").Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries));
        if (display.Length == 0) throw new ArgumentException("Skill name is required.", nameof(name));
        if (display.Length > MaxNameLength) throw new ArgumentException($"Skill name is longer than {MaxNameLength} characters.", nameof(name));

        var project = await db.Projects.Include(p => p.Skills)
            .FirstOrDefaultAsync(p => p.Id == projectId && p.UserId == userId, ct);
        if (project is null) return null;

        var normalized = SkillCatalog.Normalize(display);
        var skill = await db.SkillAliases.Where(a => a.Alias == normalized).Select(a => a.Skill!).FirstOrDefaultAsync(ct)
                    ?? await db.Skills.FirstOrDefaultAsync(s => s.Name.ToLower() == normalized, ct);
        if (skill is null)
        {
            skill = new Skill { Name = display };
            db.Skills.Add(skill);
        }

        var link = project.Skills.FirstOrDefault(l => l.SkillId == skill.Id);
        if (link is null)
        {
            link = new ProjectSkill { ProjectId = project.Id, SkillId = skill.Id, Status = LinkStatus.Confirmed };
            project.Skills.Add(link);
        }
        else
        {
            link.Status = LinkStatus.Confirmed; // the user explicitly added it, even if rejected before
        }

        await db.SaveChangesAsync(ct);
        return new SkillLinkDto(skill.Id, skill.Name, link.Status);
    }

    /// <summary>Autocomplete over canonical and custom skills (name contains, or an alias starts with, the query).</summary>
    public async Task<IReadOnlyList<SkillOption>> SearchAsync(string? query, int take = 10, CancellationToken ct = default)
    {
        var q = SkillCatalog.Normalize(query ?? "");
        if (q.Length == 0) return [];

        return await db.Skills
            .Where(s => s.Name.ToLower().Contains(q) || db.SkillAliases.Any(a => a.SkillId == s.Id && a.Alias.StartsWith(q)))
            .OrderBy(s => s.Name)
            .Take(take)
            .Select(s => new SkillOption(s.Id, s.Name))
            .ToListAsync(ct);
    }
}
