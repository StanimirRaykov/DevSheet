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
