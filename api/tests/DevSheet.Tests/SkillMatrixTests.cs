using DevSheet.Application.Skills;

namespace DevSheet.Tests;

public class SkillMatrixTests
{
    [Fact]
    public void Skill_used_by_two_projects_lists_both_and_sorts_first()
    {
        var matrix = SkillMatrix.Build(
        [
            ("alpha", new[] { "C#", "Docker" }),
            ("beta", new[] { "C#" }),
        ]);

        Assert.Equal("C#", matrix[0].Name);
        Assert.Equal(["alpha", "beta"], matrix[0].Projects);
        Assert.Equal("Docker", matrix[1].Name);
    }

    [Fact]
    public void Ties_sort_by_name_and_case_differences_merge()
    {
        var matrix = SkillMatrix.Build([("a", new[] { "Zed", "react" }), ("b", new[] { "React" })]);

        Assert.Equal(["react", "Zed"], matrix.Select(m => m.Name));
        Assert.Equal(2, matrix[0].Projects.Count);
    }

    [Fact]
    public void Duplicate_skill_in_one_project_counts_once()
    {
        var matrix = SkillMatrix.Build([("a", new[] { "C#", "c#" })]);
        Assert.Single(matrix);
        Assert.Single(matrix[0].Projects);
    }

    [Fact]
    public void No_projects_gives_empty_matrix() => Assert.Empty(SkillMatrix.Build([]));
}
