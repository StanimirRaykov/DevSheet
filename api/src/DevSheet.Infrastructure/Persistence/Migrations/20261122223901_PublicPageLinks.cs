using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DevSheet.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class PublicPageLinks : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "AllowPublicCvDownload",
                table: "Profiles",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "Website",
                table: "Profiles",
                type: "text",
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AllowPublicCvDownload",
                table: "Profiles");

            migrationBuilder.DropColumn(
                name: "Website",
                table: "Profiles");
        }
    }
}
