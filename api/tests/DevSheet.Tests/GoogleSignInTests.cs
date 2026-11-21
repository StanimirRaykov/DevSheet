using System.Net;
using System.Text;
using System.Web;
using DevSheet.Domain.Entities;
using Microsoft.AspNetCore.Authentication.Google;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace DevSheet.Tests;

/// <summary>
/// The whole Google round trip through the real API: /auth/google, then Google's redirect back to
/// /signin-google. Google's token and profile endpoints are answered by <see cref="FakeGoogle"/>.
/// </summary>
public class GoogleSignInTests(WebApplicationFactory<Program> factory) : IClassFixture<WebApplicationFactory<Program>>, IDisposable
{
    private readonly ApiHost _api = new(factory);

    private HttpClient Client() =>
        _api.Factory
            .WithWebHostBuilder(b => b.ConfigureTestServices(s =>
                s.PostConfigure<GoogleOptions>(GoogleDefaults.AuthenticationScheme, o => o.Backchannel = new HttpClient(new FakeGoogle()))))
            // https: the correlation cookie is Secure, and the cookie jar would not send it back over http.
            .CreateClient(new WebApplicationFactoryClientOptions { AllowAutoRedirect = false, BaseAddress = new Uri("https://localhost") });

    /// <summary>Starts sign-in and returns the state Google would send back (the correlation cookie stays in the client).</summary>
    private static async Task<string> StartAsync(HttpClient client, string next = "/dashboard")
    {
        var challenge = await client.GetAsync($"/auth/google?next={Uri.EscapeDataString(next)}");
        Assert.Equal(HttpStatusCode.Found, challenge.StatusCode);
        Assert.Equal("accounts.google.com", challenge.Headers.Location!.Host);
        return HttpUtility.ParseQueryString(challenge.Headers.Location.Query)["state"]!;
    }

    [Fact]
    public async Task Signing_in_with_google_creates_an_account_with_a_google_login_and_sets_the_cookie()
    {
        var client = Client();
        var state = await StartAsync(client, "/dashboard/projects");

        var callback = await client.GetAsync($"/signin-google?code=test-code&state={Uri.EscapeDataString(state)}");

        Assert.Equal(HttpStatusCode.Found, callback.StatusCode);
        Assert.Equal("http://localhost:3000/dashboard/projects", callback.Headers.Location!.ToString());
        Assert.Contains(callback.Headers.GetValues("Set-Cookie"), c => c.StartsWith("devsheet.auth="));

        using var db = _api.Db();
        var user = await db.Users.Include(u => u.Logins).Include(u => u.GithubConnection)
            .SingleAsync(u => u.Logins.Any(l => l.Provider == LoginProviders.Google && l.ProviderKey == FakeGoogle.Subject));
        Assert.Equal("Maria Popova", user.DisplayName);
        Assert.Equal("https://example.com/maria.png", user.AvatarUrl);
        Assert.Equal("maria-popova", user.Slug);
        Assert.Null(user.GithubConnection); // signing in with Google never connects GitHub
    }

    [Fact]
    public async Task Signing_in_with_google_again_uses_the_same_account()
    {
        var first = Client();
        await first.GetAsync($"/signin-google?code=c&state={Uri.EscapeDataString(await StartAsync(first))}");
        var second = Client();
        await second.GetAsync($"/signin-google?code=c&state={Uri.EscapeDataString(await StartAsync(second))}");

        using var db = _api.Db();
        Assert.Equal(1, await db.Users.CountAsync(u => u.Logins.Any(l => l.Provider == LoginProviders.Google)));
    }

    [Fact]
    public async Task Cancelling_at_google_returns_to_the_login_page_with_an_error()
    {
        var client = Client();
        var state = await StartAsync(client);

        var callback = await client.GetAsync($"/signin-google?error=access_denied&state={Uri.EscapeDataString(state)}");

        Assert.Equal(HttpStatusCode.Redirect, callback.StatusCode);
        Assert.Equal("http://localhost:3000/login?error=sign_in_failed", callback.Headers.Location!.ToString());
        using var db = _api.Db();
        Assert.False(await db.Users.AnyAsync(u => u.Logins.Any(l => l.Provider == LoginProviders.Google)));
    }

    [Fact]
    public async Task Providers_lists_the_set_up_providers_in_display_order() =>
        Assert.Equal("{\"providers\":[\"github\",\"google\"]}", await _api.Client().GetStringAsync("/auth/providers"));

    public void Dispose() => _api.Dispose();

    /// <summary>Google's token endpoint and userinfo endpoint, with a fixed fictional person.</summary>
    private sealed class FakeGoogle : HttpMessageHandler
    {
        public const string Subject = "104857600000000000001";

        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct)
        {
            var json = request.RequestUri!.AbsoluteUri switch
            {
                var u when u == GoogleDefaults.TokenEndpoint =>
                    """{"access_token":"test-access-token","token_type":"Bearer","expires_in":3600}""",
                var u when u == GoogleDefaults.UserInformationEndpoint =>
                    $$"""{"sub":"{{Subject}}","name":"Maria Popova","given_name":"Maria","family_name":"Popova","email":"maria@example.com","email_verified":true,"picture":"https://example.com/maria.png"}""",
                _ => null,
            };
            return Task.FromResult(json is null
                ? new HttpResponseMessage(HttpStatusCode.NotFound)
                : new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent(json, Encoding.UTF8, "application/json") });
        }
    }
}

public class ProvidersWithoutGoogleTests(WebApplicationFactory<Program> factory) : IClassFixture<WebApplicationFactory<Program>>, IDisposable
{
    private readonly ApiHost _api = new(factory, withGoogle: false);

    [Fact]
    public async Task A_provider_without_credentials_is_not_listed_and_cannot_be_started()
    {
        Assert.Equal("{\"providers\":[\"github\"]}", await _api.Client().GetStringAsync("/auth/providers"));
        Assert.Equal(HttpStatusCode.NotFound, (await _api.Client().GetAsync("/auth/google")).StatusCode);
    }

    public void Dispose() => _api.Dispose();
}
