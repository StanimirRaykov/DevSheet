using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Mvc;

namespace DevSheet.Api.Controllers;

[ApiController, Route("auth")]
public class AuthController(IConfiguration config) : ControllerBase
{
    [HttpGet("github")]
    public IActionResult Login() =>
        Challenge(new AuthenticationProperties { RedirectUri = $"{config["WebOrigin"]}/dashboard" }, "GitHub");

    [HttpPost("logout")]
    public async Task<IActionResult> Logout()
    {
        await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
        return NoContent();
    }
}
