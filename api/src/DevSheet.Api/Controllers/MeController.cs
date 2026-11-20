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
                p.GithubRepo.SourceMissing,
                Skills = p.Skills.OrderBy(ps => ps.Skill!.Name)
                    .Select(ps => new { ps.SkillId, Name = ps.Skill!.Name, ps.Status })
            }).ToListAsync());

    public record StatusDto(ProjectStatus Status);

    [HttpPatch("projects/{id:guid}/status")]
    public async Task<IActionResult> SetStatus(Guid id, StatusDto dto)
    {
        var p = await db.Projects.FirstOrDefaultAsync(x => x.Id == id && x.UserId == Uid);
        if (p is null) return NotFound();
        p.Status = dto.Status;
        await db.SaveChangesAsync();
        return NoContent();
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
