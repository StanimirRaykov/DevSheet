using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using DevSheet.Domain.Entities;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;

namespace DevSheet.Tests;

public class AccountSettingsApiTests(WebApplicationFactory<Program> factory) : IClassFixture<WebApplicationFactory<Program>>, IDisposable
{
    private readonly ApiHost _api = new(factory);

    private async Task<User> NewUser(string slug)
    {
        using var db = _api.Db();
        var user = new User { DisplayName = "Ana", Slug = slug, Email = "ana@example.com" };
        user.Logins.Add(new ExternalLogin { UserId = user.Id, Provider = LoginProviders.GitHub, ProviderKey = "gh-" + slug });
        db.Users.Add(user);
        await db.SaveChangesAsync();
        return user;
    }

    /// <summary>A user with one row of everything an account can own.</summary>
    private async Task<User> UserWithEverything(string slug, Skill skill)
    {
        using var db = _api.Db();
        var user = new User { DisplayName = slug, Slug = slug };
        user.Logins.Add(new ExternalLogin { UserId = user.Id, Provider = LoginProviders.Google, ProviderKey = "g-" + slug });
        user.GithubConnection = new GithubConnection { UserId = user.Id, GithubId = Random.Shared.NextInt64(1, long.MaxValue), Login = slug, EncryptedToken = "enc" };
        user.Profile = new Profile { UserId = user.Id, FullName = slug };
        var repo = new GithubRepo { UserId = user.Id, GithubRepoId = Random.Shared.NextInt64(1, long.MaxValue), Name = "repo", HtmlUrl = "https://github.com/x/repo" };
        user.Repos.Add(repo);
        var project = new Project { UserId = user.Id, GithubRepo = repo };
        user.Projects.Add(project);
        user.WorkExperiences.Add(new WorkExperience { UserId = user.Id, Company = "Acme", Title = "Dev", StartDate = new DateOnly(2020, 1, 1) });
        user.Educations.Add(new Education { UserId = user.Id, Institution = "TU", Degree = "BSc" });
        user.Languages.Add(new Language { UserId = user.Id, Name = "English" });
        user.Certifications.Add(new Certification { UserId = user.Id, Name = "Cert", Issuer = "Org" });
        db.Users.Add(user);
        db.ProjectSkills.Add(new ProjectSkill { ProjectId = project.Id, SkillId = skill.Id, Status = LinkStatus.Confirmed });
        await db.SaveChangesAsync();
        return user;
    }

    private static async Task<JsonElement> Json(HttpResponseMessage response) =>
        JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement;

    // ---- account ----

    [Fact]
    public async Task Account_can_be_read_and_changed()
    {
        var user = await NewUser("ana-acc");
        var client = _api.Client(user.Id);

        var response = await client.PatchAsJsonAsync("/api/me/account", new { displayName = "  Ana Petrova ", email = "ana.p@example.com" });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var account = await Json(await client.GetAsync("/api/me/account"));
        Assert.Equal("Ana Petrova", account.GetProperty("displayName").GetString());
        Assert.Equal("ana.p@example.com", account.GetProperty("email").GetString());
    }

    [Fact]
    public async Task Leaving_a_field_out_keeps_it_and_an_empty_email_removes_it()
    {
        var user = await NewUser("ana-keep");
        var client = _api.Client(user.Id);

        await client.PatchAsJsonAsync("/api/me/account", new { email = "" });

        var account = await Json(await client.GetAsync("/api/me/account"));
        Assert.Equal("Ana", account.GetProperty("displayName").GetString());
        Assert.Equal(JsonValueKind.Null, account.GetProperty("email").ValueKind);
    }

