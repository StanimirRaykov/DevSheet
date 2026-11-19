using DevSheet.Api;
using DevSheet.Domain;

namespace DevSheet.Tests;

public class RoutingGuardTests
{
    [Theory]
    [InlineData("/dashboard")]
    [InlineData("/dashboard/profile?tab=languages")]
    [InlineData("/settings#github")]
    public void Local_paths_are_allowed(string path) => Assert.True(LocalPath.IsSafe(path));

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("dashboard")]
    [InlineData("//evil.com")]
    [InlineData("/\\evil.com")]
    [InlineData("https://evil.com")]
    [InlineData("javascript:alert(1)")]
    [InlineData("/dash\nboard")]
    public void Other_values_are_rejected(string? path)
    {
        Assert.False(LocalPath.IsSafe(path));
        Assert.Equal(LocalPath.Fallback, LocalPath.OrFallback(path));
    }

    [Theory]
    [InlineData("login")]
    [InlineData("Dashboard")]
    [InlineData("settings")]
    public void Route_names_are_reserved(string slug) => Assert.True(ReservedSlugs.IsReserved(slug));

    [Fact]
    public void Ordinary_login_keeps_its_slug() => Assert.Equal("maria-p", ReservedSlugs.DefaultFor("Maria-P", 42));

    [Fact]
    public void Reserved_login_gets_a_suffix() => Assert.Equal("settings-42", ReservedSlugs.DefaultFor("Settings", 42));
}
