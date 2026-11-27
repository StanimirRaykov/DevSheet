using DevSheet.Infrastructure.Accounts;
using DevSheet.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;

namespace DevSheet.Api.Controllers;

/// <summary>The Password section of Settings: change the password, or add one to an account that signs in with Google.</summary>
[ApiController, Route("api/me/password"), Authorize]
public class PasswordSettingsController(PasswordAccountService accounts, EmailThrottle throttle, AppDbContext db, ILogger<PasswordSettingsController> log)
    : ControllerBase
{
    private Guid Uid => Guid.Parse(User.FindFirst(ExternalAuth.UserIdClaim)!.Value);

    public record PasswordRequest(string? CurrentPassword, string? NewPassword, string? Email);

    /// <summary>{ hasPassword, email, emailConfirmed, changedAt }. Without a password, email is the account email.</summary>
    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken ct) => Ok(await accounts.GetStatusAsync(Uid, ct));

    /// <summary>
    /// With a password: change it (currentPassword + newPassword), 204; other sessions are signed out, this one stays.
    /// Without: add one (newPassword, optional email), 202; it works after the emailed confirm link is opened.
    /// 400 { errors } with field errors. Rate limited like sign-in, since it checks the current password.
    /// </summary>
    [HttpPost, EnableRateLimiting(AuthRateLimits.SignInPolicy)]
    public async Task<IActionResult> Set([FromBody] PasswordRequest body, CancellationToken ct)
    {
        var uid = Uid;
        if (await db.PasswordLogins.AnyAsync(l => l.UserId == uid, ct))
        {
            var errors = await accounts.ChangeAsync(uid, body.CurrentPassword, body.NewPassword, ct);
            if (errors is not null) return BadRequest(new { errors });
            await Sessions.SignInAsync(HttpContext, uid); // a new cookie with the new stamp
            return NoContent();
        }

        if (PasswordRules.IsEmail(body.Email) && throttle.Email(body.Email) is { } wait)
        {
            await AuthRateLimits.TooMany(HttpContext, wait, ct);
            return new EmptyResult();
        }
        try
        {
            var errors = await accounts.AddAsync(uid, body.Email, body.NewPassword, ct);
            return errors is null ? Accepted() : BadRequest(new { errors });
        }
        catch (EmailNotSentException ex)
        {
            log.LogError(ex.InnerException, "Account email could not be sent");
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new { error = "email_unavailable" });
        }
    }
}
