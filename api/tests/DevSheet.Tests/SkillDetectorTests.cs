using DevSheet.Application.Skills;

namespace DevSheet.Tests;

public class SkillDetectorTests
{
    private static readonly Guid Py = Guid.NewGuid(), Cs = Guid.NewGuid(), Docker = Guid.NewGuid(), Pg = Guid.NewGuid();

    private static readonly Dictionary<string, Guid> Aliases = new()
    {
        ["python"] = Py, ["c#"] = Cs, ["docker"] = Docker, ["dockerfile"] = Docker,
        ["postgresql"] = Pg, ["plpgsql"] = Pg,
    };

    [Fact]
    public void Language_below_5_percent_is_not_suggested()
    {
        var result = SkillDetector.Detect(new Dictionary<string, long> { ["Python"] = 4, ["C#"] = 96 }, Aliases);
        Assert.DoesNotContain(Py, result);
        Assert.Contains(Cs, result);
    }

    [Fact]
    public void Language_at_exactly_5_percent_is_suggested()
    {
        var result = SkillDetector.Detect(new Dictionary<string, long> { ["Python"] = 5, ["C#"] = 95 }, Aliases);
        Assert.Contains(Py, result);
    }

    [Fact]
    public void Github_language_name_maps_through_alias()
    {
        var result = SkillDetector.Detect(new Dictionary<string, long> { ["Dockerfile"] = 100 }, Aliases);
        Assert.Equal([Docker], result);
    }

    [Fact]
    public void Two_aliases_of_one_skill_produce_one_suggestion()
    {
        var result = SkillDetector.Detect(new Dictionary<string, long> { ["PLpgSQL"] = 50, ["PostgreSQL"] = 50 }, Aliases);
        Assert.Single(result);
        Assert.Contains(Pg, result);
    }

    [Fact]
    public void Matching_is_case_insensitive()
    {
        var result = SkillDetector.Detect(new Dictionary<string, long> { ["PYTHON"] = 100 }, Aliases);
        Assert.Contains(Py, result);
    }

    [Fact]
    public void Unknown_language_is_ignored()
    {
        var result = SkillDetector.Detect(new Dictionary<string, long> { ["Brainfuck"] = 100 }, Aliases);
        Assert.Empty(result);
    }

    [Fact]
    public void No_languages_or_zero_bytes_gives_nothing()
    {
        Assert.Empty(SkillDetector.Detect(new Dictionary<string, long>(), Aliases));
        Assert.Empty(SkillDetector.Detect(new Dictionary<string, long> { ["Python"] = 0 }, Aliases));
    }
}
