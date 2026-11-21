using System.Net;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;

namespace DevSheet.Tests;

public class CvAuthTests(WebApplicationFactory<Program> factory) : IClassFixture<WebApplicationFactory<Program>>
{
    [Fact]
    public async Task Anonymous_cv_download_is_401_not_a_redirect()
    {
        var client = factory.WithWebHostBuilder(b => b
                .UseEnvironment("Testing")
                .UseSetting("Authentication:GitHub:ClientId", "test-github-id")
                .UseSetting("Authentication:GitHub:ClientSecret", "test-github-secret"))
            .CreateClient(new WebApplicationFactoryClientOptions { AllowAutoRedirect = false });

        var response = await client.GetAsync("/api/me/cv.pdf");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Theory]
    [InlineData("/api/me/cv.pdf?template=europass")]
    [InlineData("/api/me/languages")]
    [InlineData("/api/me/certifications")]
    public async Task Anonymous_requests_to_the_new_endpoints_are_401(string url)
    {
        var client = factory.WithWebHostBuilder(b => b
                .UseEnvironment("Testing")
                .UseSetting("Authentication:GitHub:ClientId", "test-github-id")
                .UseSetting("Authentication:GitHub:ClientSecret", "test-github-secret"))
            .CreateClient(new WebApplicationFactoryClientOptions { AllowAutoRedirect = false });

        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync(url)).StatusCode);
    }
}

public class LoginFlowTests(WebApplicationFactory<Program> factory) : IClassFixture<WebApplicationFactory<Program>>
{
    [Fact]
    public async Task Login_endpoint_still_redirects_to_github()
    {
        var client = factory.WithWebHostBuilder(b => b
                .UseEnvironment("Testing")
                .UseSetting("Authentication:GitHub:ClientId", "test-github-id")
                .UseSetting("Authentication:GitHub:ClientSecret", "test-github-secret"))
            .CreateClient(new WebApplicationFactoryClientOptions { AllowAutoRedirect = false });

        var response = await client.GetAsync("/auth/github");

        Assert.Equal(HttpStatusCode.Found, response.StatusCode);
        Assert.Equal("github.com", response.Headers.Location!.Host);
    }
}
