using System.Security.Claims;
using System.Text.Encodings.Web;
using DevSheet.Api;
using DevSheet.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace DevSheet.Tests;

/// <summary>
/// The real API on an in-memory SQLite database. Requests are signed in as the user id in the
/// <see cref="TestAuthHandler.Header"/> header (no header: anonymous); OAuth schemes stay registered, with
/// made-up credentials so they count as set up (pass <c>withGoogle: false</c> for a server without Google).
/// </summary>
public sealed class ApiHost : IDisposable
{
    private readonly SqliteConnection _conn = new("DataSource=:memory:");
    public WebApplicationFactory<Program> Factory { get; }

    public ApiHost(WebApplicationFactory<Program> factory, bool withGoogle = true)
    {
        _conn.Open();
        Factory = factory.WithWebHostBuilder(b => b
            .UseEnvironment("Testing")
            .UseSetting("Authentication:GitHub:ClientId", "test-github-id")
            .UseSetting("Authentication:GitHub:ClientSecret", "test-github-secret")
            .UseSetting("Authentication:Google:ClientId", withGoogle ? "test-google-id" : "\u2028") // whitespace only: not set up
            .UseSetting("Authentication:Google:ClientSecret", withGoogle ? "test-google-secret" : "")
            .ConfigureTestServices(s =>
            {
                s.RemoveAll<DbContextOptions<AppDbContext>>();
                s.AddDbContext<AppDbContext>(o => o.UseSqlite(_conn));
                s.AddAuthentication().AddScheme<AuthenticationSchemeOptions, TestAuthHandler>(TestAuthHandler.Scheme, null);
                s.PostConfigure<AuthenticationOptions>(o =>
                {
                    o.DefaultScheme = TestAuthHandler.Scheme;
                    o.DefaultAuthenticateScheme = TestAuthHandler.Scheme;
                    o.DefaultChallengeScheme = TestAuthHandler.Scheme;
                });
            }));
        using var scope = Factory.Services.CreateScope();
        scope.ServiceProvider.GetRequiredService<AppDbContext>().Database.EnsureCreated();
    }

    /// <summary>A database context for arranging and checking data. Dispose it.</summary>
    public AppDbContext Db() =>
        new(new DbContextOptionsBuilder<AppDbContext>().UseSqlite(_conn).Options);

    public HttpClient Client(Guid? signedInAs = null)
    {
        var client = Factory.CreateClient(new WebApplicationFactoryClientOptions { AllowAutoRedirect = false });
        if (signedInAs is { } uid) client.DefaultRequestHeaders.Add(TestAuthHandler.Header, uid.ToString());
        return client;
    }

    public void Dispose() { Factory.Dispose(); _conn.Dispose(); }
}

public class TestAuthHandler(IOptionsMonitor<AuthenticationSchemeOptions> options, ILoggerFactory logger, UrlEncoder encoder)
    : AuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder)
{
    public const string Scheme = "Test";
    public const string Header = "X-Test-User";

    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        if (!Request.Headers.TryGetValue(Header, out var uid)) return Task.FromResult(AuthenticateResult.NoResult());
        var identity = new ClaimsIdentity([new Claim(ExternalAuth.UserIdClaim, uid.ToString())], Scheme);
        return Task.FromResult(AuthenticateResult.Success(new AuthenticationTicket(new ClaimsPrincipal(identity), Scheme)));
    }
}
