using DevSheet.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace DevSheet.Tests;

/// <summary>
/// docs/schema.sql is generated from the EF Core model (PostgreSQL provider). This test fails when the model
/// changes without the file being regenerated, so the documented schema cannot drift.
/// Regenerate with:  UPDATE_SCHEMA=1 dotnet test --filter SchemaScriptTests
/// </summary>
public class SchemaScriptTests
{
    private static string RepoRoot()
    {
        var dir = new DirectoryInfo(AppContext.BaseDirectory);
        while (dir is not null && !File.Exists(Path.Combine(dir.FullName, "docs", "DATABASE.md")) && !Directory.Exists(Path.Combine(dir.FullName, ".git")))
            dir = dir.Parent;
        return dir?.FullName ?? throw new InvalidOperationException("Repo root not found");
    }

    private static string Generate()
    {
        // The connection is never opened: the script is built from the model alone.
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseNpgsql("Host=localhost;Database=schema_only").Options;
        using var db = new AppDbContext(options);
        return db.Database.GenerateCreateScript().Replace("\r\n", "\n").TrimEnd() + "\n";
    }

    [Fact]
    public void Committed_schema_matches_the_ef_model()
    {
        var path = Path.Combine(RepoRoot(), "docs", "schema.sql");
        var header = "-- DevSheet database schema (PostgreSQL)\n" +
                     "-- GENERATED from the EF Core model. Do not edit by hand.\n" +
                     "-- Regenerate: UPDATE_SCHEMA=1 dotnet test --filter SchemaScriptTests (from the api/ folder)\n\n";
        var expected = header + Generate();

        if (Environment.GetEnvironmentVariable("UPDATE_SCHEMA") == "1")
            File.WriteAllText(path, expected);

        Assert.True(File.Exists(path), "docs/schema.sql is missing. Run with UPDATE_SCHEMA=1 to create it.");
        Assert.Equal(expected, File.ReadAllText(path).Replace("\r\n", "\n"));
    }
}
