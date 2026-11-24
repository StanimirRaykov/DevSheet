namespace DevSheet.Domain.Entities;

public class Profile
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public string FullName { get; set; } = "";
    public string Headline { get; set; } = "";
    public string Summary { get; set; } = "";
    public string Location { get; set; } = "";
    public string Email { get; set; } = "";
    /// <summary>A personal site or blog, shown on the public page. Empty when none.</summary>
    public string Website { get; set; } = "";
    /// <summary>International form, for example "+359 88 123 4567". Empty when none.</summary>
    public string Phone { get; set; } = "";
    /// <summary>ISO 3166-1 alpha-2, lower case ("bg"). Empty when none. Public together with the location.</summary>
    public string CountryCode { get; set; } = "";
    /// <summary>Privacy: email, location and phone are never public unless the user opts in.</summary>
    public bool ShowEmailPublicly { get; set; }
    public bool ShowLocationPublicly { get; set; }
    public bool ShowPhonePublicly { get; set; }
    /// <summary>Visitors may download the CV from the public page. Off by default.</summary>
    public bool AllowPublicCvDownload { get; set; }
}
