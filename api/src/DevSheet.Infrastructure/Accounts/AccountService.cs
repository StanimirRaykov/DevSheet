using DevSheet.Application.Abstractions;
using DevSheet.Domain;
using DevSheet.Domain.Entities;
using DevSheet.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace DevSheet.Infrastructure.Accounts;

/// <summary>Who a provider says signed in. <see cref="ProviderKey"/> is the provider's stable user id.</summary>
public record ExternalIdentity(string Provider, string ProviderKey, string DisplayName, string? Email = null, string? AvatarUrl = null);

/// <summary>A GitHub account and its OAuth token (plain text; encrypted before it is stored).</summary>
public record GithubGrant(long GithubId, string Login, string AccessToken);

/// <summary>Why the OAuth round trip was started.</summary>
public enum AuthIntent
{
    /// <summary>Sign in (or sign up) with a provider.</summary>
    SignIn,
    /// <summary>Add another sign-in method to the signed-in account (from Settings).</summary>
    Link,
    /// <summary>Connect a GitHub account to the signed-in account, for syncing repositories.</summary>
    ConnectGithub,
}

/// <summary>
/// The result of an OAuth round trip. <see cref="UserId"/> is who is signed in afterwards (null: nobody, the
/// sign-in is refused). <see cref="Error"/> is one of <see cref="AuthErrors"/>, shown by the web app.
/// </summary>
public record AuthOutcome(Guid? UserId, string? Error = null);

/// <summary>Error codes the API hands to the web app (as ?error=) after an OAuth round trip.</summary>
public static class AuthErrors
{
    /// <summary>Link or connect was started, but the session had ended by the time the provider sent the user back.</summary>
    public const string SignedOut = "signed_out";
    /// <summary>That provider account already signs in to another DevSheet account.</summary>
    public const string LoginInUse = "login_in_use";
    /// <summary>This account already has a different login with that provider (one per provider).</summary>
    public const string ProviderAlreadyLinked = "provider_already_linked";
    /// <summary>That GitHub account is connected to another DevSheet account.</summary>
    public const string GithubInUse = "github_in_use";
    /// <summary>A different GitHub account is already connected; disconnect it first.</summary>
    public const string GithubAlreadyConnected = "github_already_connected";
    /// <summary>The provider refused or the user cancelled.</summary>
    public const string SignInFailed = "sign_in_failed";
}

public enum UnlinkResult { Unlinked, NotLinked, LastSignInMethod }

/// <summary>Accounts, their sign-in methods and their GitHub connection.</summary>
public class AccountService(AppDbContext db, ITokenProtector tokens, TimeProvider clock)
{
    /// <summary>
    /// Signs in with a provider: finds the account that owns this (provider, key), or creates a new one.
    /// Never matches by email: the same email on another provider still makes a separate account
    /// (linking happens only while signed in, from Settings). A GitHub sign-in also connects GitHub.
    /// </summary>
    public async Task<User> SignInAsync(ExternalIdentity identity, GithubGrant? github = null, CancellationToken ct = default)
    {
        var now = clock.GetUtcNow().UtcDateTime;
        var user = await db.Users.Include(u => u.GithubConnection)
            .FirstOrDefaultAsync(u => u.Logins.Any(l => l.Provider == identity.Provider && l.ProviderKey == identity.ProviderKey), ct);

        if (user is null)
        {
            user = new User
            {
                DisplayName = identity.DisplayName,
                Email = identity.Email,
                AvatarUrl = identity.AvatarUrl,
                Slug = await FreeSlugAsync(github?.Login ?? identity.DisplayName, ct),
                CreatedAt = now,
            };
            user.Logins.Add(new ExternalLogin
            {
                UserId = user.Id, Provider = identity.Provider, ProviderKey = identity.ProviderKey,
                Email = identity.Email, CreatedAt = now,
            });
            db.Users.Add(user);
        }
        else if (identity.AvatarUrl is not null)
        {
            user.AvatarUrl = identity.AvatarUrl;
        }

        if (github is not null) await RefreshGithubAsync(user, github, now, ct);
        await db.SaveChangesAsync(ct);
        return user;
    }

    /// <summary>Finishes an OAuth round trip for any <see cref="AuthIntent"/>.</summary>
    /// <param name="currentUserId">Who is signed in on this browser right now (from the cookie), if anyone.</param>
    public async Task<AuthOutcome> CompleteAsync(
        AuthIntent intent, Guid? currentUserId, ExternalIdentity identity, GithubGrant? github = null, CancellationToken ct = default)
    {
        if (intent == AuthIntent.SignIn)
            return new AuthOutcome((await SignInAsync(identity, github, ct)).Id);

        if (currentUserId is not { } uid || !await db.Users.AnyAsync(u => u.Id == uid, ct))
            return new AuthOutcome(null, AuthErrors.SignedOut);

        var error = intent == AuthIntent.Link
            ? await LinkAsync(uid, identity, ct)
            : github is null ? AuthErrors.SignInFailed : await ConnectGithubAsync(uid, github, ct);
        // Link and connect never switch accounts: the same user stays signed in, with or without an error.
        return new AuthOutcome(uid, error);
    }

