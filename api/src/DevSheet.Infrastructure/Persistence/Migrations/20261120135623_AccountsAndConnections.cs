using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DevSheet.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AccountsAndConnections : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // 1. New columns and tables, next to the old columns.
            migrationBuilder.AddColumn<string>(name: "DisplayName", table: "Users", type: "text", nullable: false, defaultValue: "");
            migrationBuilder.AddColumn<string>(name: "Email", table: "Users", type: "text", nullable: true);
            migrationBuilder.AddColumn<string>(name: "AvatarUrl", table: "Users", type: "text", nullable: true);
            migrationBuilder.AddColumn<DateTime>(name: "CreatedAt", table: "Users", type: "timestamp with time zone", nullable: false,
                defaultValueSql: "now()");
            migrationBuilder.AddColumn<DateTime>(name: "OnboardingCompletedAt", table: "Users", type: "timestamp with time zone", nullable: true);

            migrationBuilder.CreateTable(
                name: "ExternalLogins",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    Provider = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    ProviderKey = table.Column<string>(type: "text", nullable: false),
                    Email = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ExternalLogins", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ExternalLogins_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "GithubConnections",
                columns: table => new
                {
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    GithubId = table.Column<long>(type: "bigint", nullable: false),
                    Login = table.Column<string>(type: "text", nullable: false),
                    EncryptedToken = table.Column<string>(type: "text", nullable: false),
                    ConnectedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    LastSyncedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_GithubConnections", x => x.UserId);
                    table.ForeignKey(
                        name: "FK_GithubConnections_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            // 2. Copy every existing (GitHub) account: a github sign-in, a GitHub connection, and a display name
            //    (the CV name if set, else the GitHub login).
            migrationBuilder.Sql("""
                INSERT INTO "ExternalLogins" ("Id", "UserId", "Provider", "ProviderKey", "Email", "CreatedAt")
                SELECT gen_random_uuid(), "Id", 'github', "GithubId"::text, NULL, now() FROM "Users";

                INSERT INTO "GithubConnections" ("UserId", "GithubId", "Login", "EncryptedToken", "ConnectedAt", "LastSyncedAt")
                SELECT "Id", "GithubId", "GithubLogin", "EncryptedGithubToken", now(), "LastSyncedAt"
                FROM "Users" WHERE "EncryptedGithubToken" IS NOT NULL;

                UPDATE "Users" AS u SET "DisplayName" = COALESCE(
                    (SELECT NULLIF(btrim(p."FullName"), '') FROM "Profiles" AS p WHERE p."UserId" = u."Id"),
                    u."GithubLogin");
                """);

            migrationBuilder.AlterColumn<DateTime>(name: "CreatedAt", table: "Users", type: "timestamp with time zone", nullable: false,
                oldClrType: typeof(DateTime), oldType: "timestamp with time zone", oldDefaultValueSql: "now()");
            migrationBuilder.AlterColumn<string>(name: "DisplayName", table: "Users", type: "text", nullable: false,
                oldClrType: typeof(string), oldType: "text", oldDefaultValue: "");

            // 3. Indexes, then drop the old GitHub columns from Users.
            migrationBuilder.CreateIndex(
                name: "IX_ExternalLogins_Provider_ProviderKey",
                table: "ExternalLogins",
                columns: new[] { "Provider", "ProviderKey" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ExternalLogins_UserId",
                table: "ExternalLogins",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_GithubConnections_GithubId",
                table: "GithubConnections",
                column: "GithubId",
                unique: true);

            migrationBuilder.DropIndex(name: "IX_Users_GithubId", table: "Users");
            migrationBuilder.DropColumn(name: "GithubId", table: "Users");
            migrationBuilder.DropColumn(name: "GithubLogin", table: "Users");
            migrationBuilder.DropColumn(name: "EncryptedGithubToken", table: "Users");
            migrationBuilder.DropColumn(name: "LastSyncedAt", table: "Users");
        }

        /// <inheritdoc />
        /// <remarks>
        /// Only accounts with a GitHub connection fit the old shape. Accounts without one (Google or Apple only)
        /// are deleted, with everything they own, because the old Users table cannot hold them.
        /// </remarks>
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<long>(name: "GithubId", table: "Users", type: "bigint", nullable: true);
            migrationBuilder.AddColumn<string>(name: "GithubLogin", table: "Users", type: "text", nullable: false, defaultValue: "");
            migrationBuilder.AddColumn<string>(name: "EncryptedGithubToken", table: "Users", type: "text", nullable: true);
            migrationBuilder.AddColumn<DateTime>(name: "LastSyncedAt", table: "Users", type: "timestamp with time zone", nullable: true);

            migrationBuilder.Sql("""
                UPDATE "Users" AS u
                SET "GithubId" = c."GithubId", "GithubLogin" = c."Login",
                    "EncryptedGithubToken" = c."EncryptedToken", "LastSyncedAt" = c."LastSyncedAt"
                FROM "GithubConnections" AS c WHERE c."UserId" = u."Id";

                DELETE FROM "Users" WHERE "GithubId" IS NULL;
                """);

            migrationBuilder.AlterColumn<long>(name: "GithubId", table: "Users", type: "bigint", nullable: false,
                oldClrType: typeof(long), oldType: "bigint", oldNullable: true);
            migrationBuilder.CreateIndex(name: "IX_Users_GithubId", table: "Users", column: "GithubId", unique: true);

            migrationBuilder.DropTable(name: "ExternalLogins");
            migrationBuilder.DropTable(name: "GithubConnections");
            migrationBuilder.DropColumn(name: "DisplayName", table: "Users");
            migrationBuilder.DropColumn(name: "Email", table: "Users");
            migrationBuilder.DropColumn(name: "AvatarUrl", table: "Users");
            migrationBuilder.DropColumn(name: "CreatedAt", table: "Users");
            migrationBuilder.DropColumn(name: "OnboardingCompletedAt", table: "Users");
        }
    }
}
