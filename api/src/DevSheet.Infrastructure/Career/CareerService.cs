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
    bool ShowEmailPublicly, bool ShowLocationPublicly, string Website);
public record ExperienceView(Guid Id, string Company, string Title, DateOnly StartDate, DateOnly? EndDate, string Description);
public record LanguageView(Guid Id, string Name, string? IsoCode, bool IsMotherTongue,
    CefrLevel? Listening, CefrLevel? Reading, CefrLevel? SpokenInteraction, CefrLevel? SpokenProduction, CefrLevel? Writing);
public record CertificationView(Guid Id, string Name, string Issuer, DateOnly? IssueDate, string? Url);
public record EducationView(Guid Id, string Institution, string Degree, DateOnly? StartDate, DateOnly? EndDate);

/// <summary>Owner CRUD for profile, experience and education. Every query is scoped to userId, so another
/// user's rows are indistinguishable from missing ones (NotFound / false).</summary>
public class CareerService(AppDbContext db, TimeProvider? clock = null)
{
    // ---- profile ----
    public async Task<ProfileView> GetProfileAsync(Guid userId, CancellationToken ct = default)
    {
        var p = await db.Profiles.FirstOrDefaultAsync(x => x.UserId == userId, ct);
        return p is null ? new ProfileView("", "", "", "", "", false, false, "") : ToView(p);
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
        p.Website = input.Website?.Trim() ?? "";
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

    // ---- languages ----
    public async Task<IReadOnlyList<LanguageView>> ListLanguagesAsync(Guid userId, CancellationToken ct = default) =>
        (await db.Languages.Where(l => l.UserId == userId).Ordered().ToListAsync(ct)).Select(ToView).ToList();

    public async Task<Result<LanguageView>> CreateLanguageAsync(Guid userId, LanguageInput input, CancellationToken ct = default)
    {
        var errors = await ValidateLanguageAsync(userId, null, input, ct);
        if (errors.Count > 0) return Result<LanguageView>.Invalid(errors);
        var l = new Language { UserId = userId };
        Apply(l, input);
        db.Languages.Add(l);
        await db.SaveChangesAsync(ct);
        return Result<LanguageView>.Ok(ToView(l));
    }

    public async Task<Result<LanguageView>> UpdateLanguageAsync(Guid userId, Guid id, LanguageInput input, CancellationToken ct = default)
    {
        var l = await db.Languages.FirstOrDefaultAsync(x => x.Id == id && x.UserId == userId, ct);
        if (l is null) return Result<LanguageView>.NotFound();
        var errors = await ValidateLanguageAsync(userId, id, input, ct);
        if (errors.Count > 0) return Result<LanguageView>.Invalid(errors);
        Apply(l, input);
        await db.SaveChangesAsync(ct);
        return Result<LanguageView>.Ok(ToView(l));
    }

    public async Task<bool> DeleteLanguageAsync(Guid userId, Guid id, CancellationToken ct = default)
    {
        var l = await db.Languages.FirstOrDefaultAsync(x => x.Id == id && x.UserId == userId, ct);
        if (l is null) return false;
        db.Languages.Remove(l);
        await db.SaveChangesAsync(ct);
        return true;
    }

    private async Task<Dictionary<string, string[]>> ValidateLanguageAsync(Guid userId, Guid? selfId, LanguageInput input, CancellationToken ct)
    {
        var errors = CareerValidator.Validate(input);
        var name = input.Name?.Trim().ToLower();
        if (!string.IsNullOrEmpty(name) && !errors.ContainsKey("name")
            && await db.Languages.AnyAsync(l => l.UserId == userId && l.Id != selfId && l.Name.ToLower() == name, ct))
            errors["name"] = ["You already have this language."];
        return errors;
    }

    // ---- certifications ----
    public async Task<IReadOnlyList<CertificationView>> ListCertificationsAsync(Guid userId, CancellationToken ct = default) =>
        (await db.Certifications.Where(c => c.UserId == userId).NewestFirst().ToListAsync(ct)).Select(ToView).ToList();

    public async Task<Result<CertificationView>> CreateCertificationAsync(Guid userId, CertificationInput input, CancellationToken ct = default)
    {
        var errors = CareerValidator.Validate(input, Today);
        if (errors.Count > 0) return Result<CertificationView>.Invalid(errors);
        var c = new Certification { UserId = userId };
        Apply(c, input);
        db.Certifications.Add(c);
        await db.SaveChangesAsync(ct);
        return Result<CertificationView>.Ok(ToView(c));
    }

    public async Task<Result<CertificationView>> UpdateCertificationAsync(Guid userId, Guid id, CertificationInput input, CancellationToken ct = default)
    {
        var c = await db.Certifications.FirstOrDefaultAsync(x => x.Id == id && x.UserId == userId, ct);
        if (c is null) return Result<CertificationView>.NotFound();
        var errors = CareerValidator.Validate(input, Today);
        if (errors.Count > 0) return Result<CertificationView>.Invalid(errors);
        Apply(c, input);
        await db.SaveChangesAsync(ct);
        return Result<CertificationView>.Ok(ToView(c));
    }

    public async Task<bool> DeleteCertificationAsync(Guid userId, Guid id, CancellationToken ct = default)
    {
        var c = await db.Certifications.FirstOrDefaultAsync(x => x.Id == id && x.UserId == userId, ct);
        if (c is null) return false;
        db.Certifications.Remove(c);
        await db.SaveChangesAsync(ct);
        return true;
    }

    private DateOnly Today => DateOnly.FromDateTime((clock ?? TimeProvider.System).GetUtcNow().UtcDateTime);

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

    private static void Apply(Language l, LanguageInput i)
    {
        l.Name = i.Name!.Trim();
        l.IsoCode = string.IsNullOrWhiteSpace(i.IsoCode) ? null : i.IsoCode.Trim();
        l.IsMotherTongue = i.IsMotherTongue;
        l.Listening = i.Listening;
        l.Reading = i.Reading;
        l.SpokenInteraction = i.SpokenInteraction;
        l.SpokenProduction = i.SpokenProduction;
        l.Writing = i.Writing;
    }

    private static void Apply(Certification c, CertificationInput i)
    {
        c.Name = i.Name!.Trim();
        c.Issuer = i.Issuer?.Trim() ?? "";
        c.IssueDate = i.IssueDate;
        c.Url = string.IsNullOrWhiteSpace(i.Url) ? null : i.Url.Trim();
    }

    private static LanguageView ToView(Language l) =>
        new(l.Id, l.Name, l.IsoCode, l.IsMotherTongue, l.Listening, l.Reading, l.SpokenInteraction, l.SpokenProduction, l.Writing);
    private static CertificationView ToView(Certification c) => new(c.Id, c.Name, c.Issuer, c.IssueDate, c.Url);
    private static ProfileView ToView(Profile p) =>
        new(p.FullName, p.Headline, p.Summary, p.Location, p.Email, p.ShowEmailPublicly, p.ShowLocationPublicly, p.Website);
    private static ExperienceView ToView(WorkExperience w) => new(w.Id, w.Company, w.Title, w.StartDate, w.EndDate, w.Description);
    private static EducationView ToView(Education e) => new(e.Id, e.Institution, e.Degree, e.StartDate, e.EndDate);
}