    /// <summary>Adds a sign-in method to an account. Returns an <see cref="AuthErrors"/> code, or null when linked.</summary>
    public async Task<string?> LinkAsync(Guid userId, ExternalIdentity identity, CancellationToken ct = default)
    {
        var owner = await db.ExternalLogins
            .Where(l => l.Provider == identity.Provider && l.ProviderKey == identity.ProviderKey)
            .Select(l => (Guid?)l.UserId).FirstOrDefaultAsync(ct);
        if (owner == userId) return null; // already linked here
        if (owner is not null) return AuthErrors.LoginInUse;
        if (await db.ExternalLogins.AnyAsync(l => l.UserId == userId && l.Provider == identity.Provider, ct))
            return AuthErrors.ProviderAlreadyLinked;

        db.ExternalLogins.Add(new ExternalLogin
        {
            UserId = userId, Provider = identity.Provider, ProviderKey = identity.ProviderKey,
            Email = identity.Email, CreatedAt = clock.GetUtcNow().UtcDateTime,
        });
        await db.SaveChangesAsync(ct);
        return null;
    }

    /// <summary>Removes a sign-in method. The last one can never be removed, or the account could not be reached.</summary>
    public async Task<UnlinkResult> UnlinkAsync(Guid userId, string provider, CancellationToken ct = default)
    {
        var logins = await db.ExternalLogins.Where(l => l.UserId == userId).ToListAsync(ct);
        var login = logins.FirstOrDefault(l => l.Provider == provider);
        if (login is null) return UnlinkResult.NotLinked;
        if (logins.Count == 1) return UnlinkResult.LastSignInMethod;

        db.ExternalLogins.Remove(login);
        await db.SaveChangesAsync(ct);
        return UnlinkResult.Unlinked;
    }

    /// <summary>Connects a GitHub account for syncing. Returns an <see cref="AuthErrors"/> code, or null when connected.</summary>
    public async Task<string?> ConnectGithubAsync(Guid userId, GithubGrant github, CancellationToken ct = default)
    {
        var owner = await db.GithubConnections.Where(c => c.GithubId == github.GithubId)
            .Select(c => (Guid?)c.UserId).FirstOrDefaultAsync(ct);
        if (owner is not null && owner != userId) return AuthErrors.GithubInUse;

        var connection = await db.GithubConnections.FirstOrDefaultAsync(c => c.UserId == userId, ct);
        if (connection is not null && connection.GithubId != github.GithubId) return AuthErrors.GithubAlreadyConnected;
        if (connection is null)
        {
            connection = new GithubConnection { UserId = userId, GithubId = github.GithubId, ConnectedAt = clock.GetUtcNow().UtcDateTime };
            db.GithubConnections.Add(connection);
        }
        connection.Login = github.Login;
        connection.EncryptedToken = tokens.Protect(github.AccessToken);
        await db.SaveChangesAsync(ct);
        return null;
    }

    /// <summary>
    /// Deletes the GitHub connection and its token. Synced repositories and the projects built on them are kept,
    /// flagged as source missing (the same as a repository deleted on GitHub). Returns false when nothing was connected.
    /// </summary>
    public async Task<bool> DisconnectGithubAsync(Guid userId, CancellationToken ct = default)
    {
        var connection = await db.GithubConnections.FirstOrDefaultAsync(c => c.UserId == userId, ct);
        if (connection is null) return false;

        db.GithubConnections.Remove(connection);
        foreach (var repo in await db.GithubRepos.Where(r => r.UserId == userId).ToListAsync(ct))
            repo.SourceMissing = true;
        await db.SaveChangesAsync(ct);
        return true;
    }

    /// <summary>
    /// Keeps the token of the user's GitHub connection fresh, or creates the connection when the user has none
    /// and this GitHub account does not already feed another DevSheet account.
    /// </summary>
    private async Task RefreshGithubAsync(User user, GithubGrant github, DateTime now, CancellationToken ct)
    {
        var connection = user.GithubConnection;
        if (connection is null)
        {
            if (await db.GithubConnections.AnyAsync(c => c.GithubId == github.GithubId, ct)) return;
            user.GithubConnection = connection = new GithubConnection { UserId = user.Id, GithubId = github.GithubId, ConnectedAt = now };
        }
        else if (connection.GithubId != github.GithubId)
        {
            return; // signed in with one GitHub account but syncing from another: leave the connection alone
        }
        connection.Login = github.Login;
        connection.EncryptedToken = tokens.Protect(github.AccessToken);
    }

    private async Task<string> FreeSlugAsync(string name, CancellationToken ct)
    {
        foreach (var slug in SlugRules.Candidates(name))
            if (!await db.Users.AnyAsync(u => u.Slug == slug, ct) && !db.Users.Local.Any(u => u.Slug == slug))
                return slug;
        throw new InvalidOperationException("unreachable: Candidates is infinite");
    }
}
