using System.Net;
using System.Net.Http.Json;
using DevSheet.Api;
using DevSheet.Application.Abstractions;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Routing;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;

namespace DevSheet.Tests;

/// <summary>The test-only sign-in for the end-to-end tests: present in Testing, absent everywhere else.</summary>
public class TestingSupportTests(WebApplicationFactory<Program> factory) : IClassFixture<WebApplicationFactory<Program>>, IDisposable
{
    private readonly ApiHost _api = new(factory);

    [Theory]
    [InlineData("Production")]
    [InlineData("Staging")]
    public async Task The_test_sign_in_does_not_exist_outside_Testing(string environment)
    {
        using var other = _api.Factory.WithWebHostBuilder(b => b.UseEnvironment(environment));
        var r = await other.CreateClient().PostAsJsonAsync("/api/testing/sign-in", new { login = "intruder" });
        Assert.Equal(HttpStatusCode.NotFound, r.StatusCode);
    }

    [Theory]
    [InlineData("Development")]
    [InlineData("Production")]
    [InlineData("Testing")]
    public void The_endpoint_is_mapped_only_in_Testing(string environment)
    {
        // A bare app: the real host in Development migrates its database on start, which the test database cannot do.
        var builder = WebApplication.CreateBuilder(new WebApplicationOptions { EnvironmentName = environment });
        var app = builder.Build();
        app.MapTestingEndpoints();
        var routes = ((IEndpointRouteBuilder)app).DataSources.SelectMany(d => d.Endpoints).OfType<RouteEndpoint>()
            .Select(e => e.RoutePattern.RawText);
        Assert.Equal(environment == "Testing", routes.Contains("/api/testing/sign-in"));
    }

    [Fact]
    public async Task In_Testing_it_signs_in_the_same_fictional_account_every_time()
    {
        var client = _api.Client();
        var first = await client.PostAsJsonAsync("/api/testing/sign-in", new { login = "E2E-Ana" });
        var again = await client.PostAsJsonAsync("/api/testing/sign-in", new { login = "e2e-ana" });

        Assert.Equal(HttpStatusCode.OK, first.StatusCode);
        Assert.Contains(first.Headers.GetValues("Set-Cookie"), c => c.StartsWith("devsheet.auth="));
        var a = await first.Content.ReadFromJsonAsync<SignedIn>();
        var b = await again.Content.ReadFromJsonAsync<SignedIn>();
        Assert.Equal(a!.Id, b!.Id);
        Assert.Equal("e2e-ana", a.Slug);

        using var db = _api.Db();
        var user = db.Users.Single(u => u.Id == a.Id);
        Assert.NotNull(user.OnboardingCompletedAt);
        Assert.Equal("e2e-ana", db.GithubConnections.Single(g => g.UserId == a.Id).Login);
    }

    [Fact]
    public void GitHub_is_stubbed_only_when_asked()
    {
        using var scope = _api.Factory.Services.CreateScope();
        Assert.IsNotType<TestingSupport.StubRepoSource>(scope.ServiceProvider.GetRequiredService<IGitHubRepoSource>());

        using var stubbed = _api.Factory.WithWebHostBuilder(b => b.UseSetting("Testing:StubGitHub", "true"));
        using var s2 = stubbed.Services.CreateScope();
        Assert.IsType<TestingSupport.StubRepoSource>(s2.ServiceProvider.GetRequiredService<IGitHubRepoSource>());
    }

    private record SignedIn(Guid Id, string Slug);

    public void Dispose() => _api.Dispose();
}
