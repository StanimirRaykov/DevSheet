using DevSheet.Application.Career;
using DevSheet.Infrastructure.Career;
using Microsoft.EntityFrameworkCore;

namespace DevSheet.Tests;

public class CareerServiceTests
{
    private static readonly DateOnly Jan = new(2024, 1, 1), Mar = new(2024, 3, 1), Jun = new(2024, 6, 1);

    private static ExperienceInput Exp(string company = "Acme", DateOnly? start = null, DateOnly? end = null) =>
        new(company, "Dev", start ?? Jan, end, "desc");

    // ---- profile ----
    [Fact]
    public async Task Profile_upsert_twice_keeps_one_row_and_trims()
    {
        using var t = new TestDb();
        var u = t.AddUser();
        var svc = new CareerService(t.Db);

        await svc.UpsertProfileAsync(u.Id, new ProfileInput("  Ana  ", "Dev", "", "Sofia", "a@b.com", false, false));
        var second = await svc.UpsertProfileAsync(u.Id, new ProfileInput("Ana K", "Senior", "", "Sofia", "a@b.com", true, false));

        Assert.Equal(1, await t.Db.Profiles.CountAsync());
        Assert.Equal("Ana K", second.Value!.FullName);
        Assert.True(second.Value.ShowEmailPublicly);
    }

    [Fact]
    public async Task Invalid_profile_is_not_saved()
    {
        using var t = new TestDb();
        var u = t.AddUser();

        var r = await new CareerService(t.Db).UpsertProfileAsync(u.Id, new ProfileInput("A", "", "", "", "nope", false, false));

        Assert.Equal(Outcome.Invalid, r.Outcome);
        Assert.Contains("email", r.Errors!.Keys);
        Assert.Equal(0, await t.Db.Profiles.CountAsync());
    }

    [Fact]
    public async Task Missing_profile_reads_as_empty_and_private()
    {
        using var t = new TestDb();
        var p = await new CareerService(t.Db).GetProfileAsync(t.AddUser().Id);
        Assert.Equal("", p.FullName);
        Assert.False(p.ShowEmailPublicly);
        Assert.False(p.ShowLocationPublicly);
    }

    // ---- experience: validation ----
    [Fact]
    public async Task Invalid_experience_create_saves_nothing()
    {
        using var t = new TestDb();
        var u = t.AddUser();

        var r = await new CareerService(t.Db).CreateExperienceAsync(u.Id, Exp(start: Mar, end: Jan));

        Assert.Equal(Outcome.Invalid, r.Outcome);
        Assert.Equal(0, await t.Db.WorkExperiences.CountAsync());
    }

    [Fact]
    public async Task Invalid_experience_update_leaves_row_unchanged()
    {
        using var t = new TestDb();
        var u = t.AddUser();
        var svc = new CareerService(t.Db);
        var created = (await svc.CreateExperienceAsync(u.Id, Exp("Acme"))).Value!;

        var r = await svc.UpdateExperienceAsync(u.Id, created.Id, Exp("", Jan));

        Assert.Equal(Outcome.Invalid, r.Outcome);
        t.Db.ChangeTracker.Clear();
        Assert.Equal("Acme", (await t.Db.WorkExperiences.SingleAsync()).Company);
    }

    // ---- experience: ownership on every verb ----
    [Fact]
    public async Task Another_user_cannot_list_update_or_delete_my_experience()
    {
        using var t = new TestDb();
        var owner = t.AddUser("owner");
        var attacker = t.AddUser("attacker");
        var svc = new CareerService(t.Db);
        var mine = (await svc.CreateExperienceAsync(owner.Id, Exp("Mine"))).Value!;

        Assert.Empty(await svc.ListExperienceAsync(attacker.Id));
        Assert.Equal(Outcome.NotFound, (await svc.UpdateExperienceAsync(attacker.Id, mine.Id, Exp("Hacked"))).Outcome);
        Assert.False(await svc.DeleteExperienceAsync(attacker.Id, mine.Id));

        t.Db.ChangeTracker.Clear();
        var row = await t.Db.WorkExperiences.SingleAsync();
        Assert.Equal("Mine", row.Company);
    }

