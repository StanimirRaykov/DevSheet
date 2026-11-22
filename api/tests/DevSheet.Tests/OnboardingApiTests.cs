using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using DevSheet.Api;
using DevSheet.Domain.Entities;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;

namespace DevSheet.Tests;

public class SignInRedirectTests
{
    private const string Web = "http://localhost:3000";

    [Fact]
    public void A_new_account_goes_to_welcome_whatever_page_it_asked_for() =>
        Assert.Equal("http://localhost:3000/welcome", SignInRedirect.After(Web + "/dashboard/projects", Web, onboardingCompleted: false));

    [Fact]
    public void A_completed_account_goes_where_it_asked() =>
        Assert.Equal("http://localhost:3000/dashboard", SignInRedirect.After(Web + "/dashboard", Web, onboardingCompleted: true));
}

public class OnboardingApiTests(WebApplicationFactory<Program> factory) : IClassFixture<WebApplicationFactory<Program>>, IDisposable
{
    private readonly ApiHost _api = new(factory);

    private async Task<User> NewUser(string slug, bool github = false)
    {
        using var db = _api.Db();
        var user = new User { DisplayName = "Ana", Slug = slug };
        user.Logins.Add(new ExternalLogin { UserId = user.Id, Provider = LoginProviders.Google, ProviderKey = "g-" + slug });
        if (github)
            user.GithubConnection = new GithubConnection { UserId = user.Id, GithubId = Random.Shared.NextInt64(1, long.MaxValue), Login = "ana-gh", EncryptedToken = "enc" };
        db.Users.Add(user);
        await db.SaveChangesAsync();
        return user;
    }

    private static async Task<JsonElement> Json(HttpResponseMessage response) =>
        JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement;

    [Fact]
    public async Task A_new_account_starts_at_the_first_step()
    {
        var user = await NewUser("ob-new");

        var view = await Json(await _api.Client(user.Id).GetAsync("/api/me/onboarding"));

        Assert.Equal("About", view.GetProperty("step").GetString());
        Assert.Equal(JsonValueKind.Null, view.GetProperty("completedAt").ValueKind);
        Assert.Equal(JsonValueKind.Null, view.GetProperty("githubLogin").ValueKind);
    }

    [Fact]
    public async Task About_saves_name_and_headline_and_moves_on()
    {
        var user = await NewUser("ob-about");
        var client = _api.Client(user.Id);

        var response = await client.PutAsJsonAsync("/api/me/onboarding/about", new { displayName = " Ana Petrova ", headline = " Backend developer " });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var view = await Json(response);
        Assert.Equal("Github", view.GetProperty("step").GetString());
        Assert.Equal("Backend developer", view.GetProperty("headline").GetString());
        using var db = _api.Db();
        var saved = await db.Users.Include(u => u.Profile).SingleAsync(u => u.Id == user.Id);
        Assert.Equal("Ana Petrova", saved.DisplayName);
        Assert.Equal("Ana Petrova", saved.Profile!.FullName);
    }

    [Fact]
    public async Task About_needs_a_name()
    {
        var user = await NewUser("ob-noname");

        var response = await _api.Client(user.Id).PutAsJsonAsync("/api/me/onboarding/about", new { displayName = "  ", headline = "" });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.True((await Json(response)).GetProperty("errors").TryGetProperty("displayName", out _));
    }

    [Fact]
    public async Task The_step_on_screen_is_remembered()
    {
        var user = await NewUser("ob-step");
        var client = _api.Client(user.Id);

        Assert.Equal(HttpStatusCode.NoContent, (await client.PutAsJsonAsync("/api/me/onboarding/step", new { step = "Review" })).StatusCode);

        Assert.Equal("Review", (await Json(await client.GetAsync("/api/me/onboarding"))).GetProperty("step").GetString());
    }

    [Fact]
    public async Task The_github_login_is_shown_when_already_connected()
    {
        var user = await NewUser("ob-gh", github: true);

        var view = await Json(await _api.Client(user.Id).GetAsync("/api/me/onboarding"));

        Assert.Equal("ana-gh", view.GetProperty("githubLogin").GetString());
    }

    [Fact]
    public async Task Complete_sets_the_timestamp_once()
    {
        var user = await NewUser("ob-done");
        var client = _api.Client(user.Id);

        var first = await Json(await client.PostAsync("/api/me/onboarding/complete", null));
        var second = await client.PostAsync("/api/me/onboarding/complete", null);

        Assert.Equal(HttpStatusCode.OK, second.StatusCode);
        Assert.Equal(first.GetProperty("completedAt").GetDateTime(), (await Json(second)).GetProperty("completedAt").GetDateTime());
        using var db = _api.Db();
        var saved = await db.Users.SingleAsync(u => u.Id == user.Id);
        Assert.NotNull(saved.OnboardingCompletedAt);
        Assert.Equal(OnboardingStep.Done, saved.OnboardingStep);
    }

    [Theory]
    [InlineData("GET", "/api/me/onboarding")]
    [InlineData("PUT", "/api/me/onboarding/about")]
    [InlineData("PUT", "/api/me/onboarding/step")]
    [InlineData("POST", "/api/me/onboarding/complete")]
    public async Task Anonymous_requests_are_refused(string method, string path)
    {
        var request = new HttpRequestMessage(new HttpMethod(method), path) { Content = JsonContent.Create(new { }) };

        Assert.Equal(HttpStatusCode.Unauthorized, (await _api.Client().SendAsync(request)).StatusCode);
    }

    public void Dispose() => _api.Dispose();
}
