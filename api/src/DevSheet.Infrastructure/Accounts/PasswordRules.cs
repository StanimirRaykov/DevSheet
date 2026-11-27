using System.Net.Mail;

namespace DevSheet.Infrastructure.Accounts;

/// <summary>
/// What a sign-up or new password must satisfy. Length only, no "one digit and one symbol" rules: those make
/// passwords harder to remember without making them stronger (NIST SP 800-63B). Errors use the web app's field names.
/// </summary>
public static class PasswordRules
{
    public const int MinLength = 10;
    public const int MaxLength = 128;
    public const int MaxEmailLength = 254;
    public const int MaxNameLength = 100;

    /// <summary>A usable email address: one mailbox, nothing around it.</summary>
    public static bool IsEmail(string? email)
    {
        var trimmed = email?.Trim() ?? "";
        return trimmed.Length is > 0 and <= MaxEmailLength
            && MailAddress.TryCreate(trimmed, out var parsed)
            && parsed.Address == trimmed
            && parsed.Host.Contains('.');
    }

    public static Dictionary<string, string[]> CheckSignUp(string? email, string? password, string? name)
    {
        var errors = CheckPassword(password, email);
        if (!IsEmail(email)) errors["email"] = ["Enter an email address like name@example.com."];
        var trimmed = name?.Trim() ?? "";
        if (trimmed.Length == 0) errors["name"] = ["Enter your name."];
        else if (trimmed.Length > MaxNameLength) errors["name"] = [$"Use at most {MaxNameLength} characters."];
        return errors;
    }

    /// <summary>The password on its own (also for reset and change). Field name: <c>password</c>.</summary>
    public static Dictionary<string, string[]> CheckPassword(string? password, string? email)
    {
        var errors = new Dictionary<string, string[]>();
        var p = password ?? "";
        if (p.Length < MinLength) errors["password"] = [$"Use at least {MinLength} characters."];
        else if (p.Length > MaxLength) errors["password"] = [$"Use at most {MaxLength} characters."];
        else if (string.IsNullOrWhiteSpace(p)) errors["password"] = ["Use something other than spaces."];
        else if (email is not null && string.Equals(p.Trim(), email.Trim(), StringComparison.OrdinalIgnoreCase))
            errors["password"] = ["Use something other than your email address."];
        return errors;
    }
}
