using DevSheet.Domain.Entities;
using DevSheet.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DevSheet.Api.Controllers;

/// <summary>Public pages read only stored data and never call GitHub.</summary>
[ApiController, Route("api/public")]
public class PublicController(AppDbContext db) : ControllerBase
{
    [HttpGet("{slug}")]
    public async Task<IActionResult> Get(string slug)
    {
        var u = await db.Users.FirstOrDefaultAsync(x => x.Slug == slug.ToLowerInvariant() && x.IsPublished);
        if (u is null) return NotFound();

        var projects = await db.Projects
            .Where(p => p.UserId == u.Id && p.Status == ProjectStatus.Visible)
            .Include(p => p.GithubRepo)
            .OrderBy(p => p.DisplayOrder)
            .Select(p => new
            {
                Title = p.TitleOverride ?? p.GithubRepo!.Name,
                Description = p.DescriptionOverride ?? p.GithubRepo!.Description,
                Url = p.GithubRepo!.HtmlUrl, p.GithubRepo.Stars, p.GithubRepo.LanguagesJson
            }).ToListAsync();

        return Ok(new { u.GithubLogin, u.Slug, Projects = projects });
    }
}
