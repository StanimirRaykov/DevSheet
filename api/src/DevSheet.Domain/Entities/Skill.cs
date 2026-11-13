namespace DevSheet.Domain.Entities;

public enum LinkStatus { Suggested = 0, Confirmed = 1, Rejected = 2 }

public class Skill
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = "";
    /// <summary>Optional ESCO concept URI for canonical mapping (Europass alignment).</summary>
    public string? EscoUri { get; set; }
}

/// <summary>Skill-to-project link. Rejected rows are kept so dismissed suggestions are not re-proposed.</summary>
public class ProjectSkill
{
    public Guid ProjectId { get; set; }
    public Project? Project { get; set; }
    public Guid SkillId { get; set; }
    public Skill? Skill { get; set; }
    public LinkStatus Status { get; set; } = LinkStatus.Suggested;
}
