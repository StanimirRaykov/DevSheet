using DevSheet.Domain.Entities;

namespace DevSheet.Application.Cv;

public record CvLanguage(
    string Name, bool IsMotherTongue,
    CefrLevel? Listening, CefrLevel? Reading, CefrLevel? SpokenInteraction, CefrLevel? SpokenProduction, CefrLevel? Writing);
public record CvCertification(string Name, string Issuer, DateOnly? Date, string? Url);
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
    IReadOnlyList<CvProject> Projects)
{
    // Init-only (not positional) so existing callers keep compiling; the modern template does not use them yet.
    public IReadOnlyList<CvLanguage> Languages { get; init; } = [];
    public IReadOnlyList<CvCertification> Certifications { get; init; } = [];
}
