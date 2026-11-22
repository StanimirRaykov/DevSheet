using DevSheet.Application.Career;
using DevSheet.Domain.Entities;
using DevSheet.Infrastructure.Career;
using DevSheet.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace DevSheet.Infrastructure.Accounts;

/// <summary>Where the user is in the welcome flow, and what its first steps show.</summary>
public record OnboardingView(
    OnboardingStep Step, DateTime? CompletedAt, string DisplayName, string Headline, string? GithubLogin, DateTime? LastSyncedAt);

public record AboutInput(string? DisplayName, string? Headline);

/// <summary>
/// The welcome flow for new accounts. Each step is saved as the user moves on, so leaving halfway resumes at the
/// same step; finishing or skipping sets <see cref="User.OnboardingCompletedAt"/> once and for all.
/// </summary>
public class OnboardingService(AppDbContext db, TimeProvider clock)
{
    public async Task<OnboardingView> GetAsync(Guid userId, CancellationToken ct = default) =>
        await db.Users.Where(u => u.Id == userId)
            .Select(u => new OnboardingView(
                u.OnboardingStep, u.OnboardingCompletedAt, u.DisplayName,
                u.Profile == null ? "" : u.Profile.Headline,
                u.GithubConnection == null ? null : u.GithubConnection.Login,
                u.GithubConnection == null ? null : u.GithubConnection.LastSyncedAt))
            .FirstAsync(ct);

    /// <summary>Step 1: the name people see and a one-line headline. Moves the flow on to connecting GitHub.</summary>
    public async Task<Result<OnboardingView>> SaveAboutAsync(Guid userId, AboutInput input, CancellationToken ct = default)
    {
        var errors = new Dictionary<string, string[]>();
        var name = (input.DisplayName ?? "").Trim();
        var headline = (input.Headline ?? "").Trim();
        if (name.Length == 0) errors["displayName"] = ["Enter the name people should see."];
        else if (name.Length > AccountSettingsService.DisplayNameMax)
            errors["displayName"] = [$"Must be at most {AccountSettingsService.DisplayNameMax} characters."];
        if (headline.Length > CareerValidator.ShortMax) errors["headline"] = [$"Must be at most {CareerValidator.ShortMax} characters."];
        if (errors.Count > 0) return Result<OnboardingView>.Invalid(errors);

        var user = await db.Users.Include(u => u.Profile).FirstAsync(u => u.Id == userId, ct);
        user.DisplayName = name;
        if (user.Profile is null)
            db.Profiles.Add(new Profile { UserId = userId, FullName = name, Headline = headline });
        else
        {
            user.Profile.Headline = headline;
            if (user.Profile.FullName.Length == 0) user.Profile.FullName = name;
        }
        if (user.OnboardingStep < OnboardingStep.Github) user.OnboardingStep = OnboardingStep.Github;
        await db.SaveChangesAsync(ct);
        return Result<OnboardingView>.Ok(await GetAsync(userId, ct));
    }

    /// <summary>Remembers the step on screen (Next and Back both save it).</summary>
    public async Task SetStepAsync(Guid userId, OnboardingStep step, CancellationToken ct = default) =>
        await db.Users.Where(u => u.Id == userId)
            .ExecuteUpdateAsync(s => s.SetProperty(u => u.OnboardingStep, step), ct);

    /// <summary>Finish or skip. Idempotent: the first time counts, later calls keep that timestamp.</summary>
    public async Task<DateTime> CompleteAsync(Guid userId, CancellationToken ct = default)
    {
        var user = await db.Users.FirstAsync(u => u.Id == userId, ct);
        if (user.OnboardingCompletedAt is null)
        {
            user.OnboardingCompletedAt = clock.GetUtcNow().UtcDateTime;
            user.OnboardingStep = OnboardingStep.Done;
            await db.SaveChangesAsync(ct);
        }
        return user.OnboardingCompletedAt.Value;
    }
}
