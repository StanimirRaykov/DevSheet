using DevSheet.Application.Career;
using DevSheet.Domain.Entities;

namespace DevSheet.Tests;

public class LanguageValidatorTests
{
    private static LanguageInput Foreign(string? name = "English", string? iso = "en", CefrLevel? level = CefrLevel.B2) =>
        new(name, iso, false, level, level, level, level, level);

    [Fact]
    public void Foreign_language_with_levels_is_valid() => Assert.Empty(CareerValidator.Validate(Foreign()));

    [Fact]
    public void Partial_levels_are_allowed_for_a_foreign_language() =>
        Assert.Empty(CareerValidator.Validate(new LanguageInput("German", "de", false, null, CefrLevel.A2, null, null, null)));

    [Fact]
    public void Mother_tongue_without_levels_is_valid() =>
        Assert.Empty(CareerValidator.Validate(new LanguageInput("Bulgarian", "bg", true, null, null, null, null, null)));

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void Name_is_required(string? name) =>
        Assert.Contains("name", CareerValidator.Validate(Foreign(name)).Keys);

    [Fact]
    public void Name_length_is_limited() =>
        Assert.Contains("name", CareerValidator.Validate(Foreign(new string('x', CareerValidator.ShortMax + 1))).Keys);

    [Theory]
    [InlineData("bg", true)]
    [InlineData("", true)]
    [InlineData(null, true)]
    [InlineData("  ", true)]
    [InlineData("BG", false)]
    [InlineData("bgr", false)]
    [InlineData("b", false)]
    [InlineData("1a", false)]
    [InlineData("b-", false)]
    public void Iso_code_must_be_two_lower_case_letters_when_given(string? iso, bool valid) =>
        Assert.Equal(valid, !CareerValidator.Validate(Foreign(iso: iso)).ContainsKey("isoCode"));

    [Fact]
    public void Undefined_level_value_is_rejected()
    {
        var bogus = (CefrLevel)99;
        Assert.Contains("levels", CareerValidator.Validate(Foreign(level: bogus)).Keys);
        Assert.Contains("levels", CareerValidator.Validate(Foreign(level: (CefrLevel)0)).Keys);
    }

    [Fact]
    public void Mother_tongue_cannot_carry_levels()
    {
        var errors = CareerValidator.Validate(new LanguageInput("Bulgarian", "bg", true, null, CefrLevel.C2, null, null, null));
        Assert.Contains("levels", errors.Keys);
    }
}

public class CertificationValidatorTests
{
    private static readonly DateOnly Today = new(2026, 11, 17);

    private static CertificationInput Cert(string? name = "AZ-900", string? issuer = "Microsoft", DateOnly? date = null, string? url = null) =>
        new(name, issuer, date ?? new DateOnly(2025, 5, 1), url);

    [Fact]
    public void Valid_certification_has_no_errors() =>
        Assert.Empty(CareerValidator.Validate(Cert(url: "https://learn.microsoft.com/cert/123"), Today));

    [Fact]
    public void Only_the_name_is_required() =>
        Assert.Empty(CareerValidator.Validate(new CertificationInput("Cert", null, null, null), Today));

    [Theory]
    [InlineData(null)]
    [InlineData(" ")]
    public void Name_is_required(string? name) =>
        Assert.Contains("name", CareerValidator.Validate(Cert(name), Today).Keys);

    [Fact]
    public void Issuer_length_is_limited() =>
        Assert.Contains("issuer", CareerValidator.Validate(Cert(issuer: new string('i', CareerValidator.ShortMax + 1)), Today).Keys);

    [Fact]
    public void Future_issue_date_is_rejected_but_today_and_past_are_fine()
    {
        Assert.Contains("issueDate", CareerValidator.Validate(Cert(date: Today.AddDays(1)), Today).Keys);
        Assert.Empty(CareerValidator.Validate(Cert(date: Today), Today));
        Assert.Empty(CareerValidator.Validate(Cert(date: Today.AddYears(-3)), Today));
    }

    [Theory]
    [InlineData("https://example.com", true)]
    [InlineData("http://example.com/path?x=1", true)]
    [InlineData("", true)]
    [InlineData(null, true)]
    [InlineData("example.com", false)]
    [InlineData("ftp://example.com/file", false)]
    [InlineData("javascript:alert(1)", false)]
    [InlineData("data:text/html,<script>alert(1)</script>", false)]
    [InlineData("not a url", false)]
    public void Url_must_be_http_or_https_when_given(string? url, bool valid) =>
        Assert.Equal(valid, !CareerValidator.Validate(Cert(url: url), Today).ContainsKey("url"));

    [Fact]
    public void Url_length_is_limited() =>
        Assert.Contains("url", CareerValidator.Validate(Cert(url: "https://example.com/" + new string('a', CareerValidator.UrlMax)), Today).Keys);
}
