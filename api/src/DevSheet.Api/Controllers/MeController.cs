using DevSheet.Application.Abstractions;
using DevSheet.Domain.Entities;
using DevSheet.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DevSheet.Api.Controllers;

[ApiController, Route("api/me"), Authorize]
public class MeController(AppDbContext db, IGitHubSyncService sync) : ControllerBase
{
    private Guid Uid => Guid.Parse(User.FindFirst("devsheet:uid")!.Value);

    [HttpGet]
    public async Task<IActionResult> Get() =>
        Ok(await db.Users.Where(u => u.Id == Uid)
            .Select(u => new { u.Id, u.GithubLogin, u.Slug, u.IsPublished, u.LastSyncedAt }).FirstAsync());

    [HttpPost("sync")]
    public async Task<IActionResult> Sync() => Ok(new { added = await sync.SyncAsync(Uid) });

    [HttpGet("projects")]
    public async Task<IActionResult> Projects() =>
        Ok(await db.Projects.Where(p => p.UserId == Uid).Include(p => p.GithubRepo)
            .Select(p => new
            {
                p.Id, p.Status,
                Title = p.TitleOverride ?? p.GithubRepo!.Name,
                Description = p.DescriptionOverride ?? p.GithubRepo!.Description,
                Url = p.GithubRepo!.HtmlUrl, p.GithubRepo.Stars, p.GithubRepo.LanguagesJson,
                p.GithubRepo.SourceMissing
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
}
