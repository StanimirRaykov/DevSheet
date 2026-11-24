using DevSheet.Domain.Entities;

namespace DevSheet.Application.Career;

// Nullable on purpose: a missing field is a validation error, not a model-binding crash.
public record ProfileInput(
    string? FullName, string? Headline, string? Summary, string? Location, string? Email,
    bool ShowEmailPublicly, bool ShowLocationPublicly, string? Website = null,
    string? Phone = null, string? CountryCode = null, bool ShowPhonePublicly = false);

public record ExperienceInput(string? Company, string? Title, DateOnly? StartDate, DateOnly? EndDate, string? Description);

public record EducationInput(string? Institution, string? Degree, DateOnly? StartDate, DateOnly? EndDate);

public record LanguageInput(
    string? Name, string? IsoCode, bool IsMotherTongue,
    CefrLevel? Listening, CefrLevel? Reading, CefrLevel? SpokenInteraction, CefrLevel? SpokenProduction, CefrLevel? Writing);

public record CertificationInput(string? Name, string? Issuer, DateOnly? IssueDate, string? Url);
