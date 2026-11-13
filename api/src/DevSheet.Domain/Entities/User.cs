namespace DevSheet.Domain.Entities;

public class User
{
    public Guid Id { get; set; } = Guid.NewGuid();
    /// <summary>GitHub numeric id: the stable identity key (logins can be renamed).</summary>
    public long GithubId { get; set; }
    public string GithubLogin { get; set; } = "";
    /// <summary>Public URL slug (/slug). Defaults to the GitHub login.</summary>
    public string Slug { get; set; } = "";
    public bool IsPublished { get; set; }
    public string? EncryptedGithubToken { get; set; }
    public DateTime? LastSyncedAt { get; set; }

    public Profile? Profile { get; set; }
    public List<GithubRepo> Repos { get; set; } = new();
    public List<Project> Projects { get; set; } = new();
    public List<WorkExperience> WorkExperiences { get; set; } = new();
    public List<Education> Educations { get; set; } = new();
}
