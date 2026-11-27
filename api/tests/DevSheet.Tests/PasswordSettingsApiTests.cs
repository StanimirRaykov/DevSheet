using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.RegularExpressions;
using DevSheet.Domain.Entities;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;

namespace DevSheet.Tests;

/// <summary>The Password section of Settings: change a password, or add one to a Google account. Fictional addresses only.</summary>
public class PasswordSettingsApiTests(WebApplicationFactory<Program> factory) : IClassFixture<WebApplicationFactory<Program>>, IDisposable
{
    private const string Password = "correct horse battery";
    private const string NewPassword = "a brand new passphrase";
    private readonly ApiHost _api = new(factory);

    public void Dispose() => _api.Dispose();

    private static async Task<JsonElement> Json(HttpResponseMessage r) => JsonDocument.Parse(await r.Content.ReadAsStringAsync()).RootElement;

    private string TokenFrom(string path) =>
        Uri.UnescapeDataString(Regex.Match(_api.Emails.Sent[^1].Text, $@"{Regex.Escape(path)}\?token=(\S+)").Groups[1].Value);

    /// <summary>Signs up and confirms; returns a client holding the sign-in cookie.</summary>
    private async Task<HttpClient> PasswordAccount(string email = "maria@example.test")
    {
        var client = _api.Client();
        await client.PostAsJsonAsync("/auth/register", new { email, password = Password, name = "Maria Petrova" });
        Assert.Equal(HttpStatusCode.OK, (await client.PostAsJsonAsync("/auth/confirm-email", new { token = TokenFrom("/confirm-email") })).StatusCode);
        return client;
    }

    private async Task<HttpClient> SignedIn(string email, string password)
    {
        var client = _api.Client();
        Assert.Equal(HttpStatusCode.OK, (await client.PostAsJsonAsync("/auth/sign-in", new { email, password })).StatusCode);
        return client;
    }

    private async Task<User> GoogleAccount(string? email = "ana@example.test")
    {
        using var db = _api.Db();
        var user = new User { DisplayName = "Ana Ivanova", Slug = "ana-" + Guid.NewGuid().ToString("N")[..8], Email = email };
        user.Logins.Add(new ExternalLogin { UserId = user.Id, Provider = LoginProviders.Google, ProviderKey = "g-" + user.Id });
        db.Users.Add(user);
        await db.SaveChangesAsync();
        return user;
    }

    [Fact]
    public async Task Status_shows_the_password_email_or_the_account_email_when_there_is_none()
    {
        var withPassword = await (await PasswordAccount()).GetFromJsonAsync<JsonElement>("/api/me/password");
        Assert.True(withPassword.GetProperty("hasPassword").GetBoolean());
        Assert.True(withPassword.GetProperty("emailConfirmed").GetBoolean());
        Assert.Equal("maria@example.test", withPassword.GetProperty("email").GetString());

        var google = await GoogleAccount();
        var without = await _api.Client(google.Id).GetFromJsonAsync<JsonElement>("/api/me/password");
        Assert.False(without.GetProperty("hasPassword").GetBoolean());
        Assert.Equal("ana@example.test", without.GetProperty("email").GetString());
    }

