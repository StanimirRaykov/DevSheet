using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Mvc;

namespace DevSheet.Api.Controllers;

[ApiController, Route("auth")]
public class AuthController(IConfiguration config) : ControllerBase
{
    /// <param name="next">Where to land in the web app after login. Must be a local path (see LocalPath); anything else goes to the dashboard.</param>
    [HttpGet("github")]
    public IActionResult Login([FromQuery] string? next = null) =>
        Challenge(new AuthenticationProperties { RedirectUri = $"{config["WebOrigin"]}{LocalPath.OrFallback(next)}" }, "GitHub");

    [HttpPost("logout")]
    public async Task<IActionResult> Logout()
    {
        await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
        return NoContent();
    }
}
