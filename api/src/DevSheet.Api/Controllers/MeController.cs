using DevSheet.Application.Abstractions;
using DevSheet.Domain.Entities;
using DevSheet.Infrastructure.Accounts;
using DevSheet.Infrastructure.Persistence;
using DevSheet.Infrastructure.Skills;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DevSheet.Api.Controllers;

[ApiController, Route("api/me"), Authorize]
public class MeController(AppDbContext db, IGitHubSyncService sync, ProjectSkillService skills, AccountService accounts) : ControllerBase
{
    private Guid Uid => Guid.Parse(User.FindFirst(ExternalAuth.UserIdClaim)!.Value);

    [HttpGet]
    public async Task<IActionResult> Get() =>
        Ok(await db.Users.Where(u => u.Id == Uid)
            .Select(u => new
            {
                u.Id, u.DisplayName, u.AvatarUrl, u.Slug, u.IsPublished,
                Github = u.GithubConnection == null ? null : new { u.GithubConnection.Login, u.GithubConnection.LastSyncedAt },
            }).FirstAsync());

    /// <summary>
    /// What the overview page shows, in one call: counts and flags about the caller's own data. Confirmed skills
    /// count only those on visible projects (what the public page shows); suggested skills count each skill once.
    /// </summary>
    [HttpGet("summary")]
    public async Task<IActionResult> Summary()
    {
        var uid = Uid;
        var user = await db.Users.Where(u => u.Id == uid).Select(u => new { u.IsPublished, u.Slug }).FirstAsync();
        var profile = await db.Profiles.Where(p => p.UserId == uid).Select(p => new { p.Headline, p.Summary }).FirstOrDefaultAsync();
        var byStatus = await db.Projects.Where(p => p.UserId == uid)
            .GroupBy(p => p.Status).Select(g => new { Status = g.Key, Count = g.Count() }).ToListAsync();
        int Projects(ProjectStatus s) => byStatus.FirstOrDefault(x => x.Status == s)?.Count ?? 0;

        var links = db.ProjectSkills.Where(l => l.Project!.UserId == uid);
        var confirmedSkills = await links.Where(l => l.Status == LinkStatus.Confirmed && l.Project!.Status == ProjectStatus.Visible)
            .Select(l => l.SkillId).Distinct().CountAsync();
        var suggestedSkills = await links.Where(l => l.Status == LinkStatus.Suggested).Select(l => l.SkillId).Distinct().CountAsync();
        var github = await db.GithubConnections.Where(c => c.UserId == uid).Select(c => new { c.Login, c.LastSyncedAt }).FirstOrDefaultAsync();

        return Ok(new
        {
            user.IsPublished,
            user.Slug,
            HasHeadline = !string.IsNullOrWhiteSpace(profile?.Headline),
            HasSummary = !string.IsNullOrWhiteSpace(profile?.Summary),
            Experience = await db.WorkExperiences.CountAsync(x => x.UserId == uid),
            Education = await db.Educations.CountAsync(x => x.UserId == uid),
            Languages = await db.Languages.CountAsync(x => x.UserId == uid),
            Certifications = await db.Certifications.CountAsync(x => x.UserId == uid),
            Projects = new { Pending = Projects(ProjectStatus.Pending), Visible = Projects(ProjectStatus.Visible), Hidden = Projects(ProjectStatus.Hidden) },
            ConfirmedSkills = confirmedSkills,
            SuggestedSkills = suggestedSkills,
            Github = github,
        });
    }

    [HttpPost("sync")]
    public async Task<IActionResult> Sync()
    {
        if (!await db.GithubConnections.AnyAsync(c => c.UserId == Uid))
            return Conflict(new { error = "Connect GitHub to sync your repositories." });
        return Ok(new { added = await sync.SyncAsync(Uid) });
    }

    /// <summary>The ways this account can sign in.</summary>
    [HttpGet("logins")]
    public async Task<IActionResult> Logins() =>
        Ok(await db.ExternalLogins.Where(l => l.UserId == Uid).OrderBy(l => l.CreatedAt)
            .Select(l => new { l.Provider, l.Email, l.CreatedAt }).ToListAsync());

    /// <summary>Remove a sign-in method. 409 when it is the last one: the account would be unreachable.</summary>
    [HttpDelete("logins/{provider}")]
    public async Task<IActionResult> Unlink(string provider) =>
        await accounts.UnlinkAsync(Uid, provider.ToLowerInvariant()) switch
        {
            UnlinkResult.Unlinked => NoContent(),
            UnlinkResult.LastSignInMethod => Conflict(new { error = "This is your only way to sign in. Add another one first." }),
            _ => NotFound(),
        };

    /// <summary>Disconnect GitHub: deletes the token. Synced projects stay, marked as source missing.</summary>
    [HttpPost("github/disconnect")]
    public async Task<IActionResult> DisconnectGithub() =>
        await accounts.DisconnectGithubAsync(Uid) ? NoContent() : NotFound();

