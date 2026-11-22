using DevSheet.Infrastructure.Accounts;
using DevSheet.Infrastructure.Career;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DevSheet.Api.Controllers;

/// <summary>The Settings page: account details, public address and visibility, deleting the account.</summary>
[ApiController, Route("api/me"), Authorize]
public class AccountController(AccountSettingsService settings) : ControllerBase
{
    private Guid Uid => Guid.Parse(User.FindFirst(ExternalAuth.UserIdClaim)!.Value);

    [HttpGet("account")]
    public async Task<IActionResult> GetAccount() => Ok(await settings.GetAsync(Uid));

    /// <summary>Display name and contact email. 400 with field errors: { errors: { displayName: [...] } }.</summary>
    [HttpPatch("account")]
    public async Task<IActionResult> PatchAccount(AccountInput input)
    {
        var result = await settings.UpdateAsync(Uid, input);
        return result.Outcome == Outcome.Ok ? Ok(result.Value) : BadRequest(new { errors = result.Errors });
    }

    /// <summary>Whether a public address can be used; for the live check while typing.</summary>
    [HttpGet("slug-available")]
    public async Task<IActionResult> SlugAvailable([FromQuery] string? slug) => Ok(await settings.CheckSlugAsync(Uid, slug));

    public record SlugInput(string? Slug);

    /// <summary>Move the public page. 400 for an invalid or reserved address, 409 when someone else has it.</summary>
    [HttpPatch("slug")]
    public async Task<IActionResult> ChangeSlug(SlugInput input)
    {
        var check = await settings.ChangeSlugAsync(Uid, input.Slug);
        return check.Status switch
        {
            SlugStatus.Current => Ok(check),
            SlugStatus.Taken => Conflict(check),
            _ => BadRequest(check),
        };
    }

    [HttpGet("public-page")]
    public async Task<IActionResult> GetPublicPage() => Ok(await settings.GetPublicPageAsync(Uid));

    /// <summary>Publish or unpublish, and show or hide email and location on the public page.</summary>
    [HttpPatch("public-page")]
    public async Task<IActionResult> PatchPublicPage(PublicPageInput input) => Ok(await settings.UpdatePublicPageAsync(Uid, input));

    /// <summary>Deletes the account and all its data, then signs out.</summary>
    [HttpDelete]
    public async Task<IActionResult> DeleteAccount()
    {
        await settings.DeleteAsync(Uid);
        await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
        return NoContent();
    }
}
