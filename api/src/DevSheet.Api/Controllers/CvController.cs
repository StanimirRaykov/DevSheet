using DevSheet.Infrastructure.Cv;
using DevSheet.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Net.Http.Headers;

namespace DevSheet.Api.Controllers;

[ApiController, Route("api/me"), Authorize]
public class CvController(CvDataService data, AppDbContext db) : ControllerBase
{
    private Guid Uid => Guid.Parse(User.FindFirst(ExternalAuth.UserIdClaim)!.Value);

    /// <summary>
    /// My CV as a PDF built from my confirmed data. template: modern (default) or europass (Europass-style, not an
    /// official Europass file). inline=true asks the browser to show it (the preview) instead of saving it; only the
    /// Content-Disposition header changes.
    /// </summary>
    [HttpGet("cv.pdf")]
    public async Task<IActionResult> Download([FromQuery] string template = "modern", [FromQuery] bool inline = false)
    {
        var name = template.ToLowerInvariant();
        if (name is not ("modern" or "europass"))
            return BadRequest(new { error = "Unknown template. Available: modern, europass." });

        var model = await data.BuildAsync(Uid);
        if (model is null) return NotFound();

        var slug = await db.Users.Where(u => u.Id == Uid).Select(u => u.Slug).FirstAsync();
        var bytes = name == "europass" ? EuropassStyleCvRenderer.Render(model) : ModernCvRenderer.Render(model);
        var suffix = name == "europass" ? "-cv-europass-style.pdf" : "-cv.pdf";
        if (!inline) return File(bytes, "application/pdf", slug + suffix);

        var disposition = new ContentDispositionHeaderValue("inline");
        disposition.SetHttpFileName(slug + suffix);
        Response.Headers.ContentDisposition = disposition.ToString();
        return File(bytes, "application/pdf");
    }

    /// <summary>
    /// My CV as Europass XML, the file the Europass online editor imports (europa.eu/europass, "Create a CV",
    /// upload). Same data and privacy rules as the PDFs.
    /// </summary>
    [HttpGet("cv.xml")]
    public async Task<IActionResult> Europass()
    {
        var model = await data.BuildAsync(Uid);
        if (model is null) return NotFound();
        var slug = await db.Users.Where(u => u.Id == Uid).Select(u => u.Slug).FirstAsync();
        return File(EuropassXmlExporter.Export(model), "application/xml", slug + "-cv-europass.xml");
    }
}
