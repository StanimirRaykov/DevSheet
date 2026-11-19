using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.Extensions.Logging;

namespace DevSheet.Infrastructure.Persistence;

/// <summary>
/// Brings the database up to date: applies pending EF Core migrations, then seeds the skill catalogue.
/// Development runs this at startup; production runs it as an explicit step (`DevSheet.Api --migrate`).
/// </summary>
public static class DatabaseMigrator
{
    /// <summary>The first migration. Its tables are exactly what EnsureCreated() made before issue #13.</summary>
    public const string InitialMigrationId = "20261119140115_InitialCreate";

    public static async Task MigrateAsync(AppDbContext db, ILogger logger, CancellationToken ct = default)
    {
        await BaselineEnsureCreatedDatabaseAsync(db, logger, ct);
        await db.Database.MigrateAsync(ct);
        await SkillSeeder.SeedAsync(db, ct);
    }

    /// <summary>
    /// Local databases made with EnsureCreated() (before #13) already have the tables but no migration history,
    /// so MigrateAsync would fail with "relation already exists". Record InitialCreate as applied for them,
    /// keeping their data. Does nothing for an empty database or one that already has history.
    /// </summary>
    private static async Task BaselineEnsureCreatedDatabaseAsync(AppDbContext db, ILogger logger, CancellationToken ct)
    {
        if (!db.Database.IsNpgsql()) return;
        if (!await db.Database.CanConnectAsync(ct)) return; // the database does not exist yet; MigrateAsync creates it

        var history = db.GetService<IHistoryRepository>();
        if (await history.ExistsAsync(ct)) return;

        var usersTableExists = await db.Database
            .SqlQueryRaw<bool>("""SELECT to_regclass('public."Users"') IS NOT NULL AS "Value" """)
            .SingleAsync(ct);
        if (!usersTableExists) return;

        logger.LogWarning("Database was created with EnsureCreated(); recording {Migration} as applied.", InitialMigrationId);
        await db.Database.ExecuteSqlRawAsync(history.GetCreateIfNotExistsScript(), ct);
        await db.Database.ExecuteSqlRawAsync(
            history.GetInsertScript(new HistoryRow(InitialMigrationId, ProductInfo.GetVersion())), ct);
    }
}
