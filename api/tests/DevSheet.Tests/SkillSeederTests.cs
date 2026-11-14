using DevSheet.Application.Skills;
using Microsoft.EntityFrameworkCore;

namespace DevSheet.Tests;

public class SkillSeederTests
{
    [Fact]
    public void Catalog_has_no_duplicate_names_or_aliases()
    {
        var names = SkillCatalog.Entries.Select(e => e.Name.ToLowerInvariant()).ToList();
        Assert.Equal(names.Count, names.Distinct().Count());

        var aliases = SkillCatalog.Entries
            .SelectMany(e => e.Aliases.Append(e.Name)).Select(SkillCatalog.Normalize).ToList();
        Assert.Equal(aliases.Count, aliases.Distinct().Count());
    }

    [Fact]
    public async Task Seeding_twice_creates_no_duplicates()
    {
        using var t = new TestDb();
        t.SeedSkills();
        var skills = await t.Db.Skills.CountAsync();
        var aliases = await t.Db.SkillAliases.CountAsync();

        t.SeedSkills();

        Assert.Equal(skills, await t.Db.Skills.CountAsync());
        Assert.Equal(aliases, await t.Db.SkillAliases.CountAsync());
        Assert.Equal(SkillCatalog.Entries.Count, skills);
    }

    [Fact]
    public async Task Github_language_names_resolve_to_skills()
    {
        using var t = new TestDb();
        t.SeedSkills();
        var aliases = await t.Db.SkillAliases.ToDictionaryAsync(a => a.Alias, a => a.SkillId);

        Assert.Equal(t.SkillId("Docker"), aliases["dockerfile"]);
        Assert.Equal(t.SkillId("PostgreSQL"), aliases["plpgsql"]);
        Assert.Equal(t.SkillId("SQL Server"), aliases["tsql"]);
        Assert.Equal(t.SkillId("C#"), aliases["c#"]);
    }
}
