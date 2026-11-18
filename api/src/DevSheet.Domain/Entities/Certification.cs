namespace DevSheet.Domain.Entities;

/// <summary>A certificate or diploma. Title/issuer/date follow the Europass "Certificate" element; Url is our own addition for the portfolio.</summary>
public class Certification
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public string Name { get; set; } = "";
    public string Issuer { get; set; } = "";
    public DateOnly? IssueDate { get; set; }
    public string? Url { get; set; }
}
