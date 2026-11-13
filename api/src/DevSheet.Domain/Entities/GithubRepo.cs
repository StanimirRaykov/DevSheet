namespace DevSheet.Domain.Entities;

/// <summary>Synced layer: read-only copy of GitHub data. Only the sync job writes here.</summary>
public class GithubRepo
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public long GithubRepoId { get; set; }
    public string Name { get; set; } = "";
    public string? Description { get; set; }
    public string HtmlUrl { get; set; } = "";
    public int Stars { get; set; }
    public bool IsFork { get; set; }
    public DateTime? PushedAt { get; set; }
    /// <summary>Language name -> bytes, stored as JSON.</summary>
    public string LanguagesJson { get; set; } = "{}";
    public string? ETag { get; set; }
    public bool SourceMissing { get; set; }
}
