namespace DevSheet.Application.Career;

// Nullable on purpose: a missing field is a validation error, not a model-binding crash.
public record ProfileInput(
    string? FullName, string? Headline, string? Summary, string? Location, string? Email,
    bool ShowEmailPublicly, bool ShowLocationPublicly);

public record ExperienceInput(string? Company, string? Title, DateOnly? StartDate, DateOnly? EndDate, string? Description);

public record EducationInput(string? Institution, string? Degree, DateOnly? StartDate, DateOnly? EndDate);
