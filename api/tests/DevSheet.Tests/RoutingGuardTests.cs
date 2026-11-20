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

    [Theory]
    [InlineData("Maria-P", "maria-p")]
    [InlineData("María López", "maria-lopez")]
    [InlineData("  --Jo__Ann!! ", "jo-ann")]
    [InlineData("Li", "user-li")]
    [InlineData("", "user")]
    [InlineData("😀", "user")]
    public void Names_become_slug_shaped(string name, string slug) => Assert.Equal(slug, SlugRules.FromName(name));

    [Fact]
    public void Long_names_are_cut_without_a_trailing_hyphen() =>
        Assert.Equal("abcdefghij-abcdefghij-abcdefgh", SlugRules.FromName("abcdefghij abcdefghij abcdefgh-ijk"));

    [Fact]
    public void Reserved_name_skips_to_a_numbered_slug() =>
        Assert.Equal(["settings-2", "settings-3"], SlugRules.Candidates("Settings").Take(2));

    [Fact]
    public void Numbered_slugs_stay_within_the_length_limit() =>
        Assert.All(SlugRules.Candidates(new string('a', 40)).Take(12), s => Assert.True(SlugRules.IsValid(s), s));

    [Theory]
    [InlineData("maria", true)]
    [InlineData("ab", false)]
    [InlineData("-maria", false)]
    [InlineData("maria-", false)]
    [InlineData("Maria", false)]
    [InlineData("dashboard", false)]
    public void Slug_validity(string slug, bool valid) => Assert.Equal(valid, SlugRules.IsValid(slug));
}
