using DevSheet.Application.Cv;
using DevSheet.Application.Skills;
using DevSheet.Domain.Entities;
using DevSheet.Infrastructure.Career;
using DevSheet.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace DevSheet.Infrastructure.Cv;

/// <summary>Builds the CV model for one user. The privacy rules live here, once, for every template.</summary>
public class CvDataService(AppDbContext db)
{
    /// <summary>A CV is a summary, not a repo dump.</summary>
    public const int MaxProjects = 8;

    public async Task<CvModel?> BuildAsync(Guid userId, CancellationToken ct = default)
    {
        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == userId, ct);
        if (user is null) return null;

        var profile = await db.Profiles.FirstOrDefaultAsync(p => p.UserId == userId, ct);
        var experience = await db.WorkExperiences.Where(w => w.UserId == userId).NewestFirst().ToListAsync(ct);
        var education = await db.Educations.Where(e => e.UserId == userId).NewestFirst().ToListAsync(ct);

        // Only Visible projects, and only their Confirmed skills. Pending, Hidden, Suggested and Rejected never appear,
        // so a skill cannot leak into the CV through a project the user chose not to show.
        var projects = await db.Projects
            .Where(p => p.UserId == userId && p.Status == ProjectStatus.Visible)
            .OrderBy(p => p.DisplayOrder)
            .Select(p => new
            {
                Title = p.TitleOverride ?? p.GithubRepo!.Name,
                Description = p.DescriptionOverride ?? p.GithubRepo!.Description,
                Url = p.GithubRepo!.HtmlUrl,
                Skills = p.Skills.Where(ps => ps.Status == LinkStatus.Confirmed).OrderBy(ps => ps.Skill!.Name).Select(ps => ps.Skill!.Name),
            })
            .ToListAsync(ct);

        // Same ordering as the public matrix: most-used skills first.
        var skills = SkillMatrix.Build(projects.Select(p => (p.Title, p.Skills))).Select(m => m.Name).ToList();

        var name = string.IsNullOrWhiteSpace(profile?.FullName) ? user.GithubLogin : profile!.FullName;
        return new CvModel(
            name, profile?.Headline ?? "", profile?.Summary ?? "",
            profile?.Email ?? "", profile?.Location ?? "",
            $"github.com/{user.GithubLogin}",
            skills,
            experience.Select(w => new CvExperience(w.Title, w.Company, w.StartDate, w.EndDate, w.Description)).ToList(),
            education.Select(e => new CvEducation(e.Institution, e.Degree, e.StartDate, e.EndDate)).ToList(),
            projects.Take(MaxProjects).Select(p => new CvProject(p.Title, p.Description, p.Url, p.Skills.ToList())).ToList());
    }
}
