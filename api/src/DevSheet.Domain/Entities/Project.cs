namespace DevSheet.Domain.Entities;

public enum ProjectStatus { Pending = 0, Visible = 1, Hidden = 2 }

/// <summary>User layer: the source of truth for the portfolio. Survives re-sync.</summary>
public class Project
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public Guid? GithubRepoId { get; set; }
    public GithubRepo? GithubRepo { get; set; }
    public string? TitleOverride { get; set; }
    public string? DescriptionOverride { get; set; }
    /// <summary>New repos arrive Pending and are never public until the user approves.</summary>
    public ProjectStatus Status { get; set; } = ProjectStatus.Pending;
    public int DisplayOrder { get; set; }
    public List<ProjectSkill> Skills { get; set; } = new();
}
