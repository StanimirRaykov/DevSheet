using System.Security.Claims;
using DevSheet.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.EntityFrameworkCore;

namespace DevSheet.Api;

/// <summary>
/// The sign-in cookie. It carries the user id and the user's security stamp; every request checks the stamp
/// against the database, so changing it (password reset or change) signs out every other session at once.
/// </summary>
public static class Sessions
{
    public const string StampClaim = "devsheet:stamp";

    /// <summary>Signs this browser in as the user (password sign-in, confirm link, reset link, test sign-in).</summary>
    public static async Task SignInAsync(HttpContext http, Guid userId)
    {
        var db = http.RequestServices.GetRequiredService<AppDbContext>();
        var stamp = await db.Users.Where(u => u.Id == userId).Select(u => u.SecurityStamp).FirstAsync(http.RequestAborted);
        var identity = new ClaimsIdentity(Claims(userId, stamp), CookieAuthenticationDefaults.AuthenticationScheme);
        await http.SignInAsync(CookieAuthenticationDefaults.AuthenticationScheme, new ClaimsPrincipal(identity));
    }

    public static Claim[] Claims(Guid userId, string stamp) =>
        [new(ExternalAuth.UserIdClaim, userId.ToString()), new(StampClaim, stamp)];

    /// <summary>Cookie event: a cookie for a deleted account, or with an old stamp, is rejected and removed.</summary>
    public static async Task ValidateAsync(CookieValidatePrincipalContext ctx)
    {
        var principal = ctx.Principal;
        var stamp = principal?.FindFirstValue(StampClaim);
        var valid = Guid.TryParse(principal?.FindFirstValue(ExternalAuth.UserIdClaim), out var userId) && stamp is not null
            && await ctx.HttpContext.RequestServices.GetRequiredService<AppDbContext>().Users
                .AnyAsync(u => u.Id == userId && u.SecurityStamp == stamp, ctx.HttpContext.RequestAborted);
        if (valid) return;
        ctx.RejectPrincipal();
        await ctx.HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
    }
}
