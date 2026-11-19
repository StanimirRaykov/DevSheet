using DevSheet.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;

namespace DevSheet.Tests;

/// <summary>
/// Fails when the EF Core model changes without a migration. Fix with (from the api/ folder):
///   dotnet ef migrations add &lt;Name&gt; --project src/DevSheet.Infrastructure --startup-project src/DevSheet.Api --output-dir Persistence/Migrations
/// CI also runs `dotnet ef migrations has-pending-model-changes`, which checks the same thing.
/// </summary>
public class MigrationTests
{
    private static AppDbContext Context() =>
        // The connection is never opened: only the model and the migrations are compared.
        new(new DbContextOptionsBuilder<AppDbContext>().UseNpgsql("Host=localhost;Database=model_only").Options);

    [Fact]
    public void Migrations_match_the_model()
    {
        using var db = Context();
        var snapshot = db.GetService<IMigrationsAssembly>().ModelSnapshot?.Model;
        Assert.NotNull(snapshot);

        if (snapshot is IMutableModel mutable) snapshot = mutable.FinalizeModel();
        snapshot = db.GetService<IModelRuntimeInitializer>().Initialize(snapshot);
        var current = db.GetService<IDesignTimeModel>().Model;

        var differences = db.GetService<IMigrationsModelDiffer>()
            .GetDifferences(snapshot.GetRelationalModel(), current.GetRelationalModel());
        Assert.Empty(differences);
    }

    [Fact]
    public void Initial_migration_id_is_the_first_migration()
    {
        using var db = Context();
        Assert.Equal(DatabaseMigrator.InitialMigrationId, db.Database.GetMigrations().First());
    }
}
