namespace DevSheet.Domain.Entities;

/// <summary>
/// A DevSheet account. It exists on its own: people sign in with email and password (<see cref="PasswordLogin"/>)
/// and/or through <see cref="ExternalLogin"/>s (Google, Apple). GitHub is never a way to sign in: repositories come
/// from an optional <see cref="GithubConnection"/>.
/// </summary>
public class User
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string DisplayName { get; set; } = "";
    /// <summary>From the provider at sign-up. Private: never shown publicly and never used to match accounts.</summary>
    public string? Email { get; set; }
    public string? AvatarUrl { get; set; }
    /// <summary>Public URL slug (/slug). Chosen once at sign-up, see <see cref="SlugRules"/>.</summary>
    public string Slug { get; set; } = "";
    public bool IsPublished { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    /// <summary>Set when the welcome flow is finished or skipped. Until then, signing in opens /welcome.</summary>
    public DateTime? OnboardingCompletedAt { get; set; }
    /// <summary>The welcome step the user last reached, so leaving halfway resumes there.</summary>
    public OnboardingStep OnboardingStep { get; set; }
    /// <summary>
    /// Copied into the sign-in cookie and checked on every request. Changing it (password reset or change) signs
    /// out every other session.
    /// </summary>
    public string SecurityStamp { get; set; } = NewSecurityStamp();

    public static string NewSecurityStamp() => Guid.NewGuid().ToString("N");

    public List<ExternalLogin> Logins { get; set; } = new();
    public PasswordLogin? PasswordLogin { get; set; }
    public GithubConnection? GithubConnection { get; set; }
    public Profile? Profile { get; set; }
    public List<GithubRepo> Repos { get; set; } = new();
    public List<Project> Projects { get; set; } = new();
    public List<WorkExperience> WorkExperiences { get; set; } = new();
    public List<Education> Educations { get; set; } = new();
    public List<Language> Languages { get; set; } = new();
    public List<Certification> Certifications { get; set; } = new();
}
