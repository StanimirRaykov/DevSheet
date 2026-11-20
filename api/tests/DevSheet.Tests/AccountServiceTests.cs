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
    public async Task First_github_sign_in_creates_the_account_its_login_and_the_connection()
    {
        var user = await Accounts.SignInAsync(GitHub(42), Grant(42));

        var saved = await _t.Db.Users.Include(u => u.Logins).Include(u => u.GithubConnection).SingleAsync();
        Assert.Equal(user.Id, saved.Id);
        Assert.Equal("Maria P", saved.DisplayName);
        Assert.Equal("maria@example.com", saved.Email);
        Assert.Equal("maria-p", saved.Slug);
        Assert.Equal(_clock.GetUtcNow().UtcDateTime, saved.CreatedAt);
        var login = Assert.Single(saved.Logins);
        Assert.Equal((LoginProviders.GitHub, "42"), (login.Provider, login.ProviderKey));
        Assert.Equal((42L, "maria-p", "gho_1"), (saved.GithubConnection!.GithubId, saved.GithubConnection.Login, saved.GithubConnection.EncryptedToken));
    }

    [Fact]
    public async Task Second_github_sign_in_finds_the_same_account_and_refreshes_the_token()
    {
        var first = await Accounts.SignInAsync(GitHub(42), Grant(42));
        var second = await Accounts.SignInAsync(GitHub(42, login: "maria-renamed"), Grant(42, "maria-renamed", "gho_2"));

        Assert.Equal(first.Id, second.Id);
        Assert.Equal(1, await _t.Db.Users.CountAsync());
        Assert.Equal(1, await _t.Db.ExternalLogins.CountAsync());
        var connection = await _t.Db.GithubConnections.SingleAsync();
        Assert.Equal(("maria-renamed", "gho_2"), (connection.Login, connection.EncryptedToken));
        Assert.Equal("maria-p", (await _t.Db.Users.SingleAsync()).Slug); // a GitHub rename never moves the public page
    }

    [Fact]
    public async Task Google_sign_in_with_the_same_email_as_a_github_account_makes_a_separate_account()
    {
        var github = await Accounts.SignInAsync(GitHub(42), Grant(42));
        var google = await Accounts.SignInAsync(Google("g-1"));

        Assert.NotEqual(github.Id, google.Id);
        Assert.Equal(2, await _t.Db.Users.CountAsync());
        Assert.Null((await _t.Db.Users.Include(u => u.GithubConnection).SingleAsync(u => u.Id == google.Id)).GithubConnection);
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
    public async Task Github_sign_in_reconnects_github_when_the_connection_was_removed()
    {
        var user = await Accounts.SignInAsync(GitHub(42), Grant(42));
        _t.Db.GithubConnections.Remove(await _t.Db.GithubConnections.SingleAsync());
        await _t.Db.SaveChangesAsync();

        await Accounts.SignInAsync(GitHub(42), Grant(42, token: "gho_new"));

        var connection = await _t.Db.GithubConnections.SingleAsync();
        Assert.Equal((user.Id, "gho_new"), (connection.UserId, connection.EncryptedToken));
    }

    [Fact]
    public async Task A_github_account_feeds_at_most_one_devsheet_account()
    {
        // Account A syncs from GitHub 42. Account B signs in with a GitHub login whose id is also 42
        // (possible once B has linked it some other way): B gets no second connection to the same GitHub account.
        var a = _t.AddUser("ana");
        var gh = await _t.Db.GithubConnections.SingleAsync(c => c.UserId == a.Id);

        var b = await Accounts.SignInAsync(GitHub(gh.GithubId, "ana"), Grant(gh.GithubId, "ana", "gho_b"));

        Assert.NotEqual(a.Id, b.Id);
        Assert.Equal(1, await _t.Db.GithubConnections.CountAsync());
        Assert.Equal("enc", (await _t.Db.GithubConnections.SingleAsync()).EncryptedToken);
    }

    [Fact]
    public async Task Linking_adds_a_second_sign_in_method_to_the_same_account()
    {
        var user = await Accounts.SignInAsync(GitHub(42), Grant(42));

        Assert.Null(await Accounts.LinkAsync(user.Id, Google("g-1")));
        Assert.Null(await Accounts.LinkAsync(user.Id, Google("g-1"))); // again: nothing changes

        Assert.Equal(2, await _t.Db.ExternalLogins.CountAsync(l => l.UserId == user.Id));
        Assert.Equal(user.Id, (await Accounts.SignInAsync(Google("g-1"))).Id);
    }

    [Fact]
    public async Task Linking_a_provider_account_that_belongs_to_another_account_is_refused()
    {
        var other = await Accounts.SignInAsync(Google("g-1"));
        var user = await Accounts.SignInAsync(GitHub(42), Grant(42));

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
        var user = await Accounts.SignInAsync(GitHub(42), Grant(42));
        await Accounts.LinkAsync(user.Id, Google("g-1"));

        Assert.Equal(UnlinkResult.NotLinked, await Accounts.UnlinkAsync(user.Id, LoginProviders.Apple));
        Assert.Equal(UnlinkResult.Unlinked, await Accounts.UnlinkAsync(user.Id, LoginProviders.GitHub));
        Assert.Equal(UnlinkResult.LastSignInMethod, await Accounts.UnlinkAsync(user.Id, LoginProviders.Google));
        // Unlinking GitHub as a sign-in method keeps GitHub connected for sync.
        Assert.True(await _t.Db.GithubConnections.AnyAsync(c => c.UserId == user.Id));
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
        await Accounts.SignInAsync(GitHub(42), Grant(42));
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
        var user = await Accounts.SignInAsync(GitHub(42), Grant(42));

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
