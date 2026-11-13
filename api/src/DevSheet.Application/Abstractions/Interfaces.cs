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
