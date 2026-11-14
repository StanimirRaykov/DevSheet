namespace DevSheet.Application.Skills;

public record SkillSeed(string Name, params string[] Aliases);

/// <summary>
/// Canonical skill list with aliases. The skill's own name is always an alias too.
/// GitHub language names (e.g. "Dockerfile", "PLpgSQL", "TSQL") are included as aliases.
/// </summary>
public static class SkillCatalog
{
    public static readonly IReadOnlyList<SkillSeed> Entries =
    [
        // Languages
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
        // Data
        new("PostgreSQL", "postgres", "plpgsql"),
        new("SQL Server", "mssql", "tsql", "t-sql"),
        new("MongoDB", "mongo"),
        new("Redis"),
        // Frameworks and platforms (aliases are used by manifest detection later)
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
        // Tools
        new("Docker", "dockerfile"),
        new("Kubernetes", "k8s"),
        new("Git"),
        new("GitHub Actions"),
    ];

    public static string Normalize(string value) => value.Trim().ToLowerInvariant();
}
