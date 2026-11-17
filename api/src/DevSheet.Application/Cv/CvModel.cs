namespace DevSheet.Application.Cv;

public record CvProject(string Title, string? Description, string Url, IReadOnlyList<string> Skills);
public record CvExperience(string Title, string Company, DateOnly Start, DateOnly? End, string Description);
public record CvEducation(string Institution, string Degree, DateOnly? Start, DateOnly? End);

/// <summary>
/// Everything a CV template needs, already filtered to what may appear: only Visible projects, only Confirmed skills.
/// Templates render this model and never touch the database.
/// </summary>
public record CvModel(
    string Name, string Headline, string Summary, string Email, string Location, string GithubUrl,
    IReadOnlyList<string> Skills,
    IReadOnlyList<CvExperience> Experience,
    IReadOnlyList<CvEducation> Education,
    IReadOnlyList<CvProject> Projects);
