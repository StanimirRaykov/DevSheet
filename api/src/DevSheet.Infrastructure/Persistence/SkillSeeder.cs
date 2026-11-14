using DevSheet.Application.Skills;
using DevSheet.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace DevSheet.Infrastructure.Persistence;

public static class SkillSeeder
{
    /// <summary>Idempotent: inserts missing skills and aliases, never changes or removes existing rows.</summary>
    public static async Task SeedAsync(AppDbContext db, CancellationToken ct = default)
    {
        var skills = await db.Skills.ToDictionaryAsync(s => s.Name.ToLowerInvariant(), ct);
        var aliases = (await db.SkillAliases.Select(a => a.Alias).ToListAsync(ct)).ToHashSet();

        foreach (var entry in SkillCatalog.Entries)
        {
            var key = entry.Name.ToLowerInvariant();
            if (!skills.TryGetValue(key, out var skill))
            {
                skill = new Skill { Name = entry.Name };
                db.Skills.Add(skill);
                skills[key] = skill;
            }
            foreach (var alias in entry.Aliases.Append(entry.Name).Select(SkillCatalog.Normalize))
            {
                if (!aliases.Add(alias)) continue;
                db.SkillAliases.Add(new SkillAlias { SkillId = skill.Id, Alias = alias });
            }
        }
        await db.SaveChangesAsync(ct);
    }
}