    [Fact]
    public async Task Owner_can_update_and_delete_experience()
    {
        using var t = new TestDb();
        var u = t.AddUser();
        var svc = new CareerService(t.Db);
        var e = (await svc.CreateExperienceAsync(u.Id, Exp("Old"))).Value!;

        var updated = await svc.UpdateExperienceAsync(u.Id, e.Id, Exp("New"));
        Assert.Equal("New", updated.Value!.Company);

        Assert.True(await svc.DeleteExperienceAsync(u.Id, e.Id));
        Assert.Equal(0, await t.Db.WorkExperiences.CountAsync());
        Assert.False(await svc.DeleteExperienceAsync(u.Id, e.Id)); // already gone
    }

    // ---- experience: ordering ----
    [Fact]
    public async Task Experience_lists_current_role_first_then_newest_start()
    {
        using var t = new TestDb();
        var u = t.AddUser();
        var svc = new CareerService(t.Db);
        await svc.CreateExperienceAsync(u.Id, Exp("oldest", new(2020, 1, 1), new(2021, 1, 1)));
        await svc.CreateExperienceAsync(u.Id, Exp("newer-finished", new(2022, 1, 1), new(2023, 1, 1)));
        await svc.CreateExperienceAsync(u.Id, Exp("current", new(2021, 6, 1), null));

        var names = (await svc.ListExperienceAsync(u.Id)).Select(x => x.Company);

        Assert.Equal(["current", "newer-finished", "oldest"], names);
    }

    // ---- education ----
    [Fact]
    public async Task Education_requires_institution_and_checks_dates()
    {
        using var t = new TestDb();
        var u = t.AddUser();
        var svc = new CareerService(t.Db);

        Assert.Equal(Outcome.Invalid, (await svc.CreateEducationAsync(u.Id, new("", "BSc", null, null))).Outcome);
        Assert.Equal(Outcome.Invalid, (await svc.CreateEducationAsync(u.Id, new("TU", "BSc", Mar, Jan))).Outcome);
        Assert.Equal(0, await t.Db.Educations.CountAsync());
    }

    [Fact]
    public async Task Another_user_cannot_list_update_or_delete_my_education()
    {
        using var t = new TestDb();
        var owner = t.AddUser("owner");
        var attacker = t.AddUser("attacker");
        var svc = new CareerService(t.Db);
        var mine = (await svc.CreateEducationAsync(owner.Id, new("TU Sofia", "BSc", Jan, Jun))).Value!;

        Assert.Empty(await svc.ListEducationAsync(attacker.Id));
        Assert.Equal(Outcome.NotFound, (await svc.UpdateEducationAsync(attacker.Id, mine.Id, new("Evil U", "", null, null))).Outcome);
        Assert.False(await svc.DeleteEducationAsync(attacker.Id, mine.Id));

        t.Db.ChangeTracker.Clear();
        Assert.Equal("TU Sofia", (await t.Db.Educations.SingleAsync()).Institution);
    }

    [Fact]
    public async Task Owner_can_crud_education()
    {
        using var t = new TestDb();
        var u = t.AddUser();
        var svc = new CareerService(t.Db);
        var e = (await svc.CreateEducationAsync(u.Id, new("TU", "BSc", Jan, Jun))).Value!;

        Assert.Equal("MSc", (await svc.UpdateEducationAsync(u.Id, e.Id, new("TU", "MSc", Jan, Jun))).Value!.Degree);
        Assert.Single(await svc.ListEducationAsync(u.Id));
        Assert.True(await svc.DeleteEducationAsync(u.Id, e.Id));
        Assert.Empty(await svc.ListEducationAsync(u.Id));
    }
}
