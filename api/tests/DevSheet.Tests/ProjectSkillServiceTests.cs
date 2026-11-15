using DevSheet.Domain.Entities;
using DevSheet.Infrastructure.Skills;
using Microsoft.EntityFrameworkCore;

namespace DevSheet.Tests;

public class ProjectSkillServiceTests
{
    private static (TestDb t, ProjectSkillService svc, User owner, Project project) Setup()
    {
        var t = new TestDb();
        t.SeedSkills();
        var owner = t.AddUser("owner");
        var project = t.AddProjectFor(owner, "repo");
        return (t, new ProjectSkillService(t.Db), owner, project);
    }

    // --- confirm / reject ---

    [Fact]
    public async Task Owner_can_confirm_and_reject()
    {
        var (t, svc, owner, p) = Setup();
        using var _ = t;
        t.Link(p, "C#", LinkStatus.Suggested);

        Assert.True(await svc.SetStatusAsync(owner.Id, p.Id, t.SkillId("C#"), LinkStatus.Confirmed));
        Assert.Equal(LinkStatus.Confirmed, (await t.Db.ProjectSkills.SingleAsync()).Status);

        Assert.True(await svc.SetStatusAsync(owner.Id, p.Id, t.SkillId("C#"), LinkStatus.Rejected));
        Assert.Equal(LinkStatus.Rejected, (await t.Db.ProjectSkills.SingleAsync()).Status);
    }

    [Fact]
    public async Task Another_user_cannot_change_a_skill_on_my_project()
    {
        var (t, svc, _, p) = Setup();
        using var _ = t;
        var attacker = t.AddUser("attacker");
        t.Link(p, "C#", LinkStatus.Suggested);

        var ok = await svc.SetStatusAsync(attacker.Id, p.Id, t.SkillId("C#"), LinkStatus.Confirmed);

        Assert.False(ok);
        t.Db.ChangeTracker.Clear();
        Assert.Equal(LinkStatus.Suggested, (await t.Db.ProjectSkills.SingleAsync()).Status);
    }

    [Fact]
    public async Task Setting_status_on_a_missing_link_returns_false()
    {
        var (t, svc, owner, p) = Setup();
        using var _ = t;
        Assert.False(await svc.SetStatusAsync(owner.Id, p.Id, t.SkillId("C#"), LinkStatus.Confirmed));
    }

    [Fact]
    public async Task Suggested_cannot_be_set_through_the_owner_action()
    {
        var (t, svc, owner, p) = Setup();
        using var _ = t;
        t.Link(p, "C#", LinkStatus.Confirmed);
        await Assert.ThrowsAsync<ArgumentException>(() =>
            svc.SetStatusAsync(owner.Id, p.Id, t.SkillId("C#"), LinkStatus.Suggested));
    }

    // --- add manually ---

    [Fact]
    public async Task Another_user_cannot_add_a_skill_to_my_project()
    {
        var (t, svc, _, p) = Setup();
        using var _ = t;
        var attacker = t.AddUser("attacker");
        var skillsBefore = await t.Db.Skills.CountAsync();

        var result = await svc.AddManualAsync(attacker.Id, p.Id, "Svelte");

        Assert.Null(result);
        Assert.Equal(0, await t.Db.ProjectSkills.CountAsync());
        Assert.Equal(skillsBefore, await t.Db.Skills.CountAsync()); // no custom skill leaked either
    }

    [Fact]
    public async Task Adding_by_alias_reuses_the_canonical_skill()
    {
        var (t, svc, owner, p) = Setup();
        using var _ = t;
        var skillsBefore = await t.Db.Skills.CountAsync();

        var result = await svc.AddManualAsync(owner.Id, p.Id, "  ReactJS ");

        Assert.NotNull(result);
        Assert.Equal("React", result!.Name);
        Assert.Equal(LinkStatus.Confirmed, result.Status);
        Assert.Equal(skillsBefore, await t.Db.Skills.CountAsync()); // no duplicate skill
    }

    [Fact]
    public async Task Unknown_name_creates_one_custom_skill_reused_case_insensitively()
    {
        var (t, svc, owner, p) = Setup();
        using var _ = t;
        var other = t.AddProjectFor(owner, "other");
        var skillsBefore = await t.Db.Skills.CountAsync();

        var first = await svc.AddManualAsync(owner.Id, p.Id, "Svelte");
        var second = await svc.AddManualAsync(owner.Id, other.Id, "svelte");

        Assert.Equal(skillsBefore + 1, await t.Db.Skills.CountAsync());
        Assert.Equal(first!.SkillId, second!.SkillId);
    }

    [Fact]
    public async Task Adding_a_rejected_skill_confirms_it_without_duplicating_the_link()
    {
        var (t, svc, owner, p) = Setup();
        using var _ = t;
        t.Link(p, "Python", LinkStatus.Rejected);

        var result = await svc.AddManualAsync(owner.Id, p.Id, "python");

        Assert.Equal(LinkStatus.Confirmed, result!.Status);
        Assert.Equal(1, await t.Db.ProjectSkills.CountAsync());
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public async Task Blank_name_is_rejected(string name)
    {
        var (t, svc, owner, p) = Setup();
        using var _ = t;
        await Assert.ThrowsAsync<ArgumentException>(() => svc.AddManualAsync(owner.Id, p.Id, name));
    }

    [Fact]
    public async Task Overlong_name_is_rejected()
    {
        var (t, svc, owner, p) = Setup();
        using var _ = t;
        await Assert.ThrowsAsync<ArgumentException>(() =>
            svc.AddManualAsync(owner.Id, p.Id, new string('x', ProjectSkillService.MaxNameLength + 1)));
    }

    // --- search ---

    [Fact]
    public async Task Search_matches_names_and_aliases_and_ignores_blank_queries()
    {
        var (t, svc, _, _) = Setup();
        using var _ = t;

        Assert.Contains("React", (await svc.SearchAsync("rea")).Select(s => s.Name));
        Assert.Contains("Docker", (await svc.SearchAsync("dockerf")).Select(s => s.Name)); // via alias
        Assert.Empty(await svc.SearchAsync("   "));
        Assert.Empty(await svc.SearchAsync(null));
    }
}
