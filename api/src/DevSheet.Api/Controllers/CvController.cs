using DevSheet.Infrastructure.Cv;
using DevSheet.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DevSheet.Api.Controllers;

[ApiController, Route("api/me"), Authorize]
public class CvController(CvDataService data, AppDbContext db) : ControllerBase
{
    private Guid Uid => Guid.Parse(User.FindFirst("devsheet:uid")!.Value);

    /// <summary>Download my CV as a PDF built from my confirmed data. template: modern (default).</summary>
    [HttpGet("cv.pdf")]
    public async Task<IActionResult> Download([FromQuery] string template = "modern")
    {
        if (!string.Equals(template, "modern", StringComparison.OrdinalIgnoreCase))
            return BadRequest(new { error = "Unknown template. Available: modern." });

        var model = await data.BuildAsync(Uid);
        if (model is null) return NotFound();

        var slug = await db.Users.Where(u => u.Id == Uid).Select(u => u.Slug).FirstAsync();
        return File(ModernCvRenderer.Render(model), "application/pdf", $"{slug}-cv.pdf");
    }
}
