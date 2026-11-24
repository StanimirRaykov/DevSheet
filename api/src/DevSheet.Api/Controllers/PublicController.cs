using DevSheet.Application.Cv;
using DevSheet.Application.Skills;
using DevSheet.Domain.Entities;
using DevSheet.Infrastructure.Career;
using DevSheet.Infrastructure.Cv;
using DevSheet.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DevSheet.Api.Controllers;

/// <summary>
/// Public pages read only stored data and never call GitHub. An unpublished page and an unknown address both
/// answer a plain 404, so a visitor cannot tell whether an address is in use.
/// </summary>
[ApiController, Route("api/public")]
public class PublicController(AppDbContext db, CvDataService cv) : ControllerBase
{
    [HttpGet("{slug}")]
    public async Task<IActionResult> Get(string slug)
    {
        var u = await PublishedUser(slug);
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

        // Privacy: email, location (with the country) and phone are public only when the owner opted in. Names/headline/summary
        // are public once the page is published.
        var p = u.Profile;
        var place = p is null ? "" : CvFormat.Place(p.Location, p.CountryCode);
        object? profile = p is null ? null : new
        {
            p.FullName, p.Headline, p.Summary,
            Location = p.ShowLocationPublicly && place.Length > 0 ? place : null,
            Email = p.ShowEmailPublicly && p.Email.Length > 0 ? p.Email : null,
            Phone = p.ShowPhonePublicly && p.Phone.Length > 0 ? p.Phone : null,
            Website = p.Website.Length > 0 ? p.Website : null,
        };
        var experience = await db.WorkExperiences.Where(w => w.UserId == u.Id).NewestFirst()
            .Select(w => new { w.Company, w.Title, w.StartDate, w.EndDate, w.Description }).ToListAsync();
        var education = await db.Educations.Where(e => e.UserId == u.Id).NewestFirst()
            .Select(e => new { e.Institution, e.Degree, e.StartDate, e.EndDate }).ToListAsync();
        var languages = await db.Languages.Where(l => l.UserId == u.Id).Ordered()
            .Select(l => new { l.Name, l.IsMotherTongue, l.Listening, l.Reading, l.SpokenInteraction, l.SpokenProduction, l.Writing })
            .ToListAsync();
        var certifications = await db.Certifications.Where(c => c.UserId == u.Id).NewestFirst()
            .Select(c => new { c.Name, c.Issuer, c.IssueDate, c.Url }).ToListAsync();

        return Ok(new
        {
            u.DisplayName, u.AvatarUrl, GithubLogin = u.GithubConnection?.Login, u.Slug,
            CvDownload = p?.AllowPublicCvDownload ?? false,
            Profile = profile, Projects = projects,
            Skills = matrix.Select(m => new { m.Name, m.Category, m.Projects }),
            Experience = experience, Education = education, Languages = languages, Certifications = certifications,
        });
    }

    /// <summary>
    /// The CV of a published page, for visitors. Only when the owner allows it (off by default); email and location
    /// follow the same privacy switches as the page. Otherwise 404, like an unknown address.
    /// </summary>
    [HttpGet("{slug}/cv.pdf")]
    public async Task<IActionResult> Cv(string slug)
    {
        var u = await PublishedUser(slug);
        if (u?.Profile is not { AllowPublicCvDownload: true }) return NotFound();

        var model = await cv.BuildAsync(u.Id, forVisitor: true, HttpContext.RequestAborted);
        if (model is null) return NotFound();
        return File(ModernCvRenderer.Render(model), "application/pdf", u.Slug + "-cv.pdf");
    }

    private Task<User?> PublishedUser(string slug) =>
        db.Users.Include(x => x.GithubConnection).Include(x => x.Profile)
            .FirstOrDefaultAsync(x => x.Slug == slug.ToLowerInvariant() && x.IsPublished);
}
