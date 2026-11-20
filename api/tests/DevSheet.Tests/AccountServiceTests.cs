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

    public void Dispose() => _t.Dispose();
}
