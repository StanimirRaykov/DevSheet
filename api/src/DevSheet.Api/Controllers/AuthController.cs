using DevSheet.Infrastructure.Accounts;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Mvc;

namespace DevSheet.Api.Controllers;

/// <summary>
/// OAuth entry points. Every <c>next</c> must be a local path of the web app (see LocalPath); anything else
/// falls back to the default page, so a crafted link cannot send a user to another site (open redirect).
/// </summary>
[ApiController, Route("auth")]
public class AuthController(IConfiguration config, IAuthenticationSchemeProvider schemes) : ControllerBase
{
    private const string SettingsPath = "/settings";
    private string WebOrigin => config["WebOrigin"]!;

    /// <summary>Sign in, or sign up, with a provider (github; google and apple later).</summary>
    [HttpGet("{provider}")]
    public Task<IActionResult> SignIn(string provider, [FromQuery] string? next = null) =>
        StartAsync(provider, AuthIntent.SignIn, LocalPath.OrFallback(next));

    /// <summary>Add another sign-in method to the signed-in account. Started from Settings.</summary>
    [HttpGet("link/{provider}")]
    public Task<IActionResult> Link(string provider, [FromQuery] string? next = null) =>
        SignedIn ? StartAsync(provider, AuthIntent.Link, LocalPath.OrFallback(next, SettingsPath)) : Task.FromResult(ToLogin());

    /// <summary>Connect GitHub to the signed-in account, so its repositories can be synced.</summary>
    [HttpGet("github/connect")]
    public Task<IActionResult> ConnectGithub([FromQuery] string? next = null) =>
        SignedIn
            ? StartAsync(DevSheet.Domain.Entities.LoginProviders.GitHub, AuthIntent.ConnectGithub, LocalPath.OrFallback(next, SettingsPath))
            : Task.FromResult(ToLogin());

    [HttpPost("logout")]
    public async Task<IActionResult> Logout()
    {
        await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
        return NoContent();
    }

    private bool SignedIn => User.Identity?.IsAuthenticated == true;

    // These links are opened by the browser, so an expired session goes to the login page rather than a bare 401.
    private IActionResult ToLogin() =>
        Redirect($"{WebOrigin}/login?next={Uri.EscapeDataString(SettingsPath)}");

    private async Task<IActionResult> StartAsync(string provider, AuthIntent intent, string path)
    {
        if (!ExternalAuth.Schemes.TryGetValue(provider.ToLowerInvariant(), out var scheme) || await schemes.GetSchemeAsync(scheme) is null)
            return NotFound(new { error = $"Unknown sign-in provider '{provider}'." });
        return Challenge(ExternalAuth.Properties(WebOrigin + path, intent), scheme);
    }
}
