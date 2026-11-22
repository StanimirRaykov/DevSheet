using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DevSheet.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class OnboardingStep : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "OnboardingStep",
                table: "Users",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            // Accounts made before the welcome flow existed are already set up: do not send them through it.
            migrationBuilder.Sql(
                "UPDATE \"Users\" SET \"OnboardingCompletedAt\" = CURRENT_TIMESTAMP, \"OnboardingStep\" = 4 WHERE \"OnboardingCompletedAt\" IS NULL;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "OnboardingStep",
                table: "Users");
        }
    }
}
