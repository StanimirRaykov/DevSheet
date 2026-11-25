using DevSheet.Domain.Entities;
using DevSheet.Infrastructure.Accounts;
using Microsoft.EntityFrameworkCore;

namespace DevSheet.Tests;

public class AccountServiceTests : IDisposable
{
    private readonly TestDb _t = new();
    private readonly FakeClock _clock = new(new DateTimeOffset(2026, 11, 20, 10, 0, 0, TimeSpan.Zero));
    private AccountService Accounts => new(_t.Db, new PassthroughProtector(), _clock);

    private static ExternalIdentity GitHub(long id, string login = "maria-p", string? email = "maria@example.com") =>
        new(LoginProviders.GitHub, id.ToString(), "Maria P", email, "https://avatars.example/1");

    private static GithubGrant Grant(long id, string login = "maria-p", string token = "gho_1") => new(id, login, token);

    private static ExternalIdentity Google(string key, string name = "Maria P", string? email = "maria@example.com") =>
        new(LoginProviders.Google, key, name, email);

    [Fact]
    public async Task First_google_sign_in_creates_the_account_and_its_login()
    {
        var user = await Accounts.SignInAsync(Google("g-1"));

        var saved = await _t.Db.Users.Include(u => u.Logins).SingleAsync();
        Assert.Equal(user.Id, saved.Id);
        Assert.Equal(("Maria P", "maria@example.com", "maria-p"), (saved.DisplayName, saved.Email, saved.Slug));
        Assert.Equal(_clock.GetUtcNow().UtcDateTime, saved.CreatedAt);
        var login = Assert.Single(saved.Logins);
        Assert.Equal((LoginProviders.Google, "g-1"), (login.Provider, login.ProviderKey));
        Assert.Null(await _t.Db.GithubConnections.FirstOrDefaultAsync());
    }

    [Fact]
    public async Task Second_sign_in_finds_the_same_account()
    {
        var first = await Accounts.SignInAsync(Google("g-1"));
        var second = await Accounts.SignInAsync(Google("g-1", "Maria Renamed"));

        Assert.Equal(first.Id, second.Id);
        Assert.Equal((1, 1), (await _t.Db.Users.CountAsync(), await _t.Db.ExternalLogins.CountAsync()));
    }

    [Fact]
    public async Task Github_can_never_sign_in()
    {
        await Assert.ThrowsAsync<ArgumentException>(() => Accounts.SignInAsync(GitHub(42)));

        // Also not when a GitHub round trip comes back as a sign-in or a link (an old or tampered start).
        Assert.Equal(new AuthOutcome(null, AuthErrors.SignInFailed), await Accounts.CompleteAsync(AuthIntent.SignIn, null, GitHub(42), Grant(42)));
        var user = await Accounts.SignInAsync(Google("g-1"));
        Assert.Equal(new AuthOutcome(null, AuthErrors.SignInFailed), await Accounts.CompleteAsync(AuthIntent.Link, user.Id, GitHub(42), Grant(42)));

        Assert.Equal(1, await _t.Db.Users.CountAsync());
        Assert.False(await _t.Db.ExternalLogins.AnyAsync(l => l.Provider == LoginProviders.GitHub));
        Assert.False(await _t.Db.GithubConnections.AnyAsync());
    }

    [Fact]
    public async Task Slug_comes_from_the_display_name_and_is_made_unique()
    {
        var a = await Accounts.SignInAsync(Google("g-1", "María López"));
        var b = await Accounts.SignInAsync(Google("g-2", "Maria Lopez"));
        var c = await Accounts.SignInAsync(Google("g-3", "Settings"));

        Assert.Equal(("maria-lopez", "maria-lopez-2", "settings-2"), (a.Slug, b.Slug, c.Slug));
    }

    [Fact]
    public async Task Linking_adds_a_second_sign_in_method_to_the_same_account()
    {
        var user = _t.AddUser("ana");

        Assert.Null(await Accounts.LinkAsync(user.Id, Google("g-1")));
        Assert.Null(await Accounts.LinkAsync(user.Id, Google("g-1"))); // again: nothing changes

        Assert.Equal(1, await _t.Db.ExternalLogins.CountAsync(l => l.UserId == user.Id));
        Assert.Equal(user.Id, (await Accounts.SignInAsync(Google("g-1"))).Id);
    }

    [Fact]
    public async Task Linking_a_provider_account_that_belongs_to_another_account_is_refused()
    {
        var other = await Accounts.SignInAsync(Google("g-1"));
        var user = _t.AddUser("ana");

        Assert.Equal(AuthErrors.LoginInUse, await Accounts.LinkAsync(user.Id, Google("g-1")));
        Assert.Equal(other.Id, (await _t.Db.ExternalLogins.SingleAsync(l => l.Provider == LoginProviders.Google)).UserId);
    }

