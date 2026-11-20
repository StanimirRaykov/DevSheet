namespace DevSheet.Domain.Entities;

/// <summary>
/// The GitHub account an account syncs repositories from (0 or 1 per user). Separate from signing in:
/// someone who signs in with Google can still connect GitHub, and disconnecting it keeps the account.
/// </summary>
public class GithubConnection
{
    public Guid UserId { get; set; }
    /// <summary>GitHub's numeric id (logins can be renamed). One GitHub account feeds at most one DevSheet account.</summary>
    public long GithubId { get; set; }
    public string Login { get; set; } = "";
    /// <summary>OAuth token, encrypted with Data Protection. Never sent to the browser.</summary>
    public string EncryptedToken { get; set; } = "";
    public DateTime ConnectedAt { get; set; } = DateTime.UtcNow;
    public DateTime? LastSyncedAt { get; set; }
}
