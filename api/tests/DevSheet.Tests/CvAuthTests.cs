using System.Net;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;

namespace DevSheet.Tests;

public class CvAuthTests(WebApplicationFactory<Program> factory) : IClassFixture<WebApplicationFactory<Program>>
{
    [Fact]
    public async Task Anonymous_cv_download_is_401_not_a_redirect()
    {
        var client = factory.WithWebHostBuilder(b => b.UseEnvironment("Testing"))
            .CreateClient(new WebApplicationFactoryClientOptions { AllowAutoRedirect = false });

        var response = await client.GetAsync("/api/me/cv.pdf");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }
}

public class LoginFlowTests(WebApplicationFactory<Program> factory) : IClassFixture<WebApplicationFactory<Program>>
{
    [Fact]
    public async Task Login_endpoint_still_redirects_to_github()
    {
        var client = factory.WithWebHostBuilder(b => b.UseEnvironment("Testing"))
            .CreateClient(new WebApplicationFactoryClientOptions { AllowAutoRedirect = false });

        var response = await client.GetAsync("/auth/github");

        Assert.Equal(HttpStatusCode.Found, response.StatusCode);
        Assert.Equal("github.com", response.Headers.Location!.Host);
    }
}
