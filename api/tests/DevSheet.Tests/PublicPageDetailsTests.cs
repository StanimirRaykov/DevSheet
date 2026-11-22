using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using DevSheet.Api.Controllers;
using DevSheet.Application.Career;
using DevSheet.Application.Skills;
using DevSheet.Domain.Entities;
using DevSheet.Infrastructure.Career;
using DevSheet.Infrastructure.Cv;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Testing;

namespace DevSheet.Tests;

/// <summary>What the redesigned public page needs: links, languages, certifications, skill groups, CV download.</summary>
public class PublicPageDetailsTests
{
    private static JsonElement Get(TestDb t, string slug)
    {
        var ok = Assert.IsType<OkObjectResult>(new PublicController(t.Db, new CvDataService(t.Db)).Get(slug).GetAwaiter().GetResult());
        return JsonSerializer.SerializeToElement(ok.Value, new JsonSerializerOptions(JsonSerializerDefaults.Web));
    }

    private static ProfileInput Profile(bool showEmail = false, bool showLocation = false, string? website = null) =>
        new("Ana Petrova", "Backend dev", "Hello", "Sofia", "ana@example.com", showEmail, showLocation, website);

    [Fact]
    public void Website_and_avatar_are_public_and_an_empty_location_is_null()
    {
        using var t = new TestDb();
        var u = t.AddUser("ana", published: true);
        u.AvatarUrl = "https://example.com/ana.png";
        t.Db.SaveChanges();
        new CareerService(t.Db).UpsertProfileAsync(u.Id,
            new ProfileInput("Ana", "", "", "", "", false, ShowLocationPublicly: true, Website: "https://ana.dev")).GetAwaiter().GetResult();

        var json = Get(t, "ana");

        Assert.Equal("https://example.com/ana.png", json.GetProperty("avatarUrl").GetString());
        Assert.Equal("https://ana.dev", json.GetProperty("profile").GetProperty("website").GetString());
        Assert.Equal(JsonValueKind.Null, json.GetProperty("profile").GetProperty("location").ValueKind);
    }

    [Fact]
    public void Languages_and_certifications_are_listed()
    {
        using var t = new TestDb();
        var u = t.AddUser("bea", published: true);
        t.Db.Languages.Add(new Language { UserId = u.Id, Name = "Bulgarian", IsMotherTongue = true });
        t.Db.Languages.Add(new Language { UserId = u.Id, Name = "English", Listening = CefrLevel.C1, Writing = CefrLevel.B2 });
        t.Db.Certifications.Add(new Certification { UserId = u.Id, Name = "Azure Developer", Issuer = "Microsoft", IssueDate = new DateOnly(2024, 5, 1) });
        t.Db.SaveChanges();

        var json = Get(t, "bea");

        var languages = json.GetProperty("languages");
        Assert.Equal(2, languages.GetArrayLength());
        Assert.Contains(languages.EnumerateArray(), l => l.GetProperty("name").GetString() == "English" && l.GetProperty("listening").GetInt32() == 5);
        Assert.Equal("Azure Developer", json.GetProperty("certifications")[0].GetProperty("name").GetString());
    }

    [Fact]
    public async Task Skills_carry_their_catalog_category()
    {
        using var t = new TestDb();
        t.SeedSkills();
        var u = t.AddUser("cat", published: true);
        var project = t.AddProjectFor(u, "api");
        var skills = new DevSheet.Infrastructure.Skills.ProjectSkillService(t.Db);
        await skills.AddManualAsync(u.Id, project.Id, "C#");
        await skills.AddManualAsync(u.Id, project.Id, "Docker");

        var categories = Get(t, "cat").GetProperty("skills").EnumerateArray()
            .ToDictionary(s => s.GetProperty("name").GetString()!, s => s.GetProperty("category").GetString());

        Assert.Equal(SkillCategories.Languages, categories["C#"]);
        Assert.Equal(SkillCategories.Tools, categories["Docker"]);
    }

