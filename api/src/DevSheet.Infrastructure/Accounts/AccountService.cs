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