    [HttpGet("projects")]
    public async Task<IActionResult> Projects() =>
        Ok(await db.Projects.Where(p => p.UserId == Uid).Include(p => p.GithubRepo)
            .Select(p => new
            {
                p.Id, p.Status,
                Title = p.TitleOverride ?? p.GithubRepo!.Name,
                Description = p.DescriptionOverride ?? p.GithubRepo!.Description,
                Url = p.GithubRepo!.HtmlUrl, p.GithubRepo.Stars, p.GithubRepo.LanguagesJson,
                p.GithubRepo.SourceMissing, p.GithubRepo.PushedAt,
                Skills = p.Skills.OrderBy(ps => ps.Skill!.Name)
                    .Select(ps => new { ps.SkillId, Name = ps.Skill!.Name, ps.Status })
            }).ToListAsync());

    public record StatusDto(ProjectStatus Status);

    private const string BadStatus = "Status must be Pending (0), Visible (1) or Hidden (2).";

    [HttpPatch("projects/{id:guid}/status")]
    public async Task<IActionResult> SetStatus(Guid id, StatusDto dto)
    {
        if (!Enum.IsDefined(dto.Status)) return BadRequest(new { error = BadStatus });
        var p = await db.Projects.FirstOrDefaultAsync(x => x.Id == id && x.UserId == Uid);
        if (p is null) return NotFound();
        p.Status = dto.Status;
        await db.SaveChangesAsync();
        return NoContent();
    }

    public const int BulkMax = 200;

    public record BulkStatusDto(List<Guid>? Ids, ProjectStatus Status);

    /// <summary>
    /// Sets the status of several of my projects at once. All or nothing: if any id is not one of my projects
    /// (unknown, or someone else's), the answer is 404 and nothing changes, so a stale list cannot half-apply.
    /// </summary>
    [HttpPatch("projects/status")]
    public async Task<IActionResult> SetStatuses(BulkStatusDto dto)
    {
        if (!Enum.IsDefined(dto.Status)) return BadRequest(new { error = BadStatus });
        var ids = (dto.Ids ?? []).Distinct().ToList();
        if (ids.Count == 0) return BadRequest(new { error = "Choose at least one project." });
        if (ids.Count > BulkMax) return BadRequest(new { error = $"Choose at most {BulkMax} projects at a time." });

        var projects = await db.Projects.Where(p => p.UserId == Uid && ids.Contains(p.Id)).ToListAsync();
        if (projects.Count != ids.Count) return NotFound(new { error = "Some of these projects no longer exist. Reload and try again." });
        foreach (var p in projects) p.Status = dto.Status;
        await db.SaveChangesAsync(); // one SaveChanges is one transaction
        return Ok(new { updated = projects.Count });
    }

    [HttpPost("publish")]
    public async Task<IActionResult> Publish([FromQuery] bool value = true)
    {
        var u = await db.Users.FirstAsync(x => x.Id == Uid);
        u.IsPublished = value;
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpGet("skills")]
    public async Task<IActionResult> SearchSkills([FromQuery] string? query) => Ok(await skills.SearchAsync(query));

    /// <summary>All my skills with the projects behind each one: the Skills page.</summary>
    [HttpGet("skill-links")]
    public async Task<IActionResult> SkillLinks() => Ok(await skills.ListAsync(Uid));

    public record SkillLinksDto(List<SkillLinkKey>? Links, LinkStatus Status);

    /// <summary>
    /// Confirm, reject or put back several skill links at once (a whole skill, all of a project's suggestions, an
    /// undo). All or nothing: 404 and no change when any link is not on one of my projects.
    /// </summary>
    [HttpPatch("skill-links")]
    public async Task<IActionResult> SetSkillLinks(SkillLinksDto dto)
    {
        if (!Enum.IsDefined(dto.Status)) return BadRequest(new { error = "Status must be Suggested (0), Confirmed (1) or Rejected (2)." });
        var keys = (dto.Links ?? []).Distinct().ToList();
        if (keys.Count == 0) return BadRequest(new { error = "Choose at least one skill." });
        if (keys.Count > ProjectSkillService.BulkMax) return BadRequest(new { error = $"Choose at most {ProjectSkillService.BulkMax} at a time." });
        var updated = await skills.SetStatusesAsync(Uid, keys, dto.Status);
        return updated is null
            ? NotFound(new { error = "Some of these skills are no longer on your projects. Reload and try again." })
            : Ok(new { updated });
    }

    public record SkillStatusDto(LinkStatus Status);

    /// <summary>Confirm or reject a skill on one of my projects.</summary>
    [HttpPatch("projects/{projectId:guid}/skills/{skillId:guid}")]
    public async Task<IActionResult> SetSkillStatus(Guid projectId, Guid skillId, SkillStatusDto dto)
    {
        if (dto.Status is not (LinkStatus.Confirmed or LinkStatus.Rejected))
            return BadRequest(new { error = "Status must be Confirmed (1) or Rejected (2)." });
        return await skills.SetStatusAsync(Uid, projectId, skillId, dto.Status) ? NoContent() : NotFound();
    }

    public record AddSkillDto(string? Name);

    /// <summary>Add a skill by name to one of my projects (Confirmed).</summary>
    [HttpPost("projects/{projectId:guid}/skills")]
    public async Task<IActionResult> AddSkill(Guid projectId, AddSkillDto dto)
    {
        try
        {
            var result = await skills.AddManualAsync(Uid, projectId, dto.Name ?? "");
            return result is null ? NotFound() : Ok(result);
        }
        catch (ArgumentException e)
        {
            return BadRequest(new { error = e.Message });
        }
    }
}
