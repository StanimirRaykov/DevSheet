using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.RegularExpressions;
using DevSheet.Domain.Entities;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;

namespace DevSheet.Tests;

/// <summary>Email and password accounts through the real API, cookie and all. Every address is fictional.</summary>
public class PasswordAuthApiTests(WebApplicationFactory<Program> factory) : IClassFixture<WebApplicationFactory<Program>>, IDisposable
{
    private const string Password = "correct horse battery";
    private readonly ApiHost _api = new(factory);

    public void Dispose() => _api.Dispose();

    private static Task<HttpResponseMessage> Post(HttpClient client, string path, object body) => client.PostAsJsonAsync(path, body);

    private static async Task<JsonElement> Json(HttpResponseMessage r) => JsonDocument.Parse(await r.Content.ReadAsStringAsync()).RootElement;

    private static async Task<string?> Error(HttpResponseMessage r) =>
        (await Json(r)).TryGetProperty("error", out var e) ? e.GetString() : null;

    /// <summary>The token from the last email's link to <paramref name="path"/>.</summary>
    private string TokenFrom(string path) =>
        Uri.UnescapeDataString(Regex.Match(_api.Emails.Sent[^1].Text, $@"{Regex.Escape(path)}\?token=(\S+)").Groups[1].Value);

    private async Task<HttpClient> ConfirmedAccount(string email = "maria@example.test")
    {
        var client = _api.Client();
        Assert.Equal(HttpStatusCode.Accepted, (await Post(client, "/auth/register", new { email, password = Password, name = "Maria Petrova" })).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await Post(client, "/auth/confirm-email", new { token = TokenFrom("/confirm-email") })).StatusCode);
        return client;
    }

    [Fact]
    public async Task Sign_up_creates_an_unconfirmed_account_and_emails_a_confirm_link()
    {
        var r = await Post(_api.Client(), "/auth/register", new { email = " Maria@Example.test ", password = Password, name = " Maria Petrova " });

        Assert.Equal(HttpStatusCode.Accepted, r.StatusCode);
        using var db = _api.Db();
        var user = await db.Users.Include(u => u.PasswordLogin).SingleAsync();
        Assert.Equal(("Maria Petrova", "maria-petrova"), (user.DisplayName, user.Slug));
        Assert.Equal(("Maria@Example.test", "MARIA@EXAMPLE.TEST"), (user.PasswordLogin!.Email, user.PasswordLogin.NormalizedEmail));
        Assert.Null(user.PasswordLogin.EmailConfirmedAt);
        Assert.DoesNotContain(Password, user.PasswordLogin.PasswordHash);

        var email = Assert.Single(_api.Emails.Sent);
        Assert.Equal(("Maria@Example.test", "Confirm your email for DevSheet"), (email.To, email.Subject));
        var token = TokenFrom("/confirm-email");
        Assert.Contains("http://localhost:3000/confirm-email?token=", email.Text);
        // Only a hash of the link's token is stored.
        Assert.DoesNotContain(await db.AccountTokens.Select(t => t.TokenHash).ToListAsync(), h => h == token);
    }

    [Fact]
    public async Task Sign_up_with_a_registered_email_answers_the_same_and_tells_the_owner_instead()
    {
        await ConfirmedAccount();
        var first = _api.Emails.Sent.Count;

        var r = await Post(_api.Client(), "/auth/register", new { email = "MARIA@example.test", password = "another password", name = "Someone" });

        Assert.Equal(HttpStatusCode.Accepted, r.StatusCode);
        Assert.Equal("", await r.Content.ReadAsStringAsync());
        using var db = _api.Db();
        Assert.Equal(1, await db.Users.CountAsync());
        var email = Assert.Single(_api.Emails.Sent.Skip(first));
        Assert.Equal(("maria@example.test", "You already have a DevSheet account"), (email.To, email.Subject));
    }

    [Fact]
    public async Task Sign_up_explains_every_field_problem()
    {
        var r = await Post(_api.Client(), "/auth/register", new { email = "not an email", password = "short", name = " " });

        Assert.Equal(HttpStatusCode.BadRequest, r.StatusCode);
        var errors = (await Json(r)).GetProperty("errors");
        Assert.True(errors.TryGetProperty("email", out _));
        Assert.True(errors.TryGetProperty("password", out _));
        Assert.True(errors.TryGetProperty("name", out _));
        Assert.Empty(_api.Emails.Sent);
    }

    [Fact]
    public async Task Confirming_signs_in_and_opens_the_welcome_flow_and_the_link_works_once()
    {
        var client = _api.Client();
        await Post(client, "/auth/register", new { email = "maria@example.test", password = Password, name = "Maria" });
        var token = TokenFrom("/confirm-email");

        var r = await Post(client, "/auth/confirm-email", new { token });

        Assert.Equal(HttpStatusCode.OK, r.StatusCode);
        Assert.Equal("/welcome", (await Json(r)).GetProperty("next").GetString());
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/me")).StatusCode);
        using (var db = _api.Db()) Assert.NotNull((await db.PasswordLogins.SingleAsync()).EmailConfirmedAt);

        var again = await Post(_api.Client(), "/auth/confirm-email", new { token });
        Assert.Equal((HttpStatusCode.BadRequest, "invalid_link"), (again.StatusCode, await Error(again)));
    }

    [Fact]
    public async Task An_expired_confirm_link_says_so()
    {
        await Post(_api.Client(), "/auth/register", new { email = "maria@example.test", password = Password, name = "Maria" });
        var token = TokenFrom("/confirm-email");
        using (var db = _api.Db())
        {
            (await db.AccountTokens.SingleAsync()).ExpiresAt = DateTime.UtcNow.AddMinutes(-1);
            await db.SaveChangesAsync();
        }

        var r = await Post(_api.Client(), "/auth/confirm-email", new { token });

        Assert.Equal((HttpStatusCode.BadRequest, "expired_link"), (r.StatusCode, await Error(r)));
    }

    [Theory]
    [InlineData("nobody@example.test", Password)]
    [InlineData("maria@example.test", "wrong password!")]
    [InlineData("", "")]
    public async Task Wrong_email_or_password_get_the_same_answer(string email, string password)
    {
        await ConfirmedAccount();

        var r = await Post(_api.Client(), "/auth/sign-in", new { email, password });

        Assert.Equal((HttpStatusCode.Unauthorized, "invalid_credentials"), (r.StatusCode, await Error(r)));
    }

    [Fact]
    public async Task An_unconfirmed_account_is_told_to_confirm_only_with_the_right_password()
    {
        await Post(_api.Client(), "/auth/register", new { email = "maria@example.test", password = Password, name = "Maria" });

        var wrong = await Post(_api.Client(), "/auth/sign-in", new { email = "maria@example.test", password = "wrong password!" });
        var right = await Post(_api.Client(), "/auth/sign-in", new { email = "maria@example.test", password = Password });

        Assert.Equal(HttpStatusCode.Unauthorized, wrong.StatusCode);
        Assert.Equal((HttpStatusCode.Forbidden, "email_not_confirmed"), (right.StatusCode, await Error(right)));
    }

    [Theory]
    [InlineData(null, "/dashboard")]
    [InlineData("/settings", "/settings")]
    [InlineData("//evil.example", "/dashboard")]
    public async Task Signing_in_sets_the_cookie_and_returns_a_safe_next_page(string? next, string expected)
    {
        await ConfirmedAccount();
        using (var db = _api.Db())
        {
            (await db.Users.SingleAsync()).OnboardingCompletedAt = DateTime.UtcNow;
            await db.SaveChangesAsync();
        }
        var client = _api.Client();

        var r = await Post(client, "/auth/sign-in", new { email = "Maria@example.TEST", password = Password, next });

        Assert.Equal(HttpStatusCode.OK, r.StatusCode);
        Assert.Equal(expected, (await Json(r)).GetProperty("next").GetString());
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/me")).StatusCode);
    }

    [Fact]
    public async Task Resending_replaces_the_old_confirm_link()
    {
        await Post(_api.Client(), "/auth/register", new { email = "maria@example.test", password = Password, name = "Maria" });
        var old = TokenFrom("/confirm-email");

        Assert.Equal(HttpStatusCode.Accepted, (await Post(_api.Client(), "/auth/resend-confirmation", new { email = "maria@example.test" })).StatusCode);
        var fresh = TokenFrom("/confirm-email");

        Assert.NotEqual(old, fresh);
        Assert.Equal("invalid_link", await Error(await Post(_api.Client(), "/auth/confirm-email", new { token = old })));
        Assert.Equal(HttpStatusCode.OK, (await Post(_api.Client(), "/auth/confirm-email", new { token = fresh })).StatusCode);
    }

    [Theory]
    [InlineData("/auth/resend-confirmation")]
    [InlineData("/auth/forgot-password")]
    public async Task Unknown_emails_get_the_same_answer_and_no_email(string path)
    {
        var r = await Post(_api.Client(), path, new { email = "nobody@example.test" });

        Assert.Equal(HttpStatusCode.Accepted, r.StatusCode);
        Assert.Empty(_api.Emails.Sent);
    }

    [Fact]
    public async Task Resetting_the_password_signs_out_other_sessions_and_signs_in_here()
    {
        var oldSession = await ConfirmedAccount();
        Assert.Equal(HttpStatusCode.OK, (await oldSession.GetAsync("/api/me")).StatusCode);

        await Post(_api.Client(), "/auth/forgot-password", new { email = "maria@example.test" });
        Assert.Equal("Reset your DevSheet password", _api.Emails.Sent[^1].Subject);
        var token = TokenFrom("/reset-password");
        var here = _api.Client();

        // A password problem does not use up the link.
        var tooShort = await Post(here, "/auth/reset-password", new { token, password = "short" });
        Assert.Equal(HttpStatusCode.BadRequest, tooShort.StatusCode);
        Assert.True((await Json(tooShort)).GetProperty("errors").TryGetProperty("password", out _));

        var r = await Post(here, "/auth/reset-password", new { token, password = "a brand new password" });

        Assert.Equal(HttpStatusCode.OK, r.StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await here.GetAsync("/api/me")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await oldSession.GetAsync("/api/me")).StatusCode);
        Assert.Equal("Your DevSheet password was changed", _api.Emails.Sent[^1].Subject);
        Assert.Equal(HttpStatusCode.Unauthorized, (await Post(_api.Client(), "/auth/sign-in", new { email = "maria@example.test", password = Password })).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await Post(_api.Client(), "/auth/sign-in", new { email = "maria@example.test", password = "a brand new password" })).StatusCode);
        Assert.Equal("invalid_link", await Error(await Post(_api.Client(), "/auth/reset-password", new { token, password = "yet another password" })));
    }

    [Fact]
    public async Task A_reset_link_also_confirms_the_email()
    {
        await Post(_api.Client(), "/auth/register", new { email = "maria@example.test", password = Password, name = "Maria" });
        await Post(_api.Client(), "/auth/forgot-password", new { email = "maria@example.test" });

        await Post(_api.Client(), "/auth/reset-password", new { token = TokenFrom("/reset-password"), password = "a brand new password" });

        using var db = _api.Db();
        Assert.NotNull((await db.PasswordLogins.SingleAsync()).EmailConfirmedAt);
    }

    [Fact]
    public async Task A_confirm_link_cannot_reset_a_password()
    {
        await Post(_api.Client(), "/auth/register", new { email = "maria@example.test", password = Password, name = "Maria" });

        var r = await Post(_api.Client(), "/auth/reset-password", new { token = TokenFrom("/confirm-email"), password = "a brand new password" });

        Assert.Equal("invalid_link", await Error(r));
    }

    [Fact]
    public async Task When_the_mail_server_is_down_nothing_is_saved_and_the_user_can_retry()
    {
        _api.Emails.Fail = true;
        var r = await Post(_api.Client(), "/auth/register", new { email = "maria@example.test", password = Password, name = "Maria" });

        Assert.Equal((HttpStatusCode.ServiceUnavailable, "email_unavailable"), (r.StatusCode, await Error(r)));
        using (var db = _api.Db()) Assert.Equal(0, await db.Users.CountAsync());

        _api.Emails.Fail = false;
        Assert.Equal(HttpStatusCode.Accepted, (await Post(_api.Client(), "/auth/register", new { email = "maria@example.test", password = Password, name = "Maria" })).StatusCode);
        Assert.Equal("Confirm your email for DevSheet", Assert.Single(_api.Emails.Sent).Subject);
    }

    [Fact]
    public async Task Forms_posted_from_another_site_are_refused()
    {
        var form = new FormUrlEncodedContent(new Dictionary<string, string> { ["email"] = "maria@example.test", ["password"] = Password });

        var r = await _api.Client().PostAsync("/auth/sign-in", form);

        Assert.Equal(HttpStatusCode.UnsupportedMediaType, r.StatusCode);
    }

    [Fact]
    public async Task A_cookie_from_before_security_stamps_is_signed_out()
    {
        var client = await ConfirmedAccount();
        using (var db = _api.Db())
        {
            (await db.Users.SingleAsync()).SecurityStamp = User.NewSecurityStamp();
            await db.SaveChangesAsync();
        }

        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/me")).StatusCode);
    }
}

