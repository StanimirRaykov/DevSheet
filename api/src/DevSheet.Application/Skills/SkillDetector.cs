namespace DevSheet.Application.Skills;

/// <summary>
/// Turns a repo's language byte counts into canonical skill ids. Pure logic, no I/O.
/// A language is only a weak signal, so results are suggestions, never public by themselves.
/// </summary>
public static class SkillDetector
{
    /// <summary>A language counts when it makes up at least this share of the repo's bytes.</summary>
    public const double MinShare = 0.05;

    public static IReadOnlyCollection<Guid> Detect(
        IReadOnlyDictionary<string, long> languages,
        IReadOnlyDictionary<string, Guid> aliasToSkillId)
    {
        var total = languages.Values.Where(v => v > 0).Sum();
        var result = new HashSet<Guid>();
        if (total == 0) return result;

        foreach (var (language, bytes) in languages)
        {
            if (bytes <= 0 || (double)bytes / total < MinShare) continue;
            if (aliasToSkillId.TryGetValue(SkillCatalog.Normalize(language), out var skillId))
                result.Add(skillId); // unknown languages are ignored; we never create skills from raw GitHub strings
        }
        return result;
    }
}
