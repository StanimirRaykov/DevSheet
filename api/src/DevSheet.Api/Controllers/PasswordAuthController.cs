using DevSheet.Infrastructure.Accounts;
using DevSheet.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;

namespace DevSheet.Api.Controllers;

/// <summary>
/// Email and password accounts. JSON only ([ApiController] answers other content types with 415), so a form on
/// another site cannot post here; together with the SameSite=Lax cookie and CORS limited to the web app, that is the
/// protection against cross-site requests. Successful sign-ins answer <c>{ next }</c>: the page to open.
/// </summary>
[ApiController, Route("auth")]
public class PasswordAuthController(PasswordAccountService accounts, EmailThrottle throttle, AppDbContext db, ILogger<PasswordAuthController> log)
    : ControllerBase
{
    public record RegisterRequest(string? Email, string? Password, string? Name);
    public record SignInRequest(string? Email, string? Password, string? Next);
    public record EmailRequest(string? Email);
    public record TokenRequest(string? Token);
    public record ResetRequest(string? Token, string? Password);

    /// <summary>202 whether or not the email already had an account: the inbox tells the owner which it was.</summary>
    [HttpPost("register"), EnableRateLimiting(AuthRateLimits.EmailPolicy)]
    public Task<IActionResult> Register([FromBody] RegisterRequest body, CancellationToken ct) =>
        SendingEmail(body.Email, async () =>
        {
            var errors = await accounts.RegisterAsync(body.Email, body.Password, body.Name, ct);
            return errors is null ? Accepted() : BadRequest(new { errors });
        });

    [HttpPost("confirm-email")]
    public async Task<IActionResult> ConfirmEmail([FromBody] TokenRequest body, CancellationToken ct)
    {
        var result = await accounts.ConfirmEmailAsync(body.Token, ct);
        return result.UserId is { } userId ? await SignedIn(userId, null, ct) : BadRequest(new { error = result.Error });
    }

    /// <summary>401 for a wrong email or password alike; 403 email_not_confirmed only after the right password.</summary>
    [HttpPost("sign-in"), EnableRateLimiting(AuthRateLimits.SignInPolicy)]
    public async Task<IActionResult> SignIn([FromBody] SignInRequest body, CancellationToken ct)
    {
        if (throttle.SignIn(body.Email) is { } wait) return await TooMany(wait, ct);
        var result = await accounts.SignInAsync(body.Email, body.Password, ct);
        return result.Status switch
        {
            PasswordSignInStatus.Success => await SignedIn(result.UserId!.Value, body.Next, ct),
            PasswordSignInStatus.EmailNotConfirmed => StatusCode(StatusCodes.Status403Forbidden, new { error = "email_not_confirmed" }),
            _ => Unauthorized(new { error = "invalid_credentials" }),
        };
    }

    [HttpPost("resend-confirmation"), EnableRateLimiting(AuthRateLimits.EmailPolicy)]
    public Task<IActionResult> ResendConfirmation([FromBody] EmailRequest body, CancellationToken ct) =>
        SendingEmail(body.Email, async () => { await accounts.ResendConfirmationAsync(body.Email, ct); return Accepted(); });

    [HttpPost("forgot-password"), EnableRateLimiting(AuthRateLimits.EmailPolicy)]
    public Task<IActionResult> ForgotPassword([FromBody] EmailRequest body, CancellationToken ct) =>
        SendingEmail(body.Email, async () => { await accounts.ForgotPasswordAsync(body.Email, ct); return Accepted(); });

    [HttpPost("reset-password"), EnableRateLimiting(AuthRateLimits.SignInPolicy)]
    public async Task<IActionResult> ResetPassword([FromBody] ResetRequest body, CancellationToken ct)
    {
        var result = await accounts.ResetPasswordAsync(body.Token, body.Password, ct);
        if (result.Errors is { } errors) return BadRequest(new { errors });
        return result.UserId is { } userId ? await SignedIn(userId, null, ct) : BadRequest(new { error = result.Error });
    }

    private async Task<IActionResult> SignedIn(Guid userId, string? next, CancellationToken ct)
    {
        await Sessions.SignInAsync(HttpContext, userId);
        var onboarded = await db.Users.Where(u => u.Id == userId).Select(u => u.OnboardingCompletedAt != null).FirstAsync(ct);
        return Ok(new { next = SignInRedirect.After(LocalPath.OrFallback(next), "", onboarded) });
    }

    /// <summary>Per-address limit, then the action; a mail server that is down is a 503 the user can retry.</summary>
    private async Task<IActionResult> SendingEmail(string? email, Func<Task<IActionResult>> action)
    {
        if (PasswordRules.IsEmail(email) && throttle.Email(email) is { } wait) return await TooMany(wait, HttpContext.RequestAborted);
        try
        {
            return await action();
        }
        catch (EmailNotSentException ex)
        {
            log.LogError(ex.InnerException, "Account email could not be sent");
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new { error = "email_unavailable" });
        }
    }

    private async Task<IActionResult> TooMany(TimeSpan wait, CancellationToken ct)
    {
        await AuthRateLimits.TooMany(HttpContext, wait, ct);
        return new EmptyResult();
    }
}
