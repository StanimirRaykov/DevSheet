namespace DevSheet.Application.Skills;

public record SkillSeed(string Name, params string[] Aliases);

/// <summary>Headings for the public skills matrix. Skills added by hand that are not in the catalog fall under Other.</summary>
public static class SkillCategories
{
    public const string Languages = "Languages", Data = "Databases", Frameworks = "Frameworks and platforms", Tools = "Tools", Other = "Other";

    /// <summary>The order the public page shows them in.</summary>
    public static readonly IReadOnlyList<string> Order = [Languages, Frameworks, Data, Tools, Other];
}

/// <summary>
/// Canonical skill list with aliases. The skill's own name is always an alias too.
/// GitHub language names (e.g. "Dockerfile", "PLpgSQL", "TSQL") are included as aliases.
/// </summary>
public static class SkillCatalog
{
    private static readonly SkillSeed[] Languages =
    [
        new("C#", "csharp"),
        new("TypeScript", "ts"),
        new("JavaScript", "js"),
        new("Python"),
        new("Java"),
        new("Go", "golang"),
        new("Rust"),
        new("C++", "cpp"),
        new("C"),
        new("Kotlin"),
        new("Swift"),
        new("PHP"),
        new("Ruby"),
        new("Dart"),
        new("Scala"),
        new("SQL"),
        new("HTML"),
        new("CSS", "scss", "sass", "less"),
        new("Shell", "bash", "zsh"),
        new("PowerShell"),
    ];

    private static readonly SkillSeed[] Data =
    [
        new("PostgreSQL", "postgres", "plpgsql"),
        new("SQL Server", "mssql", "tsql", "t-sql"),
        new("MongoDB", "mongo"),
        new("Redis"),
    ];

    // Aliases are used by manifest detection.
    private static readonly SkillSeed[] Frameworks =
    [
        new("React", "react.js", "reactjs"),
        new("Next.js", "nextjs"),
        new("Vue", "vue.js", "vuejs"),
        new("Angular", "angularjs"),
        new("Node.js", "nodejs", "node"),
        new("Express", "express.js", "expressjs"),
        new("ASP.NET Core", "aspnetcore", ".net core", "asp.net"),
        new("Entity Framework Core", "ef core", "efcore", "entity framework"),
        new("Django"),
        new("Flask"),
        new("Spring Boot", "springboot"),
        new("Tailwind CSS", "tailwind", "tailwindcss"),
    ];

    private static readonly SkillSeed[] Tools =
    [
        new("Docker", "dockerfile"),
        new("Kubernetes", "k8s"),
        new("Git"),
        new("GitHub Actions"),
    ];

    public static readonly IReadOnlyList<SkillSeed> Entries = [.. Languages, .. Data, .. Frameworks, .. Tools];

    private static readonly Dictionary<string, string> Categories = new[]
        {
            (Languages, SkillCategories.Languages), (Data, SkillCategories.Data),
            (Frameworks, SkillCategories.Frameworks), (Tools, SkillCategories.Tools),
        }
        .SelectMany(g => g.Item1.Select(seed => (seed.Name, Category: g.Item2)))
        .ToDictionary(x => x.Name, x => x.Category, StringComparer.OrdinalIgnoreCase);

    /// <summary>The catalog category of a skill name, or Other for skills added by hand.</summary>
    public static string CategoryOf(string skill) => Categories.GetValueOrDefault(skill.Trim(), SkillCategories.Other);

    public static string Normalize(string value) => value.Trim().ToLowerInvariant();
}