    [Fact]
    public async Task Changing_needs_the_current_password_signs_out_other_sessions_and_keeps_this_one()
    {
        var here = await PasswordAccount();
        var elsewhere = await SignedIn("maria@example.test", Password);
        var before = _api.Emails.Sent.Count;

        var wrong = await here.PostAsJsonAsync("/api/me/password", new { currentPassword = "not it at all", newPassword = NewPassword });
        Assert.Equal(HttpStatusCode.BadRequest, wrong.StatusCode);
        Assert.True((await Json(wrong)).GetProperty("errors").TryGetProperty("currentPassword", out _));

        var r = await here.PostAsJsonAsync("/api/me/password", new { currentPassword = Password, newPassword = NewPassword });

        Assert.Equal(HttpStatusCode.NoContent, r.StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await here.GetAsync("/api/me")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await elsewhere.GetAsync("/api/me")).StatusCode);
        Assert.Equal("Your DevSheet password was changed", Assert.Single(_api.Emails.Sent.Skip(before)).Subject);
        Assert.Equal(HttpStatusCode.Unauthorized, (await _api.Client().PostAsJsonAsync("/auth/sign-in", new { email = "maria@example.test", password = Password })).StatusCode);
        await SignedIn("maria@example.test", NewPassword);
    }

    [Fact]
    public async Task A_weak_new_password_is_refused_as_newPassword()
    {
        var client = await PasswordAccount();

        var r = await client.PostAsJsonAsync("/api/me/password", new { currentPassword = Password, newPassword = "short" });

        Assert.Equal(HttpStatusCode.BadRequest, r.StatusCode);
        Assert.Contains("at least 10", (await Json(r)).GetProperty("errors").GetProperty("newPassword")[0].GetString());
    }

    [Fact]
    public async Task A_google_account_adds_a_password_that_works_after_the_confirm_link()
    {
        var user = await GoogleAccount();
        var client = _api.Client(user.Id);

        var r = await client.PostAsJsonAsync("/api/me/password", new { newPassword = NewPassword });

        Assert.Equal(HttpStatusCode.Accepted, r.StatusCode);
        var email = _api.Emails.Sent[^1];
        Assert.Equal(("ana@example.test", "Confirm your email for DevSheet"), (email.To, email.Subject));
        Assert.Equal(HttpStatusCode.Forbidden, (await _api.Client().PostAsJsonAsync("/auth/sign-in", new { email = "ana@example.test", password = NewPassword })).StatusCode);

        Assert.Equal(HttpStatusCode.OK, (await _api.Client().PostAsJsonAsync("/auth/confirm-email", new { token = TokenFrom("/confirm-email") })).StatusCode);
        var signedIn = await SignedIn("ana@example.test", NewPassword);
        Assert.Contains(user.Id.ToString(), await signedIn.GetStringAsync("/api/me"));
        // Now Google can be removed: the password is another way in.
        Assert.Equal(HttpStatusCode.NoContent, (await client.DeleteAsync("/api/me/logins/google")).StatusCode);
    }

    [Fact]
    public async Task Adding_can_use_another_email_but_not_one_that_signs_in_elsewhere()
    {
        await PasswordAccount("taken@example.test");
        var user = await GoogleAccount(email: null);
        var client = _api.Client(user.Id);

        var none = await client.PostAsJsonAsync("/api/me/password", new { newPassword = NewPassword });
        Assert.True((await Json(none)).GetProperty("errors").TryGetProperty("email", out _));
        var taken = await client.PostAsJsonAsync("/api/me/password", new { newPassword = NewPassword, email = "TAKEN@example.test" });
        Assert.Equal(HttpStatusCode.BadRequest, taken.StatusCode);
        Assert.Contains("another DevSheet account", (await Json(taken)).GetProperty("errors").GetProperty("email")[0].GetString());

        Assert.Equal(HttpStatusCode.Accepted, (await client.PostAsJsonAsync("/api/me/password", new { newPassword = NewPassword, email = "ana.work@example.test" })).StatusCode);
        Assert.Equal("ana.work@example.test", _api.Emails.Sent[^1].To);
    }

    [Fact]
    public async Task Adding_when_the_mail_server_is_down_is_503_and_saves_nothing()
    {
        var user = await GoogleAccount();
        _api.Emails.Fail = true;

        var r = await _api.Client(user.Id).PostAsJsonAsync("/api/me/password", new { newPassword = NewPassword });

        Assert.Equal(HttpStatusCode.ServiceUnavailable, r.StatusCode);
        using var db = _api.Db();
        Assert.False(await db.PasswordLogins.AnyAsync(l => l.UserId == user.Id));
    }

    [Fact]
    public async Task Signed_out_is_401()
    {
        Assert.Equal(HttpStatusCode.Unauthorized, (await _api.Client().GetAsync("/api/me/password")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await _api.Client().PostAsJsonAsync("/api/me/password", new { newPassword = NewPassword })).StatusCode);
    }
}
