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
    public async Task GitHub_no_longer_signs_in_and_connecting_needs_a_session()
    {
        var client = factory.WithWebHostBuilder(b => b
                .UseEnvironment("Testing")
                .UseSetting("Authentication:GitHub:ClientId", "test-github-id")
                .UseSetting("Authentication:GitHub:ClientSecret", "test-github-secret"))
            .CreateClient(new WebApplicationFactoryClientOptions { AllowAutoRedirect = false });

        Assert.Equal(HttpStatusCode.NotFound, (await client.GetAsync("/auth/github")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await client.GetAsync("/auth/link/github")).StatusCode);
        var connect = await client.GetAsync("/auth/github/connect");
        Assert.Equal(HttpStatusCode.Redirect, connect.StatusCode);
        Assert.Equal("/login", connect.Headers.Location!.AbsolutePath);
    }
}