    [Theory]
    [InlineData("C#", SkillCategories.Languages)]
    [InlineData("postgresql", SkillCategories.Data)]
    [InlineData("Next.js", SkillCategories.Frameworks)]
    [InlineData("Terraform", SkillCategories.Other)] // added by hand, not in the catalog
    public void Category_comes_from_the_catalog(string skill, string category) =>
        Assert.Equal(category, SkillCatalog.CategoryOf(skill));

    [Theory]
    [InlineData("ana.dev")]
    [InlineData("ftp://ana.dev")]
    public void Website_must_be_a_full_web_address(string website) =>
        Assert.True(CareerValidator.Validate(Profile(website: website)).ContainsKey("website"));

    [Fact]
    public void An_empty_website_is_fine() =>
        Assert.False(CareerValidator.Validate(Profile(website: "")).ContainsKey("website"));

    [Fact]
    public async Task The_visitor_cv_keeps_email_and_location_private_unless_shown()
    {
        using var t = new TestDb();
        var u = t.AddUser("dan", published: true);
        await new CareerService(t.Db).UpsertProfileAsync(u.Id, Profile(showEmail: true, showLocation: false));

        var visitor = await new CvDataService(t.Db).BuildAsync(u.Id, forVisitor: true);
        var owner = await new CvDataService(t.Db).BuildAsync(u.Id);

        Assert.Equal("ana@example.com", visitor!.Email);
        Assert.Equal("", visitor.Location);
        Assert.Equal("Sofia", owner!.Location);
    }
}

public class PublicCvDownloadTests(WebApplicationFactory<Program> factory) : IClassFixture<WebApplicationFactory<Program>>, IDisposable
{
    private readonly ApiHost _api = new(factory);

    private async Task<User> NewUser(string slug, bool published, bool allowCv)
    {
        using var db = _api.Db();
        var user = new User { DisplayName = "Ana", Slug = slug, IsPublished = published };
        user.Profile = new Profile { UserId = user.Id, FullName = "Ana Petrova", AllowPublicCvDownload = allowCv };
        db.Users.Add(user);
        await db.SaveChangesAsync();
        return user;
    }

    [Fact]
    public async Task Off_by_default_the_page_offers_no_cv_and_the_download_is_refused()
    {
        await NewUser("cv-off", published: true, allowCv: false);
        var client = _api.Client();

        var page = await client.GetFromJsonAsync<JsonElement>("/api/public/cv-off");
        Assert.False(page.GetProperty("cvDownload").GetBoolean());
        Assert.Equal(HttpStatusCode.NotFound, (await client.GetAsync("/api/public/cv-off/cv.pdf")).StatusCode);
    }

    [Fact]
    public async Task When_allowed_anyone_can_download_the_cv()
    {
        await NewUser("cv-on", published: true, allowCv: true);

        var response = await _api.Client().GetAsync("/api/public/cv-on/cv.pdf");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("application/pdf", response.Content.Headers.ContentType!.MediaType);
        Assert.Equal("cv-on-cv.pdf", response.Content.Headers.ContentDisposition!.FileName);
    }

    [Fact]
    public async Task An_unpublished_page_refuses_the_download_even_when_allowed()
    {
        await NewUser("cv-hidden", published: false, allowCv: true);

        Assert.Equal(HttpStatusCode.NotFound, (await _api.Client().GetAsync("/api/public/cv-hidden/cv.pdf")).StatusCode);
    }

    [Fact]
    public async Task The_owner_switches_it_on_in_public_page_settings()
    {
        var user = await NewUser("cv-switch", published: true, allowCv: false);
        var client = _api.Client(user.Id);

        var response = await client.PatchAsJsonAsync("/api/me/public-page", new { allowCvDownload = true });

        Assert.True((await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("allowCvDownload").GetBoolean());
        Assert.Equal(HttpStatusCode.OK, (await _api.Client().GetAsync("/api/public/cv-switch/cv.pdf")).StatusCode);
    }

    public void Dispose() => _api.Dispose();
}
