using DevSheet.Application.Career;
using DevSheet.Domain.Entities;
using DevSheet.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace DevSheet.Infrastructure.Career;

public enum Outcome { Ok, NotFound, Invalid }

public record Result<T>(Outcome Outcome, T? Value = default, IReadOnlyDictionary<string, string[]>? Errors = null)
{
    public static Result<T> Ok(T value) => new(Outcome.Ok, value);
    public static Result<T> NotFound() => new(Outcome.NotFound);
    public static Result<T> Invalid(IReadOnlyDictionary<string, string[]> errors) => new(Outcome.Invalid, default, errors);
}

public record ProfileView(string FullName, string Headline, string Summary, string Location, string Email,
    bool ShowEmailPublicly, bool ShowLocationPublicly);
public record ExperienceView(Guid Id, string Company, string Title, DateOnly StartDate, DateOnly? EndDate, string Description);
public record EducationView(Guid Id, string Institution, string Degree, DateOnly? StartDate, DateOnly? EndDate);

/// <summary>Owner CRUD for profile, experience and education. Every query is scoped to userId, so another
/// user's rows are indistinguishable from missing ones (NotFound / false).</summary>
public class CareerService(AppDbContext db)
{
    // ---- profile ----
    public async Task<ProfileView> GetProfileAsync(Guid userId, CancellationToken ct = default)
    {
        var p = await db.Profiles.FirstOrDefaultAsync(x => x.UserId == userId, ct);
        return p is null ? new ProfileView("", "", "", "", "", false, false) : ToView(p);
    }

    public async Task<Result<ProfileView>> UpsertProfileAsync(Guid userId, ProfileInput input, CancellationToken ct = default)
    {
        var errors = CareerValidator.Validate(input);
        if (errors.Count > 0) return Result<ProfileView>.Invalid(errors);

        var p = await db.Profiles.FirstOrDefaultAsync(x => x.UserId == userId, ct);
        if (p is null) db.Profiles.Add(p = new Profile { UserId = userId });
        p.FullName = input.FullName?.Trim() ?? "";
        p.Headline = input.Headline?.Trim() ?? "";
        p.Summary = input.Summary?.Trim() ?? "";
        p.Location = input.Location?.Trim() ?? "";
        p.Email = input.Email?.Trim() ?? "";
        p.ShowEmailPublicly = input.ShowEmailPublicly;
        p.ShowLocationPublicly = input.ShowLocationPublicly;
        await db.SaveChangesAsync(ct);
        return Result<ProfileView>.Ok(ToView(p));
    }

    // ---- experience ----
    public async Task<IReadOnlyList<ExperienceView>> ListExperienceAsync(Guid userId, CancellationToken ct = default) =>
        (await db.WorkExperiences.Where(w => w.UserId == userId).NewestFirst().ToListAsync(ct)).Select(ToView).ToList();

    public async Task<Result<ExperienceView>> CreateExperienceAsync(Guid userId, ExperienceInput input, CancellationToken ct = default)
    {
        var errors = CareerValidator.Validate(input);
        if (errors.Count > 0) return Result<ExperienceView>.Invalid(errors);
        var w = new WorkExperience { UserId = userId };
        Apply(w, input);
        db.WorkExperiences.Add(w);
        await db.SaveChangesAsync(ct);
        return Result<ExperienceView>.Ok(ToView(w));
    }

    public async Task<Result<ExperienceView>> UpdateExperienceAsync(Guid userId, Guid id, ExperienceInput input, CancellationToken ct = default)
    {
        var w = await db.WorkExperiences.FirstOrDefaultAsync(x => x.Id == id && x.UserId == userId, ct);
        if (w is null) return Result<ExperienceView>.NotFound();
        var errors = CareerValidator.Validate(input);
        if (errors.Count > 0) return Result<ExperienceView>.Invalid(errors);
        Apply(w, input);
        await db.SaveChangesAsync(ct);
        return Result<ExperienceView>.Ok(ToView(w));
    }

    public async Task<bool> DeleteExperienceAsync(Guid userId, Guid id, CancellationToken ct = default)
    {
        var w = await db.WorkExperiences.FirstOrDefaultAsync(x => x.Id == id && x.UserId == userId, ct);
        if (w is null) return false;
        db.WorkExperiences.Remove(w);
        await db.SaveChangesAsync(ct);
        return true;
    }

    // ---- education ----
    public async Task<IReadOnlyList<EducationView>> ListEducationAsync(Guid userId, CancellationToken ct = default) =>
        (await db.Educations.Where(e => e.UserId == userId).NewestFirst().ToListAsync(ct)).Select(ToView).ToList();

    public async Task<Result<EducationView>> CreateEducationAsync(Guid userId, EducationInput input, CancellationToken ct = default)
    {
        var errors = CareerValidator.Validate(input);
        if (errors.Count > 0) return Result<EducationView>.Invalid(errors);
        var e = new Education { UserId = userId };
        Apply(e, input);
        db.Educations.Add(e);
        await db.SaveChangesAsync(ct);
        return Result<EducationView>.Ok(ToView(e));
    }

    public async Task<Result<EducationView>> UpdateEducationAsync(Guid userId, Guid id, EducationInput input, CancellationToken ct = default)
    {
        var e = await db.Educations.FirstOrDefaultAsync(x => x.Id == id && x.UserId == userId, ct);
        if (e is null) return Result<EducationView>.NotFound();
        var errors = CareerValidator.Validate(input);
        if (errors.Count > 0) return Result<EducationView>.Invalid(errors);
        Apply(e, input);
        await db.SaveChangesAsync(ct);
        return Result<EducationView>.Ok(ToView(e));
    }

    public async Task<bool> DeleteEducationAsync(Guid userId, Guid id, CancellationToken ct = default)
    {
        var e = await db.Educations.FirstOrDefaultAsync(x => x.Id == id && x.UserId == userId, ct);
        if (e is null) return false;
        db.Educations.Remove(e);
        await db.SaveChangesAsync(ct);
        return true;
    }

    // ---- mapping ----
    private static void Apply(WorkExperience w, ExperienceInput i)
    {
        w.Company = i.Company!.Trim();
        w.Title = i.Title!.Trim();
        w.StartDate = i.StartDate!.Value;
        w.EndDate = i.EndDate;
        w.Description = i.Description?.Trim() ?? "";
    }

    private static void Apply(Education e, EducationInput i)
    {
        e.Institution = i.Institution!.Trim();
        e.Degree = i.Degree?.Trim() ?? "";
        e.StartDate = i.StartDate;
        e.EndDate = i.EndDate;
    }

    private static ProfileView ToView(Profile p) =>
        new(p.FullName, p.Headline, p.Summary, p.Location, p.Email, p.ShowEmailPublicly, p.ShowLocationPublicly);
    private static ExperienceView ToView(WorkExperience w) => new(w.Id, w.Company, w.Title, w.StartDate, w.EndDate, w.Description);
    private static EducationView ToView(Education e) => new(e.Id, e.Institution, e.Degree, e.StartDate, e.EndDate);
}
