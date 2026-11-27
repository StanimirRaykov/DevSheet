namespace DevSheet.Domain.Entities;

public enum AccountTokenPurpose { ConfirmEmail = 1, ResetPassword = 2 }

/// <summary>
/// A single-use link sent by email. Only the SHA-256 of the token is stored: the token itself exists only in the
/// email, so a copy of the database cannot be used to confirm addresses or reset passwords.
/// </summary>
public class AccountToken
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public AccountTokenPurpose Purpose { get; set; }
    /// <summary>Lower-case hex SHA-256 of the token. Unique.</summary>
    public string TokenHash { get; set; } = "";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime ExpiresAt { get; set; }
    /// <summary>Set when the link is used, or when a newer token for the same purpose replaces this one.</summary>
    public DateTime? UsedAt { get; set; }
}
