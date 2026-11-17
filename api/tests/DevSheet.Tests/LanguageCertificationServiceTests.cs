using DevSheet.Application.Career;
using DevSheet.Domain.Entities;
using DevSheet.Infrastructure.Career;
using Microsoft.EntityFrameworkCore;

namespace DevSheet.Tests;

public class LanguageServiceTests
{
    private static LanguageInput Foreign(string name, CefrLevel level = CefrLevel.B2, string? iso = null) =>
        new(name, iso, false, level, level, level, level, level);

    private static LanguageInput Native(string name) => new(name, null, true, null, null, null, null, null);

    [Fact]
    public async Task Owner_can_create_update_list_and_delete()
    {
        using var t = new TestDb();
        var u = t.AddUser();
        var svc = new CareerService(t.Db);

        var created = (await svc.CreateLanguageAsync(u.Id, Foreign("English", CefrLevel.B2, "en"))).Value!;
        Assert.Equal(CefrLevel.B2, created.Listening);
        Assert.Equal("en", created.IsoCode);

        var updated = (await svc.UpdateLanguageAsync(u.Id, created.Id, Foreign("English", CefrLevel.C1, "en"))).Value!;
        Assert.Equal(CefrLevel.C1, updated.Writing);
        Assert.Single(await svc.ListLanguagesAsync(u.Id));

        Assert.True(await svc.DeleteLanguageAsync(u.Id, created.Id));
        Assert.Empty(await svc.ListLanguagesAsync(u.Id));
        Assert.False(await svc.DeleteLanguageAsync(u.Id, created.Id)); // already gone
    }

    [Fact]
    public async Task Input_is_trimmed_and_blank_iso_code_is_stored_as_null()
    {
        using var t = new TestDb();
        var u = t.AddUser();

        var created = (await new CareerService(t.Db).CreateLanguageAsync(u.Id,
            new("  German  ", "   ", false, CefrLevel.A2, null, null, null, null))).Value!;

        Assert.Equal("German", created.Name);
        Assert.Null(created.IsoCode);
    }

    [Fact]
    public async Task Duplicate_language_name_is_rejected_ignoring_case_and_spaces()
    {
        using var t = new TestDb();
        var u = t.AddUser();
        var svc = new CareerService(t.Db);
        await svc.CreateLanguageAsync(u.Id, Foreign("English"));

        var dup = await svc.CreateLanguageAsync(u.Id, Foreign("  english "));

        Assert.Equal(Outcome.Invalid, dup.Outcome);
        Assert.Contains("name", dup.Errors!.Keys);
        Assert.Equal(1, await t.Db.Languages.CountAsync());
    }

    [Fact]
    public async Task Renaming_to_another_existing_language_is_rejected_but_keeping_own_name_is_fine()
    {
        using var t = new TestDb();
        var u = t.AddUser();
        var svc = new CareerService(t.Db);
        var english = (await svc.CreateLanguageAsync(u.Id, Foreign("English"))).Value!;
        await svc.CreateLanguageAsync(u.Id, Foreign("German"));

        Assert.Equal(Outcome.Ok, (await svc.UpdateLanguageAsync(u.Id, english.Id, Foreign("English", CefrLevel.C1))).Outcome);
        Assert.Equal(Outcome.Invalid, (await svc.UpdateLanguageAsync(u.Id, english.Id, Foreign("german"))).Outcome);
    }

    [Fact]
    public async Task Different_users_can_have_the_same_language()
    {
        using var t = new TestDb();
        var svc = new CareerService(t.Db);

        Assert.Equal(Outcome.Ok, (await svc.CreateLanguageAsync(t.AddUser("a").Id, Foreign("English"))).Outcome);
        Assert.Equal(Outcome.Ok, (await svc.CreateLanguageAsync(t.AddUser("b").Id, Foreign("English"))).Outcome);
    }

    [Fact]
    public async Task Invalid_create_saves_nothing_and_invalid_update_changes_nothing()
    {
        using var t = new TestDb();
        var u = t.AddUser();
        var svc = new CareerService(t.Db);

        Assert.Equal(Outcome.Invalid, (await svc.CreateLanguageAsync(u.Id, Native("Bulgarian") with { Listening = CefrLevel.C2 })).Outcome);
        Assert.Equal(0, await t.Db.Languages.CountAsync());

        var ok = (await svc.CreateLanguageAsync(u.Id, Foreign("English", CefrLevel.B1))).Value!;
        Assert.Equal(Outcome.Invalid, (await svc.UpdateLanguageAsync(u.Id, ok.Id, Foreign(""))).Outcome);
        t.Db.ChangeTracker.Clear();
        Assert.Equal("English", (await t.Db.Languages.SingleAsync()).Name);
    }

    [Fact]
    public async Task Another_user_cannot_list_update_or_delete_my_language()
    {
        using var t = new TestDb();
        var owner = t.AddUser("owner");
        var attacker = t.AddUser("attacker");
        var svc = new CareerService(t.Db);
        var mine = (await svc.CreateLanguageAsync(owner.Id, Foreign("English", CefrLevel.B2))).Value!;

        Assert.Empty(await svc.ListLanguagesAsync(attacker.Id));
        Assert.Equal(Outcome.NotFound, (await svc.UpdateLanguageAsync(attacker.Id, mine.Id, Foreign("Hacked"))).Outcome);
        Assert.False(await svc.DeleteLanguageAsync(attacker.Id, mine.Id));

        t.Db.ChangeTracker.Clear();
        var row = await t.Db.Languages.SingleAsync();
        Assert.Equal("English", row.Name);
        Assert.Equal(CefrLevel.B2, row.Listening);
    }

