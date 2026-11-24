using System.Text.Json;
using DevSheet.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace DevSheet.Infrastructure.Persistence;

/// <summary>
/// The public example page the landing page links to (/demo): a made-up developer, Ana Petrova, with the same
/// repositories and skills as the landing page's preview. All data is fictional; links go to example.com.
/// The account has no sign-in method and no GitHub connection, so nobody can sign in as it and sync never touches it.
/// "demo" is a reserved slug, so no real account can take the address.
/// </summary>
public static class DemoSeeder
{
    public const string Slug = "demo";

    /// <summary>Creates the demo account once. Does nothing if it exists (so manual edits are kept). Needs the skill catalogue.</summary>
    public static async Task SeedAsync(AppDbContext db, CancellationToken ct = default)
    {
        if (await db.Users.AnyAsync(u => u.Slug == Slug, ct)) return;

        var skills = await db.Skills.ToDictionaryAsync(s => s.Name, s => s.Id, ct);
        var user = new User { DisplayName = "Ana Petrova", Slug = Slug, IsPublished = true };
        db.Users.Add(user);

        db.Profiles.Add(new Profile
        {
            UserId = user.Id,
            FullName = "Ana Petrova",
            Headline = "Backend developer",
            Summary = "I build APIs and the tools around them. Recently: a double-entry ledger and a hiking map for Rhodope trails.",
            Location = "Plovdiv",
            CountryCode = "bg",
            ShowLocationPublicly = true,
            Email = "ana.petrova@example.com", // stays private: ShowEmailPublicly is false
        });

        var order = 0;
        void AddProject(long repoId, string name, string description, int stars, Dictionary<string, long> languages, params string[] skillNames)
        {
            var repo = new GithubRepo
            {
                UserId = user.Id, GithubRepoId = repoId, Name = name, Description = description,
                HtmlUrl = $"https://example.com/ana-petrova/{name}", Stars = stars,
                PushedAt = new DateTime(2026, 10, 1, 0, 0, 0, DateTimeKind.Utc).AddDays(-repoId * 9),
                LanguagesJson = JsonSerializer.Serialize(languages),
            };
            var project = new Project { UserId = user.Id, GithubRepoId = repo.Id, Status = ProjectStatus.Visible, DisplayOrder = order++ };
            foreach (var skill in skillNames)
                project.Skills.Add(new ProjectSkill { ProjectId = project.Id, SkillId = skills[skill], Status = LinkStatus.Confirmed });
            db.GithubRepos.Add(repo);
            db.Projects.Add(project);
        }

        AddProject(1, "ledger-api", "Double-entry bookkeeping API with idempotent payment imports.", 14,
            new() { ["C#"] = 48210, ["PLpgSQL"] = 3120 }, "C#", "PostgreSQL");
        AddProject(2, "trail-maps", "Offline-first hiking map for Rhodope trails, with elevation profiles.", 31,
            new() { ["TypeScript"] = 61940, ["CSS"] = 8820 }, "TypeScript", "React");
        AddProject(3, "pi-weather", "Raspberry Pi weather station that posts readings every ten minutes.", 6,
            new() { ["Python"] = 12480 }, "Python");

        db.WorkExperiences.Add(new WorkExperience
        {
            UserId = user.Id, Company = "Rila Freight", Title = "Backend developer",
            StartDate = new DateOnly(2024, 3, 1),
            Description = "Shipment tracking API in ASP.NET Core and PostgreSQL. Cut the nightly reconciliation job from 40 to 6 minutes.",
        });
        db.WorkExperiences.Add(new WorkExperience
        {
            UserId = user.Id, Company = "Maritsa Software", Title = "Junior developer",
            StartDate = new DateOnly(2022, 7, 1), EndDate = new DateOnly(2024, 2, 1),
            Description = "Internal tools in TypeScript and React; first on-call rotation.",
        });
        db.Educations.Add(new Education
        {
            UserId = user.Id, Institution = "Maritsa Technical College", Degree = "BSc Computer Systems",
            StartDate = new DateOnly(2018, 9, 1), EndDate = new DateOnly(2022, 6, 1),
        });
        db.Languages.Add(new Language { UserId = user.Id, Name = "Bulgarian", IsoCode = "bg", IsMotherTongue = true });
        db.Languages.Add(new Language
        {
            UserId = user.Id, Name = "English", IsoCode = "en",
            Listening = CefrLevel.C1, Reading = CefrLevel.C1, SpokenInteraction = CefrLevel.B2,
            SpokenProduction = CefrLevel.B2, Writing = CefrLevel.B2,
        });

        await db.SaveChangesAsync(ct);
    }
}
