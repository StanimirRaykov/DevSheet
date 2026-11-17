using DevSheet.Application.Career;
using DevSheet.Domain.Entities;
using DevSheet.Infrastructure.Career;
using DevSheet.Infrastructure.Cv;

namespace DevSheet.Tests;

public class CvDataServiceTests
{
    private static (TestDb t, User u) Setup(string login = "ana")
    {
        var t = new TestDb();
        t.SeedSkills();
        return (t, t.AddUser(login));
    }

    [Fact]
    public async Task Only_confirmed_skills_of_visible_projects_reach_the_cv()
    {
        var (t, u) = Setup();
        using var _ = t;
        var shown = t.AddProjectFor(u, "shown");
        t.Link(shown, "C#", LinkStatus.Confirmed);
        t.Link(shown, "Python", LinkStatus.Suggested);
        t.Link(shown, "Docker", LinkStatus.Rejected);

        var cv = await new CvDataService(t.Db).BuildAsync(u.Id);

        Assert.Equal(["C#"], cv!.Skills);
        Assert.Equal(["C#"], cv.Projects.Single().Skills);
    }

    [Fact]
    public async Task Pending_and_hidden_projects_and_their_skills_never_appear()
    {
        var (t, u) = Setup();
        using var _ = t;
        var shown = t.AddProjectFor(u, "shown");
        var pending = t.AddProjectFor(u, "pending-secret", ProjectStatus.Pending);
        var hidden = t.AddProjectFor(u, "hidden-secret", ProjectStatus.Hidden);
        t.Link(shown, "C#", LinkStatus.Confirmed);
        t.Link(pending, "Rust", LinkStatus.Confirmed);
        t.Link(hidden, "Go", LinkStatus.Confirmed);

        var cv = await new CvDataService(t.Db).BuildAsync(u.Id);

        Assert.Equal(["shown"], cv!.Projects.Select(p => p.Title));
        Assert.DoesNotContain("Rust", cv.Skills);
        Assert.DoesNotContain("Go", cv.Skills);
    }

    [Fact]
    public async Task Another_users_data_never_appears()
    {
        var (t, u) = Setup("ana");
        using var _ = t;
        var other = t.AddUser("bob");
        t.Link(t.AddProjectFor(other, "bobs-repo"), "Rust", LinkStatus.Confirmed);
        await new CareerService(t.Db).CreateExperienceAsync(other.Id, new("BobCorp", "Dev", new(2020, 1, 1), null, ""));

        var cv = await new CvDataService(t.Db).BuildAsync(u.Id);

        Assert.Empty(cv!.Projects);
        Assert.Empty(cv.Skills);
        Assert.Empty(cv.Experience);
    }

    [Fact]
    public async Task Projects_are_capped()
    {
        var (t, u) = Setup();
        using var _ = t;
        for (var i = 0; i < CvDataService.MaxProjects + 4; i++) t.AddProjectFor(u, $"repo{i}");

        var cv = await new CvDataService(t.Db).BuildAsync(u.Id);

        Assert.Equal(CvDataService.MaxProjects, cv!.Projects.Count);
    }

    [Fact]
    public async Task Name_falls_back_to_github_login_and_contact_comes_from_profile()
    {
        var (t, u) = Setup("ana");
        using var _ = t;
        var svc = new CvDataService(t.Db);

        Assert.Equal("ana", (await svc.BuildAsync(u.Id))!.Name);

        // The CV is a deliberate export by the owner, so email/location are included even when not public.
        await new CareerService(t.Db).UpsertProfileAsync(u.Id,
            new ProfileInput("Ana Petrova", "Dev", "Hi", "Sofia", "ana@example.com", false, false));
        var cv = await svc.BuildAsync(u.Id);
        Assert.Equal("Ana Petrova", cv!.Name);
        Assert.Equal("ana@example.com", cv.Email);
        Assert.Equal("Sofia", cv.Location);
        Assert.Equal("github.com/ana", cv.GithubUrl);
    }

    [Fact]
    public async Task Unknown_user_gives_null() =>
        Assert.Null(await new CvDataService(new TestDb().Db).BuildAsync(Guid.NewGuid()));
}
