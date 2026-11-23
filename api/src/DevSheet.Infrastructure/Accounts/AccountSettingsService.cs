using System.Text.Json.Serialization;
using DevSheet.Application.Career;
using DevSheet.Domain;
using DevSheet.Domain.Entities;
using DevSheet.Infrastructure.Career;
using DevSheet.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace DevSheet.Infrastructure.Accounts;

public record AccountView(string DisplayName, string? Email, string? AvatarUrl);

/// <summary>PATCH body: a null field is left unchanged. An empty email removes it.</summary>
public record AccountInput(string? DisplayName, string? Email);

public record PublicPageView(string Slug, bool IsPublished, bool ShowEmail, bool ShowLocation, bool AllowCvDownload);

/// <summary>PATCH body: a null field is left unchanged.</summary>
public record PublicPageInput(bool? IsPublished, bool? ShowEmail, bool? ShowLocation, bool? AllowCvDownload = null);

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum SlugStatus { Available, Current, Invalid, Reserved, Taken }

/// <summary>
/// The answer to "can I use this address?". <see cref="Slug"/> is the cleaned-up form (trimmed, lowercase), which is
/// what would be saved. <see cref="Message"/> explains a refusal in words the settings page shows as is.
/// </summary>
public record SlugCheck(string Slug, SlugStatus Status, string? Message)
{
    public bool Available => Status is SlugStatus.Available or SlugStatus.Current;
}

/// <summary>The account owner's own settings: name and contact email, public address and visibility, deletion.</summary>
public class AccountSettingsService(AppDbContext db)
{
    public const int DisplayNameMax = 80;

    public async Task<AccountView> GetAsync(Guid userId, CancellationToken ct = default) =>
        await db.Users.Where(u => u.Id == userId)
            .Select(u => new AccountView(u.DisplayName, u.Email, u.AvatarUrl)).FirstAsync(ct);

    public async Task<Result<AccountView>> UpdateAsync(Guid userId, AccountInput input, CancellationToken ct = default)
    {
        var errors = new Dictionary<string, string[]>();
        var name = input.DisplayName?.Trim();
        if (name is not null)
        {
            if (name.Length == 0) errors["displayName"] = ["Enter the name people should see."];
            else if (name.Length > DisplayNameMax) errors["displayName"] = [$"Must be at most {DisplayNameMax} characters."];
        }
        var email = input.Email?.Trim();
        if (email is { Length: > 0 })
        {
            if (email.Length > CareerValidator.EmailMax) errors["email"] = [$"Must be at most {CareerValidator.EmailMax} characters."];
            else if (!CareerValidator.IsEmail(email)) errors["email"] = ["Must be a valid email address."];
        }
        if (errors.Count > 0) return Result<AccountView>.Invalid(errors);

        var user = await db.Users.FirstAsync(u => u.Id == userId, ct);
        if (name is not null) user.DisplayName = name;
        if (email is not null) user.Email = email.Length > 0 ? email : null;
        await db.SaveChangesAsync(ct);
        return Result<AccountView>.Ok(new AccountView(user.DisplayName, user.Email, user.AvatarUrl));
    }

    public async Task<SlugCheck> CheckSlugAsync(Guid userId, string? requested, CancellationToken ct = default)
    {
        var slug = (requested ?? "").Trim().ToLowerInvariant();
        if (await db.Users.AnyAsync(u => u.Id == userId && u.Slug == slug, ct))
            return new(slug, SlugStatus.Current, null);
        if (ReservedSlugs.IsReserved(slug))
            return new(slug, SlugStatus.Reserved, "That address is used by DevSheet itself. Choose another.");
        if (!SlugRules.IsValid(slug))
            return new(slug, SlugStatus.Invalid,
                $"Use {SlugRules.MinLength}-{SlugRules.MaxLength} lowercase letters, digits and hyphens, not starting or ending with a hyphen.");
        if (await db.Users.AnyAsync(u => u.Slug == slug, ct))
            return new(slug, SlugStatus.Taken, "Someone already uses that address.");
        return new(slug, SlugStatus.Available, null);
    }

    /// <summary>
    /// Moves the public page to a new address. The old address stops working at once and becomes free for anyone.
    /// The database's unique index settles a race with another user taking the same slug.
    /// </summary>
    public async Task<SlugCheck> ChangeSlugAsync(Guid userId, string? requested, CancellationToken ct = default)
    {
        var check = await CheckSlugAsync(userId, requested, ct);
        if (check.Status != SlugStatus.Available) return check;

        var user = await db.Users.FirstAsync(u => u.Id == userId, ct);
        user.Slug = check.Slug;
        try
        {
            await db.SaveChangesAsync(ct);
        }
        catch (DbUpdateException)
        {
            db.ChangeTracker.Clear();
            return check with { Status = SlugStatus.Taken, Message = "Someone already uses that address." };
        }
        return check with { Status = SlugStatus.Current };
    }

    public async Task<PublicPageView> GetPublicPageAsync(Guid userId, CancellationToken ct = default) =>
        await db.Users.Where(u => u.Id == userId)
            .Select(u => new PublicPageView(u.Slug, u.IsPublished,
                u.Profile != null && u.Profile.ShowEmailPublicly, u.Profile != null && u.Profile.ShowLocationPublicly,
                u.Profile != null && u.Profile.AllowPublicCvDownload))
            .FirstAsync(ct);

    public async Task<PublicPageView> UpdatePublicPageAsync(Guid userId, PublicPageInput input, CancellationToken ct = default)
    {
        var user = await db.Users.Include(u => u.Profile).FirstAsync(u => u.Id == userId, ct);
        if (input.IsPublished is { } published) user.IsPublished = published;
        if (input.ShowEmail is not null || input.ShowLocation is not null || input.AllowCvDownload is not null)
        {
            // The switches live on the profile; an empty one is created the first time they are used.
            if (user.Profile is null) db.Profiles.Add(user.Profile = new Profile { UserId = userId });
            if (input.ShowEmail is { } showEmail) user.Profile.ShowEmailPublicly = showEmail;
            if (input.ShowLocation is { } showLocation) user.Profile.ShowLocationPublicly = showLocation;
            if (input.AllowCvDownload is { } allowCv) user.Profile.AllowPublicCvDownload = allowCv;
        }
        await db.SaveChangesAsync(ct);
        return new PublicPageView(user.Slug, user.IsPublished,
            user.Profile?.ShowEmailPublicly ?? false, user.Profile?.ShowLocationPublicly ?? false,
            user.Profile?.AllowPublicCvDownload ?? false);
    }

    /// <summary>
    /// Deletes the account and everything it owns, in one transaction. Projects go first because they point at
    /// repositories without a cascade; the rest (logins, GitHub connection and its token, profile, repositories,
    /// work history, education, languages, certifications) cascades from the user row. Nothing is revoked at
    /// GitHub or Google: the stored token is simply gone. Returns false when there was no such account.
    /// </summary>
    public async Task<bool> DeleteAsync(Guid userId, CancellationToken ct = default)
    {
        await using var tx = await db.Database.BeginTransactionAsync(ct);
        await db.Projects.Where(p => p.UserId == userId).ExecuteDeleteAsync(ct); // project skills cascade
        var deleted = await db.Users.Where(u => u.Id == userId).ExecuteDeleteAsync(ct);
        await tx.CommitAsync(ct);
        return deleted > 0;
    }
}
