using System.Security.Claims;
using DevSheet.Application.Abstractions;
using DevSheet.Domain.Entities;
using DevSheet.Infrastructure.Accounts;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace DevSheet.Api;

/// <summary>
/// Support for the end-to-end tests (Playwright). Everything here exists only when the API runs in the
/// <c>Testing</c> environment; in Development and Production the endpoint is not mapped at all (404).
/// </summary>
public static class TestingSupport
{
    public const string Environment = "Testing";

    public static bool IsTesting(this IHostEnvironment env) => env.IsEnvironment(Environment);

    /// <summary>
    /// With <c>Testing:StubGitHub=true</c>, syncing reads fixed, fictional repositories instead of calling GitHub.
    /// Off by default so the API's own integration tests (also in Testing) keep their own fakes.
    /// </summary>
    public static void AddTestingServices(this IServiceCollection services, IHostEnvironment env, IConfiguration config)
    {
        if (!env.IsTesting() || !config.GetValue("Testing:StubGitHub", false)) return;
        services.RemoveAll<IGitHubRepoSource>();
        services.AddScoped<IGitHubRepoSource, StubRepoSource>();
    }

    public record SignInRequest(string? Login, bool CompleteOnboarding = true);

    /// <summary>
    /// POST /api/testing/sign-in {login}: signs this browser in as a fictional GitHub user, created on first use with a
    /// GitHub connection (a fake token, used only by the stub). Replaces the OAuth round trip, which a test cannot do.
    /// </summary>
    public static void MapTestingEndpoints(this WebApplication app)
    {
        if (!app.Environment.IsTesting()) return;

        app.MapPost("/api/testing/sign-in", async ([FromBody] SignInRequest body, HttpContext http, [FromServices] AccountService accounts, [FromServices] OnboardingService onboarding) =>
        {
            var login = string.IsNullOrWhiteSpace(body.Login) ? "e2e-user" : body.Login.Trim().ToLowerInvariant();
            // A stable id per login, so signing in again finds the same account.
            var githubId = 900_000_000L + StableHash(login) % 1_000_000;
            var user = await accounts.SignInAsync(
                new ExternalIdentity(LoginProviders.GitHub, githubId.ToString(), DisplayName: "Test " + login),
                new GithubGrant(githubId, login, "e2e-fake-token"));
            if (body.CompleteOnboarding) await onboarding.CompleteAsync(user.Id);

            await Sessions.SignInAsync(http, user.Id);
            return Results.Ok(new { user.Id, user.Slug });
        });
    }

    // FNV-1a: string.GetHashCode changes with every process start.
    private static uint StableHash(string s)
    {
        var h = 2166136261u;
        foreach (var c in s) h = (h ^ c) * 16777619u;
        return h;
    }

    /// <summary>Fixed, fictional repositories for the stubbed sync.</summary>
    public sealed class StubRepoSource : IGitHubRepoSource
    {
        public Task<IReadOnlyList<RemoteRepo>> GetPublicReposAsync(string login, string token, int max, CancellationToken ct = default) =>
            Task.FromResult<IReadOnlyList<RemoteRepo>>(
            [
                new(910_001, "ledger-api", "A double-entry bookkeeping API.", $"https://github.com/{login}/ledger-api", 12, false,
                    new DateTime(2026, 10, 1, 0, 0, 0, DateTimeKind.Utc), new Dictionary<string, long> { ["C#"] = 90_000, ["PLpgSQL"] = 4_000 }),
                new(910_002, "trail-map", "Hiking trails on a map.", $"https://github.com/{login}/trail-map", 3, false,
                    new DateTime(2026, 9, 1, 0, 0, 0, DateTimeKind.Utc), new Dictionary<string, long> { ["TypeScript"] = 50_000, ["CSS"] = 6_000 }),
                new(910_003, "dotfiles", null, $"https://github.com/{login}/dotfiles", 0, false,
                    new DateTime(2026, 8, 1, 0, 0, 0, DateTimeKind.Utc), new Dictionary<string, long> { ["Shell"] = 2_000 }),
            ]);
    }
}
