using System.Security.Cryptography;
using System.Text;
using DevSheet.Application.Abstractions;
using DevSheet.Domain.Entities;
using DevSheet.Infrastructure.Persistence;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace DevSheet.Infrastructure.Accounts;

public enum PasswordSignInStatus { Success, InvalidCredentials, EmailNotConfirmed }

public record PasswordSignInResult(PasswordSignInStatus Status, Guid? UserId = null);

/// <summary>Result of opening an emailed link. <see cref="UserId"/> is set on success; otherwise <see cref="Error"/>.</summary>
public record LinkResult(Guid? UserId, string? Error = null, Dictionary<string, string[]>? Errors = null);

/// <summary>Error codes for emailed links, shown by the web app.</summary>
public static class LinkErrors
{
    /// <summary>Unknown, already used, replaced by a newer email, or for another purpose.</summary>
    public const string Invalid = "invalid_link";
    public const string Expired = "expired_link";
}

/// <summary>The email could not be handed to the mail server. Nothing was saved; the user can try again.</summary>
public class EmailNotSentException(Exception inner) : Exception("The email could not be sent.", inner);

/// <summary>
/// Email and password accounts: sign up, confirm the address, sign in, forgot and reset password.
/// Nothing here reveals whether an email has an account: sign-up, resend and forgot answer the same way either way,
/// and a wrong email costs the same password-hash time as a wrong password.
/// </summary>
public class PasswordAccountService(
    AppDbContext db, IEmailSender sender, AccountEmails emails, TimeProvider clock, ILogger<PasswordAccountService> log)
{
    public static readonly TimeSpan ConfirmLifetime = TimeSpan.FromHours(24);
    public static readonly TimeSpan ResetLifetime = TimeSpan.FromHours(1);

    private static readonly PasswordHasher<PasswordLogin> Hasher = new();
    /// <summary>Verified against when the email is unknown, so that case takes as long as a wrong password.</summary>
    private static readonly Lazy<string> DummyHash = new(() => Hasher.HashPassword(new PasswordLogin(), Guid.NewGuid().ToString()));

    private DateTime Now => clock.GetUtcNow().UtcDateTime;

    /// <summary>
    /// Creates an unconfirmed account and emails the confirm link. When the email already has an account, that owner
    /// gets a "you already have an account" email instead and nothing changes. Returns field errors, or null.
    /// </summary>
    public async Task<Dictionary<string, string[]>?> RegisterAsync(string? email, string? password, string? name, CancellationToken ct = default)
    {
        var errors = PasswordRules.CheckSignUp(email, password, name);
        if (errors.Count > 0) return errors;
        email = email!.Trim();
        name = name!.Trim();

        var existing = await FindAsync(email, ct);
        var hash = Hasher.HashPassword(new PasswordLogin(), password!); // also when unused: same time either way
        if (existing is not null)
        {
            await SendAsync(emails.AlreadyRegistered(existing.Email, existing.Name), ct);
            return null;
        }

        var now = Now;
        var user = new User
        {
            DisplayName = name, Email = email, CreatedAt = now,
            Slug = await AccountService.FreeSlugAsync(db, name, ct),
        };
        user.PasswordLogin = new PasswordLogin
        {
            UserId = user.Id, Email = email, NormalizedEmail = PasswordLogin.Normalize(email),
            PasswordHash = hash, CreatedAt = now, PasswordChangedAt = now,
        };
        db.Users.Add(user);
        var token = await NewTokenAsync(user.Id, AccountTokenPurpose.ConfirmEmail, ConfirmLifetime, ct);
        // Sent before saving: if the mail server is down nothing is kept, and signing up again works.
        await SendAsync(emails.ConfirmEmail(email, name, token), ct);
        await db.SaveChangesAsync(ct);
        return null;
    }

    /// <summary>Opens a confirm link: the email is confirmed and the account can sign in.</summary>
    public async Task<LinkResult> ConfirmEmailAsync(string? token, CancellationToken ct = default)
    {
        var (found, error) = await UseTokenAsync(token, AccountTokenPurpose.ConfirmEmail, ct);
        if (found is null) return new LinkResult(null, error);
        var login = await db.PasswordLogins.FirstAsync(l => l.UserId == found.UserId, ct);
        login.EmailConfirmedAt ??= Now;
        await db.SaveChangesAsync(ct);
        return new LinkResult(found.UserId);
    }

    public async Task<PasswordSignInResult> SignInAsync(string? email, string? password, CancellationToken ct = default)
    {
        var login = PasswordRules.IsEmail(email)
            ? await db.PasswordLogins.FirstOrDefaultAsync(l => l.NormalizedEmail == PasswordLogin.Normalize(email!), ct)
            : null;
        var result = Hasher.VerifyHashedPassword(login ?? new PasswordLogin(), login?.PasswordHash ?? DummyHash.Value, password ?? "");
        if (login is null || result == PasswordVerificationResult.Failed)
            return new PasswordSignInResult(PasswordSignInStatus.InvalidCredentials);

        if (result == PasswordVerificationResult.SuccessRehashNeeded)
        {
            login.PasswordHash = Hasher.HashPassword(login, password!);
            await db.SaveChangesAsync(ct);
        }
        // Only said after the right password, so it reveals nothing to someone guessing.
        return login.EmailConfirmedAt is null
            ? new PasswordSignInResult(PasswordSignInStatus.EmailNotConfirmed)
            : new PasswordSignInResult(PasswordSignInStatus.Success, login.UserId);
    }

    /// <summary>Sends a fresh confirm link if the email has an unconfirmed account; otherwise does nothing.</summary>
    public async Task ResendConfirmationAsync(string? email, CancellationToken ct = default)
    {
        var account = PasswordRules.IsEmail(email) ? await FindAsync(email!, ct) : null;
        if (account is null || account.Confirmed) return;
        var token = await NewTokenAsync(account.UserId, AccountTokenPurpose.ConfirmEmail, ConfirmLifetime, ct);
        await SendAsync(emails.ConfirmEmail(account.Email, account.Name, token), ct);
        await db.SaveChangesAsync(ct);
    }

    /// <summary>Emails a reset link if the email has a password account; otherwise does nothing.</summary>
    public async Task ForgotPasswordAsync(string? email, CancellationToken ct = default)
    {
        var account = PasswordRules.IsEmail(email) ? await FindAsync(email!, ct) : null;
        if (account is null) return;
        var token = await NewTokenAsync(account.UserId, AccountTokenPurpose.ResetPassword, ResetLifetime, ct);
        await SendAsync(emails.ResetPassword(account.Email, account.Name, token), ct);
        await db.SaveChangesAsync(ct);
    }

    /// <summary>
    /// Opens a reset link with the new password. Also confirms the email (the link proved they read it) and changes
    /// the security stamp, which signs out every other session.
    /// </summary>
    public async Task<LinkResult> ResetPasswordAsync(string? token, string? password, CancellationToken ct = default)
    {
        // The password is checked first, so a typo does not use up the link.
        var tokenRow = await FindTokenAsync(token, ct);
        var login = tokenRow is null ? null : await db.PasswordLogins.FirstOrDefaultAsync(l => l.UserId == tokenRow.UserId, ct);
        var errors = PasswordRules.CheckPassword(password, login?.Email);
        if (errors.Count > 0) return new LinkResult(null, null, errors);

        var (found, error) = await UseTokenAsync(token, AccountTokenPurpose.ResetPassword, ct);
        if (found is null || login is null) return new LinkResult(null, error ?? LinkErrors.Invalid);

        var now = Now;
        login.PasswordHash = Hasher.HashPassword(login, password!);
        login.PasswordChangedAt = now;
        login.EmailConfirmedAt ??= now;
        var user = await db.Users.FirstAsync(u => u.Id == login.UserId, ct);
        user.SecurityStamp = User.NewSecurityStamp();
        await db.SaveChangesAsync(ct);
        await TrySendAsync(emails.PasswordChanged(login.Email, user.DisplayName), ct);
        return new LinkResult(login.UserId);
    }

    private sealed record Account(Guid UserId, string Email, string Name, bool Confirmed);

    private Task<Account?> FindAsync(string email, CancellationToken ct) =>
        db.PasswordLogins.Where(l => l.NormalizedEmail == PasswordLogin.Normalize(email))
            .Join(db.Users, l => l.UserId, u => u.Id, (l, u) => new Account(l.UserId, l.Email, u.DisplayName, l.EmailConfirmedAt != null))
            .FirstOrDefaultAsync(ct);

    /// <summary>A new random token for an emailed link; older unused ones for the same purpose stop working.</summary>
    private async Task<string> NewTokenAsync(Guid userId, AccountTokenPurpose purpose, TimeSpan lifetime, CancellationToken ct)
    {
        var now = Now;
        foreach (var old in await db.AccountTokens.Where(t => t.UserId == userId && t.Purpose == purpose && t.UsedAt == null).ToListAsync(ct))
            old.UsedAt = now;
        var token = Convert.ToBase64String(RandomNumberGenerator.GetBytes(32)).TrimEnd('=').Replace('+', '-').Replace('/', '_');
        db.AccountTokens.Add(new AccountToken
        {
            UserId = userId, Purpose = purpose, TokenHash = Hash(token), CreatedAt = now, ExpiresAt = now + lifetime,
        });
        return token;
    }

    private Task<AccountToken?> FindTokenAsync(string? token, CancellationToken ct) =>
        string.IsNullOrWhiteSpace(token) || token.Length > 200
            ? Task.FromResult<AccountToken?>(null)
            : db.AccountTokens.FirstOrDefaultAsync(t => t.TokenHash == Hash(token.Trim()), ct);

    /// <summary>Marks the token used if it is valid for this purpose. Not saved: the caller saves with its change.</summary>
    private async Task<(AccountToken? Token, string? Error)> UseTokenAsync(string? token, AccountTokenPurpose purpose, CancellationToken ct)
    {
        var row = await FindTokenAsync(token, ct);
        if (row is null || row.Purpose != purpose || row.UsedAt is not null) return (null, LinkErrors.Invalid);
        if (row.ExpiresAt <= Now) return (null, LinkErrors.Expired);
        row.UsedAt = Now;
        return (row, null);
    }

    internal static string Hash(string token) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(token))).ToLowerInvariant();

    private async Task SendAsync(EmailMessage message, CancellationToken ct)
    {
        try { await sender.SendAsync(message, ct); }
        catch (Exception ex) when (ex is not OperationCanceledException) { throw new EmailNotSentException(ex); }
    }

    /// <summary>For notices sent after the change is saved: a mail server problem must not undo the change.</summary>
    private async Task TrySendAsync(EmailMessage message, CancellationToken ct)
    {
        try { await sender.SendAsync(message, ct); }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            // The notice is a courtesy; the change itself worked.
            log.LogWarning(ex, "Could not send the {Subject} notice", message.Subject);
        }
    }
}
