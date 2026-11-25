namespace DevSheet.Application.Abstractions;

public interface ITokenProtector
{
    string Protect(string plain);
    string Unprotect(string protectedValue);
}

public interface IGitHubSyncService
{
    /// <summary>Fetches public repos for the user and updates the synced layer. New repos become Pending projects.</summary>
    Task<int> SyncAsync(Guid userId, CancellationToken ct = default);
}

public record RemoteRepo(
    long Id, string Name, string? Description, string HtmlUrl, int Stars,
    bool IsFork, DateTime? PushedAt, IReadOnlyDictionary<string, long> Languages);

/// <summary>Seam over the GitHub API so sync logic can be tested without network calls.</summary>
public interface IGitHubRepoSource
{
    Task<IReadOnlyList<RemoteRepo>> GetPublicReposAsync(string login, string token, int max, CancellationToken ct = default);
}

/// <summary>An email to one person. <see cref="Text"/> is always sent; <see cref="Html"/> is the same content, formatted.</summary>
public record EmailMessage(string To, string Subject, string Text, string Html);

/// <summary>
/// Sends account emails (confirm address, reset password). SMTP in every environment: Mailpit in development,
/// a real provider once there is a domain. Tests replace it with a recorder.
/// </summary>
public interface IEmailSender
{
    Task SendAsync(EmailMessage message, CancellationToken ct = default);
}
