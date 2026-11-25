namespace DevSheet.Domain.Entities;

/// <summary>
/// Signing in with email and password (0 or 1 per user). A sign-in method like <see cref="ExternalLogin"/>, so
/// "the last sign-in method cannot be removed" counts it. Unrelated to the profile's contact email.
/// </summary>
public class PasswordLogin
{
    public Guid UserId { get; set; }
    /// <summary>As the user typed it, for emails sent to them.</summary>
    public string Email { get; set; } = "";
    /// <summary><see cref="Normalize"/>d <see cref="Email"/>. Unique: one account per email address.</summary>
    public string NormalizedEmail { get; set; } = "";
    /// <summary>ASP.NET Core PasswordHasher output (PBKDF2, salted, with a version marker). Never the password.</summary>
    public string PasswordHash { get; set; } = "";
    /// <summary>Null until the link in the confirmation email is opened. Unconfirmed logins cannot sign in.</summary>
    public DateTime? EmailConfirmedAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime PasswordChangedAt { get; set; } = DateTime.UtcNow;

    public static string Normalize(string email) => email.Trim().ToUpperInvariant();
}
