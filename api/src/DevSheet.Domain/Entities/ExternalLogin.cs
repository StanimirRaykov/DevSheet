namespace DevSheet.Domain.Entities;

/// <summary>One way to sign in to an account. Unique by (Provider, ProviderKey).</summary>
public class ExternalLogin
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    /// <summary>One of <see cref="LoginProviders"/>.</summary>
    public string Provider { get; set; } = "";
    /// <summary>The provider's stable user id. Never the email: emails change and can be reused.</summary>
    public string ProviderKey { get; set; } = "";
    public string? Email { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public User? User { get; set; }
}

public static class LoginProviders
{
    /// <summary>
    /// Only as a connection (<see cref="GithubConnection"/>), never to sign in. Kept here because the OAuth plumbing
    /// and URLs (/auth/github/connect) use the same provider names.
    /// </summary>
    public const string GitHub = "github";
    public const string Google = "google";
    public const string Apple = "apple";

    /// <summary>Providers that sign in (and can be linked in Settings).</summary>
    public static readonly IReadOnlySet<string> SignIn = new HashSet<string> { Google, Apple };
}
