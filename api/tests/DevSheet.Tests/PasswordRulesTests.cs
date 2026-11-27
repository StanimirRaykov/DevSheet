using DevSheet.Infrastructure.Accounts;

namespace DevSheet.Tests;

public class PasswordRulesTests
{
    [Theory]
    [InlineData("maria@example.test", true)]
    [InlineData("  maria.petrova+cv@mail.example.test ", true)]
    [InlineData("мария@example.test", true)]
    [InlineData("maria@localhost", false)]
    [InlineData("Maria <maria@example.test>", false)]
    [InlineData("maria@example.test, ivan@example.test", false)]
    [InlineData("not an email", false)]
    [InlineData("", false)]
    [InlineData(null, false)]
    public void Recognises_a_single_email_address(string? email, bool expected) =>
        Assert.Equal(expected, PasswordRules.IsEmail(email));

    [Theory]
    [InlineData("short", "at least 10")]
    [InlineData("          ", "other than spaces")]
    [InlineData("MARIA@example.test", "other than your email")]
    public void Refuses_weak_passwords(string password, string message) =>
        Assert.Contains(message, PasswordRules.CheckPassword(password, "maria@example.test")["password"][0]);

    [Fact]
    public void Refuses_very_long_passwords() =>
        Assert.Contains("at most 128", PasswordRules.CheckPassword(new string('x', 129), null)["password"][0]);

    [Theory]
    [InlineData("correct horse battery")]
    [InlineData("пароль-на-кирилица")]
    [InlineData("1234567890")] // length is the rule; no composition rules
    public void Accepts_long_enough_passwords(string password) =>
        Assert.Empty(PasswordRules.CheckPassword(password, "maria@example.test"));

    [Fact]
    public void Sign_up_needs_a_name() =>
        Assert.True(PasswordRules.CheckSignUp("maria@example.test", "correct horse battery", "  ").ContainsKey("name"));
}
