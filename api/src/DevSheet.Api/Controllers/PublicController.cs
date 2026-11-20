using DevSheet.Application.Skills;
using DevSheet.Domain.Entities;
using DevSheet.Infrastructure.Career;
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
        var u = await db.Users.Include(x => x.GithubConnection).FirstOrDefaultAsync(x => x.Slug == slug.ToLowerInvariant() && x.IsPublished);
        if (u is null) return NotFound();

        var projects = await db.Projects
            .Where(p => p.UserId == u.Id && p.Status == ProjectStatus.Visible)
            .Include(p => p.GithubRepo)
            .OrderBy(p => p.DisplayOrder)
            .Select(p => new
            {
                Title = p.TitleOverride ?? p.GithubRepo!.Name,
                Description = p.DescriptionOverride ?? p.GithubRepo!.Description,
                Url = p.GithubRepo!.HtmlUrl, p.GithubRepo.Stars, p.GithubRepo.LanguagesJson,
                // Only Confirmed links are ever public. Suggested and Rejected stay private to the owner.
                Skills = p.Skills.Where(ps => ps.Status == LinkStatus.Confirmed)
                    .OrderBy(ps => ps.Skill!.Name).Select(ps => ps.Skill!.Name)
            }).ToListAsync();

        var matrix = SkillMatrix.Build(projects.Select(p => (p.Title, (IEnumerable<string>)p.Skills)));

        // Privacy: email and location are public only when the owner opted in. Names/headline/summary
        // are public once the page is published.
        var p = await db.Profiles.FirstOrDefaultAsync(x => x.UserId == u.Id);
        object? profile = p is null ? null : new
        {
            p.FullName, p.Headline, p.Summary,
            Location = p.ShowLocationPublicly ? p.Location : null,
            Email = p.ShowEmailPublicly ? p.Email : null,
        };
        var experience = await db.WorkExperiences.Where(w => w.UserId == u.Id).NewestFirst()
            .Select(w => new { w.Company, w.Title, w.StartDate, w.EndDate, w.Description }).ToListAsync();
        var education = await db.Educations.Where(e => e.UserId == u.Id).NewestFirst()
            .Select(e => new { e.Institution, e.Degree, e.StartDate, e.EndDate }).ToListAsync();

        return Ok(new { u.DisplayName, GithubLogin = u.GithubConnection?.Login, u.Slug, Profile = profile, Projects = projects, Skills = matrix, Experience = experience, Education = education });
    }
}
