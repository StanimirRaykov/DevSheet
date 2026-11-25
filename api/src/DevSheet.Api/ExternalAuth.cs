using System.Security.Claims;
using DevSheet.Infrastructure.Accounts;
using DevSheet.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication.OAuth;
using Microsoft.EntityFrameworkCore;

namespace DevSheet.Api;

/// <summary>
/// Shared plumbing for every OAuth provider. The intent (sign in, link, connect GitHub) travels inside the OAuth
/// state, which ASP.NET encrypts and binds to this browser with a correlation cookie, so it cannot be forged.
/// </summary>
public static class ExternalAuth
{
    public const string UserIdClaim = "devsheet:uid";
    private const string IntentKey = "devsheet:intent";

    /// <summary>
    /// The sign-in providers (as in URLs and the database) and their ASP.NET scheme names, in the order the login
    /// page shows them. The scheme name is also the configuration section: Authentication:{scheme}:ClientId.
    /// GitHub is not here: it is only connected, for syncing repositories (<see cref="GitHubScheme"/>).
    /// </summary>
    public static readonly IReadOnlyDictionary<string, string> SignInSchemes = new Dictionary<string, string>
    {
        [DevSheet.Domain.Entities.LoginProviders.Google] = "Google",
    };

    public const string GitHubScheme = "GitHub";

    /// <summary>Sign-in providers whose client id and secret are both set, so signing in with them can work.</summary>
    public static IReadOnlyList<string> EnabledProviders(IConfiguration config) =>
        SignInSchemes.Where(p => IsConfigured(config, p.Value)).Select(p => p.Key).ToList();

    public static bool IsConfigured(IConfiguration config, string scheme) =>
        !string.IsNullOrWhiteSpace(config[$"Authentication:{scheme}:ClientId"]) &&
        !string.IsNullOrWhiteSpace(config[$"Authentication:{scheme}:ClientSecret"]);

    public static AuthenticationProperties Properties(string redirectUri, AuthIntent intent) =>
        new(new Dictionary<string, string?> { [IntentKey] = intent.ToString() }) { RedirectUri = redirectUri };

    /// <summary>
    /// Runs when the provider has confirmed who the user is: signs in, links or connects, and puts our user id
    /// in the cookie. Link and connect keep the user who started them signed in; a problem is reported to the
    /// web app as ?error= on the page they return to.
    /// </summary>
    public static async Task CompleteAsync(OAuthCreatingTicketContext ctx, ExternalIdentity identity, GithubGrant? github)
    {
        var intent = ctx.Properties.Items.TryGetValue(IntentKey, out var raw) && Enum.TryParse<AuthIntent>(raw, out var parsed)
            ? parsed : AuthIntent.SignIn;

        Guid? current = null;
        if (intent != AuthIntent.SignIn)
        {
            var session = await ctx.HttpContext.AuthenticateAsync(CookieAuthenticationDefaults.AuthenticationScheme);
            if (Guid.TryParse(session.Principal?.FindFirstValue(UserIdClaim), out var uid)) current = uid;
        }

        var accounts = ctx.HttpContext.RequestServices.GetRequiredService<AccountService>();
        var outcome = await accounts.CompleteAsync(intent, current, identity, github, ctx.HttpContext.RequestAborted);

        if (outcome.UserId is not { } userId)
        {
            ctx.Fail(outcome.Error ?? AuthErrors.SignInFailed);
            return;
        }
        var stamp = await ctx.HttpContext.RequestServices.GetRequiredService<AppDbContext>().Users
            .Where(u => u.Id == userId).Select(u => u.SecurityStamp).FirstAsync(ctx.HttpContext.RequestAborted);
        ((ClaimsIdentity)ctx.Principal!.Identity!).AddClaims(Sessions.Claims(userId, stamp));
        if (outcome.Error is not null)
            ctx.Properties.RedirectUri = WithError(ctx.Properties.RedirectUri ?? "", outcome.Error);
        else if (intent == AuthIntent.SignIn)
        {
            var db = ctx.HttpContext.RequestServices.GetRequiredService<AppDbContext>();
            var completed = await db.Users.Where(u => u.Id == userId)
                .Select(u => u.OnboardingCompletedAt != null).FirstAsync(ctx.HttpContext.RequestAborted);
            var webOrigin = ctx.HttpContext.RequestServices.GetRequiredService<IConfiguration>()["WebOrigin"]!;
            ctx.Properties.RedirectUri = SignInRedirect.After(ctx.Properties.RedirectUri ?? "", webOrigin, completed);
        }
    }

    /// <summary>
    /// The provider refused, the user cancelled, or <see cref="CompleteAsync"/> failed: back to the login page
    /// with an error code instead of an exception page.
    /// </summary>
    public static Task OnRemoteFailure(RemoteFailureContext ctx, string webOrigin)
    {
        var code = ctx.Failure?.Message is AuthErrors.SignedOut ? AuthErrors.SignedOut : AuthErrors.SignInFailed;
        ctx.Response.Redirect($"{webOrigin}/login?error={code}");
        ctx.HandleResponse();
        return Task.CompletedTask;
    }

    public static string WithError(string url, string error) =>
        url + (url.Contains('?') ? '&' : '?') + "error=" + Uri.EscapeDataString(error);
}
