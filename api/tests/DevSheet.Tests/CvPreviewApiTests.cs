using System.Net;
using DevSheet.Api;
using DevSheet.Domain.Entities;
using Microsoft.AspNetCore.Mvc.Testing;

namespace DevSheet.Tests;

/// <summary>The CV preview: inline=true shows the PDF in the browser instead of saving it.</summary>
public class CvPreviewApiTests(WebApplicationFactory<Program> factory) : IClassFixture<WebApplicationFactory<Program>>, IDisposable
{
    private readonly ApiHost _api = new(factory);

    private async Task<User> NewUser(string slug)
    {
        using var db = _api.Db();
        var user = new User { DisplayName = "Ana Petrova", Slug = slug };
        db.Users.Add(user);
        await db.SaveChangesAsync();
        return user;
    }

    [Theory]
    [InlineData("modern", "cv-inline-m-cv.pdf")]
    [InlineData("europass", "cv-inline-e-cv-europass-style.pdf")]
    public async Task Inline_changes_only_the_disposition(string template, string fileName)
    {
        var ana = await NewUser(fileName.StartsWith("cv-inline-m") ? "cv-inline-m" : "cv-inline-e");
        var client = _api.Client(ana.Id);

        var download = await client.GetAsync($"/api/me/cv.pdf?template={template}");
        var preview = await client.GetAsync($"/api/me/cv.pdf?template={template}&inline=true");

        Assert.Equal(HttpStatusCode.OK, download.StatusCode);
        Assert.Equal(HttpStatusCode.OK, preview.StatusCode);
        Assert.Equal("attachment", download.Content.Headers.ContentDisposition!.DispositionType);
        Assert.Equal("inline", preview.Content.Headers.ContentDisposition!.DispositionType);
        Assert.Equal(fileName, download.Content.Headers.ContentDisposition.FileName?.Trim('"'));
        Assert.Equal(fileName, preview.Content.Headers.ContentDisposition.FileName?.Trim('"'));
        Assert.Equal("application/pdf", preview.Content.Headers.ContentType!.MediaType);
        Assert.StartsWith("%PDF", System.Text.Encoding.ASCII.GetString((await preview.Content.ReadAsByteArrayAsync())[..4]));
    }

    [Fact]
    public async Task An_unknown_template_is_still_400_with_inline()
    {
        var ana = await NewUser("cv-inline-bad");
        var r = await _api.Client(ana.Id).GetAsync("/api/me/cv.pdf?template=fancy&inline=true");
        Assert.Equal(HttpStatusCode.BadRequest, r.StatusCode);
    }

    [Fact]
    public async Task Anonymous_preview_is_401()
    {
        var r = await _api.Client().GetAsync("/api/me/cv.pdf?inline=true");
        Assert.Equal(HttpStatusCode.Unauthorized, r.StatusCode);
    }

    public void Dispose() => _api.Dispose();
}