public class PasswordAuthRateLimitTests(WebApplicationFactory<Program> factory) : IClassFixture<WebApplicationFactory<Program>>, IDisposable
{
    private readonly ApiHost _api = new(factory, settings: new Dictionary<string, string>
    {
        ["Auth:RateLimits:SignInsPerEmailPer15Minutes"] = "2",
        ["Auth:RateLimits:EmailsPerAddressPerHour"] = "1",
    });

    public void Dispose() => _api.Dispose();

    [Fact]
    public async Task Guessing_one_accounts_password_is_slowed_down()
    {
        HttpResponseMessage? last = null;
        for (var i = 0; i < 3; i++)
            last = await _api.Client().PostAsJsonAsync("/auth/sign-in", new { email = "maria@example.test", password = $"guess number {i}" });

        Assert.Equal(HttpStatusCode.TooManyRequests, last!.StatusCode);
        Assert.NotNull(last.Headers.RetryAfter);
        Assert.Contains("too_many_attempts", await last.Content.ReadAsStringAsync());
        // Another address is not affected.
        Assert.Equal(HttpStatusCode.Unauthorized,
            (await _api.Client().PostAsJsonAsync("/auth/sign-in", new { email = "ivan@example.test", password = "guess" })).StatusCode);
    }

    [Fact]
    public async Task Nobody_can_flood_an_inbox()
    {
        var first = await _api.Client().PostAsJsonAsync("/auth/forgot-password", new { email = "maria@example.test" });
        var second = await _api.Client().PostAsJsonAsync("/auth/forgot-password", new { email = "MARIA@example.test" });

        Assert.Equal(HttpStatusCode.Accepted, first.StatusCode);
        Assert.Equal(HttpStatusCode.TooManyRequests, second.StatusCode);
    }
}