    [Fact]
    public async Task One_login_per_provider()
    {
        var user = await Accounts.SignInAsync(Google("g-1"));

        Assert.Equal(AuthErrors.ProviderAlreadyLinked, await Accounts.LinkAsync(user.Id, Google("g-2")));
    }

    [Fact]
    public async Task Unlinking_the_last_sign_in_method_is_refused()
    {
        var user = _t.AddUser("ana"); // has a GitHub connection, which is not a sign-in method
        await Accounts.LinkAsync(user.Id, Google("g-1"));

        Assert.Equal(UnlinkResult.NotLinked, await Accounts.UnlinkAsync(user.Id, LoginProviders.Apple));
        Assert.Equal(UnlinkResult.LastSignInMethod, await Accounts.UnlinkAsync(user.Id, LoginProviders.Google));
        Assert.True(await _t.Db.GithubConnections.AnyAsync(c => c.UserId == user.Id));
    }

    [Theory]
    [InlineData(true, UnlinkResult.Unlinked)]
    [InlineData(false, UnlinkResult.LastSignInMethod)] // an unconfirmed password cannot sign in yet
    public async Task A_password_counts_as_a_sign_in_method_once_confirmed(bool confirmed, UnlinkResult expected)
    {
        var user = _t.AddUser("ana");
        await Accounts.LinkAsync(user.Id, Google("g-1"));
        _t.Db.PasswordLogins.Add(new PasswordLogin
        {
            UserId = user.Id, Email = "ana@example.test", NormalizedEmail = PasswordLogin.Normalize("ana@example.test"),
            PasswordHash = "x", EmailConfirmedAt = confirmed ? _clock.GetUtcNow().UtcDateTime : null,
        });
        await _t.Db.SaveChangesAsync();

        Assert.Equal(expected, await Accounts.UnlinkAsync(user.Id, LoginProviders.Google));
    }

    [Fact]
    public async Task Connecting_github_to_a_google_account()
    {
        var user = await Accounts.SignInAsync(Google("g-1"));

        Assert.Null(await Accounts.ConnectGithubAsync(user.Id, Grant(42, "maria-p", "gho_1")));
        Assert.Null(await Accounts.ConnectGithubAsync(user.Id, Grant(42, "maria-p", "gho_2"))); // reconnect refreshes the token

        var connection = await _t.Db.GithubConnections.SingleAsync();
        Assert.Equal((user.Id, 42L, "gho_2"), (connection.UserId, connection.GithubId, connection.EncryptedToken));
        Assert.False(await _t.Db.ExternalLogins.AnyAsync(l => l.Provider == LoginProviders.GitHub)); // connecting is not a sign-in method
    }

    [Fact]
    public async Task Connecting_a_github_account_used_elsewhere_or_a_second_one_is_refused()
    {
        var other = await Accounts.SignInAsync(Google("g-0", "Other"));
        Assert.Null(await Accounts.ConnectGithubAsync(other.Id, Grant(42)));
        var user = await Accounts.SignInAsync(Google("g-1"));

        Assert.Equal(AuthErrors.GithubInUse, await Accounts.ConnectGithubAsync(user.Id, Grant(42)));
        Assert.Null(await Accounts.ConnectGithubAsync(user.Id, Grant(43, "second")));
        Assert.Equal(AuthErrors.GithubAlreadyConnected, await Accounts.ConnectGithubAsync(user.Id, Grant(44, "third")));
    }

    [Fact]
    public async Task Link_or_connect_without_a_session_signs_nobody_in()
    {
        var outcome = await Accounts.CompleteAsync(AuthIntent.Link, currentUserId: null, Google("g-1"));

        Assert.Equal(new AuthOutcome(null, AuthErrors.SignedOut), outcome);
        Assert.False(await _t.Db.Users.AnyAsync());
    }

    [Fact]
    public async Task A_refused_link_keeps_the_current_user_signed_in_and_reports_why()
    {
        await Accounts.SignInAsync(Google("g-1"));
        var user = _t.AddUser("ana");

        var outcome = await Accounts.CompleteAsync(AuthIntent.Link, user.Id, Google("g-1"));

        Assert.Equal(new AuthOutcome(user.Id, AuthErrors.LoginInUse), outcome);
    }

    [Fact]
    public async Task Connect_through_complete_uses_the_github_grant()
    {
        var user = await Accounts.SignInAsync(Google("g-1"));

        var outcome = await Accounts.CompleteAsync(AuthIntent.ConnectGithub, user.Id, GitHub(42), Grant(42));

        Assert.Equal(new AuthOutcome(user.Id), outcome);
        Assert.Equal(user.Id, (await _t.Db.GithubConnections.SingleAsync()).UserId);
    }

    public void Dispose() => _t.Dispose();
}