    [Theory]
    [InlineData("", null, "displayName")]
    [InlineData("   ", null, "displayName")]
    [InlineData(null, "not-an-email", "email")]
    [InlineData(null, "ana@", "email")]
    public async Task Invalid_account_changes_are_400_with_the_field_and_change_nothing(string? name, string? email, string field)
    {
        var user = await NewUser("ana-bad-" + field.ToLowerInvariant() + (name?.Length ?? 0) + (email?.Length ?? 0));
        var client = _api.Client(user.Id);

        var response = await client.PatchAsJsonAsync("/api/me/account", new { displayName = name, email });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.True((await Json(response)).GetProperty("errors").TryGetProperty(field, out _));
        Assert.Equal("Ana", (await Json(await client.GetAsync("/api/me/account"))).GetProperty("displayName").GetString());
    }

    [Fact]
    public async Task A_display_name_longer_than_80_characters_is_rejected()
    {
        var user = await NewUser("ana-long");
        var response = await _api.Client(user.Id).PatchAsJsonAsync("/api/me/account", new { displayName = new string('a', 81) });
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    // ---- slug ----

    [Theory]
    [InlineData("settings", "Reserved")]
    [InlineData("demo", "Reserved")]
    [InlineData("ab", "Invalid")]
    [InlineData("-ana", "Invalid")]
    [InlineData("ana_p", "Invalid")]
    [InlineData("taken-one", "Taken")]
    [InlineData("free-one", "Available")]
    [InlineData("  Free-One ", "Available")] // trimmed and lowercased
    [InlineData("ana-slug", "Current")]
    public async Task Slug_availability(string slug, string status)
    {
        await NewUser("taken-one");
        var user = await NewUser("ana-slug");

        var check = await Json(await _api.Client(user.Id).GetAsync($"/api/me/slug-available?slug={Uri.EscapeDataString(slug)}"));

        Assert.Equal(status, check.GetProperty("status").GetString());
        Assert.Equal(status is "Available" or "Current", check.GetProperty("available").GetBoolean());
    }

    [Fact]
    public async Task Changing_the_slug_moves_the_public_page_and_frees_the_old_address()
    {
        var user = await NewUser("old-address");
        using (var db = _api.Db()) { (await db.Users.FirstAsync(u => u.Id == user.Id)).IsPublished = true; await db.SaveChangesAsync(); }

        var response = await _api.Client(user.Id).PatchAsJsonAsync("/api/me/slug", new { slug = "New-Address" });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("new-address", (await Json(response)).GetProperty("slug").GetString());
        Assert.Equal(HttpStatusCode.OK, (await _api.Client().GetAsync("/api/public/new-address")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await _api.Client().GetAsync("/api/public/old-address")).StatusCode);
        var other = await NewUser("someone");
        Assert.True((await Json(await _api.Client(other.Id).GetAsync("/api/me/slug-available?slug=old-address"))).GetProperty("available").GetBoolean());
    }

    [Theory]
    [InlineData("taken-two", HttpStatusCode.Conflict)]
    [InlineData("login", HttpStatusCode.BadRequest)]
    [InlineData("no spaces", HttpStatusCode.BadRequest)]
    public async Task Changing_to_an_unusable_slug_is_refused_and_keeps_the_old_one(string slug, HttpStatusCode expected)
    {
        await NewUser("taken-two");
        var user = await NewUser("keeps-mine");

        var response = await _api.Client(user.Id).PatchAsJsonAsync("/api/me/slug", new { slug });

        Assert.Equal(expected, response.StatusCode);
        Assert.False(string.IsNullOrEmpty((await Json(response)).GetProperty("message").GetString()));
        using var db = _api.Db();
        Assert.Equal("keeps-mine", (await db.Users.FirstAsync(u => u.Id == user.Id)).Slug);
    }

    // ---- public page ----

    [Fact]
    public async Task Public_page_settings_publish_and_show_email_location_and_phone()
    {
        var user = await NewUser("ana-page");
        var client = _api.Client(user.Id);

        var before = await Json(await client.GetAsync("/api/me/public-page"));
        Assert.False(before.GetProperty("isPublished").GetBoolean());
        Assert.False(before.GetProperty("showEmail").GetBoolean());

        await client.PatchAsJsonAsync("/api/me/public-page", new { isPublished = true, showEmail = true });
        await client.PatchAsJsonAsync("/api/me/public-page", new { showLocation = true }); // leaves the others alone
        Assert.False((await Json(await client.GetAsync("/api/me/public-page"))).GetProperty("showPhone").GetBoolean());
        await client.PatchAsJsonAsync("/api/me/public-page", new { showPhone = true });

        var after = await Json(await client.GetAsync("/api/me/public-page"));
        Assert.Equal("ana-page", after.GetProperty("slug").GetString());
        Assert.True(after.GetProperty("isPublished").GetBoolean());
        Assert.True(after.GetProperty("showEmail").GetBoolean());
        Assert.True(after.GetProperty("showLocation").GetBoolean());
        Assert.True(after.GetProperty("showPhone").GetBoolean());
    }

    // ---- delete ----

    [Fact]
    public async Task Deleting_the_account_removes_every_row_it_owns_and_nothing_of_another_user()
    {
        Skill skill;
        using (var db = _api.Db()) { skill = new Skill { Name = "Rust-" + Guid.NewGuid() }; db.Skills.Add(skill); await db.SaveChangesAsync(); }
        var gone = await UserWithEverything("gone-user", skill);
        var kept = await UserWithEverything("kept-user", skill);

        var response = await _api.Client(gone.Id).DeleteAsync("/api/me");

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        Assert.Contains(response.Headers.GetValues("Set-Cookie"), c => c.StartsWith("devsheet.auth=;"));
        using var check = _api.Db();
        foreach (var (id, expected) in new[] { (gone.Id, 0), (kept.Id, 1) })
        {
            Assert.Equal(expected, await check.Users.CountAsync(u => u.Id == id));
            Assert.Equal(expected, await check.ExternalLogins.CountAsync(x => x.UserId == id));
            Assert.Equal(expected, await check.GithubConnections.CountAsync(x => x.UserId == id));
            Assert.Equal(expected, await check.Profiles.CountAsync(x => x.UserId == id));
            Assert.Equal(expected, await check.GithubRepos.CountAsync(x => x.UserId == id));
            Assert.Equal(expected, await check.Projects.CountAsync(x => x.UserId == id));
            Assert.Equal(expected, await check.ProjectSkills.CountAsync(x => x.Project!.UserId == id));
            Assert.Equal(expected, await check.WorkExperiences.CountAsync(x => x.UserId == id));
            Assert.Equal(expected, await check.Educations.CountAsync(x => x.UserId == id));
            Assert.Equal(expected, await check.Languages.CountAsync(x => x.UserId == id));
            Assert.Equal(expected, await check.Certifications.CountAsync(x => x.UserId == id));
        }
        Assert.True(await check.Skills.AnyAsync(s => s.Id == skill.Id)); // the shared skill catalogue stays
        Assert.Equal(0, await check.ProjectSkills.CountAsync(x => x.Project == null)); // nothing left dangling
    }

    [Fact]
    public async Task A_deleted_account_can_sign_up_again_as_a_new_account_and_its_slug_is_free()
    {
        var user = await NewUser("comes-back");
        await _api.Client(user.Id).DeleteAsync("/api/me");

        var other = await NewUser("someone-else");
        Assert.True((await Json(await _api.Client(other.Id).GetAsync("/api/me/slug-available?slug=comes-back"))).GetProperty("available").GetBoolean());
    }

    // ---- auth ----

    [Theory]
    [InlineData("GET", "/api/me/account")]
    [InlineData("PATCH", "/api/me/account")]
    [InlineData("GET", "/api/me/slug-available?slug=abc")]
    [InlineData("PATCH", "/api/me/slug")]
    [InlineData("GET", "/api/me/public-page")]
    [InlineData("PATCH", "/api/me/public-page")]
    [InlineData("DELETE", "/api/me")]
    public async Task Anonymous_calls_are_401(string method, string url)
    {
        var request = new HttpRequestMessage(new HttpMethod(method), url);
        if (method == "PATCH") request.Content = JsonContent.Create(new { });
        Assert.Equal(HttpStatusCode.Unauthorized, (await _api.Client().SendAsync(request)).StatusCode);
    }

    public void Dispose() => _api.Dispose();
}
