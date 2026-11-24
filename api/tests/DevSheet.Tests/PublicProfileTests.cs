using System.Text.Json;
using DevSheet.Api.Controllers;
using DevSheet.Application.Career;
using DevSheet.Infrastructure.Career;
using Microsoft.AspNetCore.Mvc;
using DevSheet.Infrastructure.Cv;

namespace DevSheet.Tests;

public class PublicProfileTests
{
    private static JsonElement Get(TestDb t, string slug)
    {
        var ok = Assert.IsType<OkObjectResult>(new PublicController(t.Db, new CvDataService(t.Db)).Get(slug).GetAwaiter().GetResult());
        return JsonSerializer.SerializeToElement(ok.Value, new JsonSerializerOptions(JsonSerializerDefaults.Web));
    }

    private static void SetProfile(TestDb t, Guid userId, bool showEmail, bool showLocation) =>
        new CareerService(t.Db).UpsertProfileAsync(userId,
            new ProfileInput("Ana Petrova", "Backend dev", "Hello", "Sofia", "ana@example.com", showEmail, showLocation))
            .GetAwaiter().GetResult();

    [Fact]
    public void Email_and_location_are_hidden_by_default()
    {
        using var t = new TestDb();
        var u = t.AddUser("ana", published: true);
        SetProfile(t, u.Id, showEmail: false, showLocation: false);

        var json = Get(t, "ana");
        var raw = json.GetRawText();

        Assert.DoesNotContain("ana@example.com", raw);
        Assert.DoesNotContain("Sofia", raw);
        Assert.Contains("Ana Petrova", raw);
        Assert.Equal("Backend dev", json.GetProperty("profile").GetProperty("headline").GetString());
    }

    [Fact]
    public void Email_and_location_appear_only_when_the_owner_opts_in()
    {
        using var t = new TestDb();
        var u = t.AddUser("bea", published: true);
        SetProfile(t, u.Id, showEmail: true, showLocation: false);

        var raw = Get(t, "bea").GetRawText();

        Assert.Contains("ana@example.com", raw);
        Assert.DoesNotContain("Sofia", raw); // location flag is independent
    }

    [Fact]
    public void Phone_and_country_appear_only_when_the_owner_opts_in()
    {
        using var t = new TestDb();
        var u = t.AddUser("phoebe", published: true);
        var svc = new CareerService(t.Db);
        ProfileInput Input(bool showPhone, bool showLocation) => new("Ana Petrova", "", "", "Sofia", "", false, showLocation,
            Phone: "+359 88 123 4567", CountryCode: "bg", ShowPhonePublicly: showPhone);

        svc.UpsertProfileAsync(u.Id, Input(showPhone: false, showLocation: false)).GetAwaiter().GetResult();
        var hidden = Get(t, "phoebe").GetRawText();
        Assert.DoesNotContain("123 4567", hidden);
        Assert.DoesNotContain("Bulgaria", hidden);

        svc.UpsertProfileAsync(u.Id, Input(showPhone: true, showLocation: true)).GetAwaiter().GetResult();
        var profile = Get(t, "phoebe").GetProperty("profile");
        Assert.Equal("+359 88 123 4567", profile.GetProperty("phone").GetString());
        Assert.Equal("Sofia, Bulgaria", profile.GetProperty("location").GetString());
    }

    [Fact]
    public void Experience_and_education_are_listed_with_current_role_first()
    {
        using var t = new TestDb();
        var u = t.AddUser("cat", published: true);
        var svc = new CareerService(t.Db);
        svc.CreateExperienceAsync(u.Id, new("Past Co", "Dev", new(2019, 1, 1), new(2020, 1, 1), "")).GetAwaiter().GetResult();
        svc.CreateExperienceAsync(u.Id, new("Now Co", "Lead", new(2021, 1, 1), null, "")).GetAwaiter().GetResult();
        svc.CreateEducationAsync(u.Id, new("TU Sofia", "BSc", new(2016, 9, 1), new(2020, 6, 1))).GetAwaiter().GetResult();

        var json = Get(t, "cat");
        var companies = json.GetProperty("experience").EnumerateArray().Select(e => e.GetProperty("company").GetString());

        Assert.Equal(["Now Co", "Past Co"], companies);
        Assert.Equal("TU Sofia", json.GetProperty("education")[0].GetProperty("institution").GetString());
    }

    [Fact]
    public void Page_without_a_profile_still_works()
    {
        using var t = new TestDb();
        t.AddUser("dan", published: true);

        var json = Get(t, "dan");

        Assert.Equal(JsonValueKind.Null, json.GetProperty("profile").ValueKind);
        Assert.Equal(0, json.GetProperty("experience").GetArrayLength());
    }
}
