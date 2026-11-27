using System.Net;
using System.Web;
using AspNet.Security.OAuth.GitHub;
using DevSheet.Domain.Entities;
using Microsoft.AspNetCore.Authentication.Google;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;

namespace DevSheet.Tests;

public class AccountApiTests(WebApplicationFactory<Program> factory) : IClassFixture<WebApplicationFactory<Program>>, IDisposable
{
    private readonly ApiHost _api = new(factory);

    private async Task<User> UserWith(bool github = true, params string[] providers)
    {
        using var db = _api.Db();
        var user = new User { DisplayName = "Ana", Slug = "ana-" + Guid.NewGuid().ToString("N")[..8] };
        foreach (var p in providers) user.Logins.Add(new ExternalLogin { UserId = user.Id, Provider = p, ProviderKey = p + "-" + user.Id });
        if (github) user.GithubConnection = new GithubConnection { UserId = user.Id, GithubId = Random.Shared.NextInt64(1, long.MaxValue), Login = "ana", EncryptedToken = "enc" };
        db.Users.Add(user);
        await db.SaveChangesAsync();
        return user;
    }

    /// <summary>Where the API will send the browser after the provider, read back from the (encrypted) OAuth state.</summary>
    private string ReturnUrlOf(HttpResponseMessage challenge)
    {
        var state = HttpUtility.ParseQueryString(challenge.Headers.Location!.Query)["state"]!;
        var format = challenge.Headers.Location!.Host == "github.com"
            ? _api.Factory.Services.GetRequiredService<IOptionsMonitor<GitHubAuthenticationOptions>>()
                .Get(GitHubAuthenticationDefaults.AuthenticationScheme).StateDataFormat
            : _api.Factory.Services.GetRequiredService<IOptionsMonitor<GoogleOptions>>()
                .Get(GoogleDefaults.AuthenticationScheme).StateDataFormat;
        return format.Unprotect(state)!.RedirectUri!;
    }

    [Fact]
    public async Task Sync_without_a_github_connection_is_409_with_a_message()
    {
        var user = await UserWith(github: false, LoginProviders.Google);

        var response = await _api.Client(user.Id).PostAsync("/api/me/sync", null);

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        Assert.Contains("Connect GitHub", await response.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task Disconnecting_github_deletes_the_token_keeps_projects_and_then_sync_is_409()
    {
        var user = await UserWith(github: true, LoginProviders.Google);
        using (var db = _api.Db())
        {
            var repo = new GithubRepo { UserId = user.Id, GithubRepoId = 7, Name = "kept", HtmlUrl = "https://github.com/ana/kept" };
            db.GithubRepos.Add(repo);
            db.Projects.Add(new Project { UserId = user.Id, GithubRepoId = repo.Id, Status = ProjectStatus.Visible });
            await db.SaveChangesAsync();
        }
        var client = _api.Client(user.Id);

        Assert.Equal(HttpStatusCode.NoContent, (await client.PostAsync("/api/me/github/disconnect", null)).StatusCode);

        using (var db = _api.Db())
        {
            Assert.False(await db.GithubConnections.AnyAsync(c => c.UserId == user.Id));
            Assert.True((await db.GithubRepos.SingleAsync(r => r.UserId == user.Id)).SourceMissing);
            Assert.Equal(1, await db.Projects.CountAsync(p => p.UserId == user.Id));
        }
        Assert.Equal(HttpStatusCode.Conflict, (await client.PostAsync("/api/me/sync", null)).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await client.PostAsync("/api/me/github/disconnect", null)).StatusCode);
    }

    [Fact]
    public async Task Unlinking_the_last_sign_in_method_is_409()
    {
        var user = await UserWith(github: true, LoginProviders.Google);

        var response = await _api.Client(user.Id).DeleteAsync("/api/me/logins/google");

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        using var db = _api.Db();
        Assert.Equal(1, await db.ExternalLogins.CountAsync(l => l.UserId == user.Id));
    }

    [Fact]
    public async Task Unlinking_one_of_two_sign_in_methods_works_and_the_list_shows_the_rest()
    {
        var user = await UserWith(github: true, LoginProviders.Apple, LoginProviders.Google);
        var client = _api.Client(user.Id);

        Assert.Equal(HttpStatusCode.NoContent, (await client.DeleteAsync("/api/me/logins/Apple")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await client.DeleteAsync("/api/me/logins/apple")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await client.DeleteAsync("/api/me/logins/github")).StatusCode);

        var logins = await client.GetStringAsync("/api/me/logins");
        Assert.Contains("\"provider\":\"google\"", logins);
        Assert.DoesNotContain("apple", logins);
    }

    [Fact]
    public async Task Me_reports_the_github_connection_or_null()
    {
        var connected = await UserWith(github: true, LoginProviders.Google);
        var googleOnly = await UserWith(github: false, LoginProviders.Google);

        Assert.Contains("\"github\":{\"login\":\"ana\"", await _api.Client(connected.Id).GetStringAsync("/api/me"));
        Assert.Contains("\"github\":null", await _api.Client(googleOnly.Id).GetStringAsync("/api/me"));
    }

    [Theory]
    [InlineData("/auth/google?next=https://evil.com", "http://localhost:3000/dashboard")]
    [InlineData("/auth/google?next=//evil.com", "http://localhost:3000/dashboard")]
    [InlineData("/auth/google?next=/dashboard/projects", "http://localhost:3000/dashboard/projects")]
    public async Task Sign_in_only_returns_to_local_paths(string url, string expected)
    {
        var response = await _api.Client().GetAsync(url);

        Assert.Equal(HttpStatusCode.Found, response.StatusCode);
        Assert.Equal("accounts.google.com", response.Headers.Location!.Host);
        Assert.Equal(expected, ReturnUrlOf(response));
    }

    [Theory]
    [InlineData("/auth/link/google?next=https://evil.com", "http://localhost:3000/settings", "accounts.google.com")]
    [InlineData("/auth/github/connect?next=https://evil.com", "http://localhost:3000/settings", "github.com")]
    [InlineData("/auth/github/connect?next=/dashboard", "http://localhost:3000/dashboard", "github.com")]
    public async Task Link_and_connect_go_to_the_provider_and_only_return_to_local_paths(string url, string expected, string host)
    {
        var user = await UserWith(github: false);

        var response = await _api.Client(user.Id).GetAsync(url);

        Assert.Equal(host, response.Headers.Location!.Host);
        Assert.Equal(expected, ReturnUrlOf(response));
    }

    [Theory]
    [InlineData("/auth/link/google")]
    [InlineData("/auth/github/connect")]
    public async Task Link_and_connect_without_a_session_go_to_the_login_page(string url)
    {
        var response = await _api.Client().GetAsync(url);

        Assert.Equal(HttpStatusCode.Redirect, response.StatusCode);
        Assert.Equal("http://localhost:3000/login?next=%2Fsettings", response.Headers.Location!.ToString());
    }

    [Theory]
    [InlineData("/auth/myspace")]
    [InlineData("/auth/github")]
    [InlineData("/auth/GitHub?next=/dashboard")]
    public async Task Unknown_provider_and_github_sign_in_are_404(string url) =>
        Assert.Equal(HttpStatusCode.NotFound, (await _api.Client().GetAsync(url)).StatusCode);

    [Fact]
    public async Task GitHub_cannot_be_linked_as_a_sign_in_method()
    {
        var user = await UserWith(github: false, LoginProviders.Google);

        Assert.Equal(HttpStatusCode.NotFound, (await _api.Client(user.Id).GetAsync("/auth/link/github")).StatusCode);
    }

    public void Dispose() => _api.Dispose();
}
