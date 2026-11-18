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

    /// <summary>Download my CV as a PDF built from my confirmed data. template: modern (default) or europass (Europass-style, not an official Europass file).</summary>
    [HttpGet("cv.pdf")]
    public async Task<IActionResult> Download([FromQuery] string template = "modern")
    {
        var name = template.ToLowerInvariant();
        if (name is not ("modern" or "europass"))
            return BadRequest(new { error = "Unknown template. Available: modern, europass." });

        var model = await data.BuildAsync(Uid);
        if (model is null) return NotFound();

        var slug = await db.Users.Where(u => u.Id == Uid).Select(u => u.Slug).FirstAsync();
        var bytes = name == "europass" ? EuropassStyleCvRenderer.Render(model) : ModernCvRenderer.Render(model);
        var suffix = name == "europass" ? "-cv-europass-style.pdf" : "-cv.pdf";
        return File(bytes, "application/pdf", slug + suffix);
    }
}
