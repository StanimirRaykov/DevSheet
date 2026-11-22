namespace DevSheet.Application.Skills;

public record MatrixEntry(string Name, IReadOnlyList<string> Projects)
{
    public string Category => SkillCatalog.CategoryOf(Name);
}

/// <summary>The "matrix": for each skill, the projects it was used in. Pure logic.</summary>
public static class SkillMatrix
{
    public static IReadOnlyList<MatrixEntry> Build(IEnumerable<(string Project, IEnumerable<string> Skills)> projects)
    {
        var map = new Dictionary<string, List<string>>(StringComparer.OrdinalIgnoreCase);
        foreach (var (project, skills) in projects)
            foreach (var skill in skills.Distinct(StringComparer.OrdinalIgnoreCase))
            {
                if (!map.TryGetValue(skill, out var list)) map[skill] = list = new List<string>();
                list.Add(project);
            }

        return map
            .Select(kv => new MatrixEntry(kv.Key, kv.Value))
            .OrderByDescending(e => e.Projects.Count)
            .ThenBy(e => e.Name, StringComparer.OrdinalIgnoreCase)
            .ToList();
    }
}