    [Fact]
    public async Task Native_languages_are_listed_first_then_alphabetical()
    {
        using var t = new TestDb();
        var u = t.AddUser();
        var svc = new CareerService(t.Db);
        await svc.CreateLanguageAsync(u.Id, Foreign("Spanish"));
        await svc.CreateLanguageAsync(u.Id, Foreign("English"));
        await svc.CreateLanguageAsync(u.Id, Native("Bulgarian"));

        var names = (await svc.ListLanguagesAsync(u.Id)).Select(l => l.Name);

        Assert.Equal(["Bulgarian", "English", "Spanish"], names);
    }
}

public class CertificationServiceTests
{
    private static readonly DateTimeOffset Now = new(2026, 11, 17, 12, 0, 0, TimeSpan.Zero);

    private static CareerService Svc(TestDb t) => new(t.Db, new FakeClock(Now));

    private static CertificationInput Cert(string name, DateOnly? date = null, string? url = null) => new(name, "Issuer", date, url);

    [Fact]
    public async Task Owner_can_create_update_list_and_delete()
    {
        using var t = new TestDb();
        var u = t.AddUser();
        var svc = Svc(t);

        var created = (await svc.CreateCertificationAsync(u.Id, Cert("AZ-900", new(2025, 5, 1), "https://x.example/c"))).Value!;
        Assert.Equal("https://x.example/c", created.Url);

        var updated = (await svc.UpdateCertificationAsync(u.Id, created.Id, Cert("AZ-204", new(2025, 6, 1)))).Value!;
        Assert.Equal("AZ-204", updated.Name);
        Assert.Null(updated.Url); // not sent again, so cleared
        Assert.Single(await svc.ListCertificationsAsync(u.Id));

        Assert.True(await svc.DeleteCertificationAsync(u.Id, created.Id));
        Assert.Empty(await svc.ListCertificationsAsync(u.Id));
    }

    [Fact]
    public async Task Issue_date_after_today_is_rejected_using_the_injected_clock()
    {
        using var t = new TestDb();
        var u = t.AddUser();
        var svc = Svc(t);

        Assert.Equal(Outcome.Invalid, (await svc.CreateCertificationAsync(u.Id, Cert("Future", new(2026, 11, 18)))).Outcome);
        Assert.Equal(Outcome.Ok, (await svc.CreateCertificationAsync(u.Id, Cert("Today", new(2026, 11, 17)))).Outcome);
        Assert.Equal(1, await t.Db.Certifications.CountAsync());
    }

    [Fact]
    public async Task Javascript_url_is_rejected_and_nothing_is_saved()
    {
        using var t = new TestDb();
        var u = t.AddUser();

        var r = await Svc(t).CreateCertificationAsync(u.Id, Cert("Evil", url: "javascript:alert(1)"));

        Assert.Equal(Outcome.Invalid, r.Outcome);
        Assert.Contains("url", r.Errors!.Keys);
        Assert.Equal(0, await t.Db.Certifications.CountAsync());
    }

    [Fact]
    public async Task Another_user_cannot_list_update_or_delete_my_certification()
    {
        using var t = new TestDb();
        var owner = t.AddUser("owner");
        var attacker = t.AddUser("attacker");
        var svc = Svc(t);
        var mine = (await svc.CreateCertificationAsync(owner.Id, Cert("Mine", new(2025, 1, 1)))).Value!;

        Assert.Empty(await svc.ListCertificationsAsync(attacker.Id));
        Assert.Equal(Outcome.NotFound, (await svc.UpdateCertificationAsync(attacker.Id, mine.Id, Cert("Hacked"))).Outcome);
        Assert.False(await svc.DeleteCertificationAsync(attacker.Id, mine.Id));

        t.Db.ChangeTracker.Clear();
        Assert.Equal("Mine", (await t.Db.Certifications.SingleAsync()).Name);
    }

    [Fact]
    public async Task Dated_certifications_are_newest_first_and_undated_last()
    {
        using var t = new TestDb();
        var u = t.AddUser();
        var svc = Svc(t);
        await svc.CreateCertificationAsync(u.Id, Cert("old", new(2020, 1, 1)));
        await svc.CreateCertificationAsync(u.Id, Cert("undated"));
        await svc.CreateCertificationAsync(u.Id, Cert("new", new(2025, 1, 1)));

        var names = (await svc.ListCertificationsAsync(u.Id)).Select(c => c.Name);

        Assert.Equal(["new", "old", "undated"], names);
    }

    [Fact]
    public async Task Blank_url_is_stored_as_null_and_issuer_defaults_to_empty()
    {
        using var t = new TestDb();
        var u = t.AddUser();

        var c = (await Svc(t).CreateCertificationAsync(u.Id, new("Cert", null, null, "  "))).Value!;

        Assert.Null(c.Url);
        Assert.Equal("", c.Issuer);
    }
}
