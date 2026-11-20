using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;

namespace DevSheet.Domain;

/// <summary>
/// Public page slugs: 3-30 characters, lowercase letters, digits and hyphens, no hyphen at either end,
/// and not a reserved route name (<see cref="ReservedSlugs"/>).
/// </summary>
public static partial class SlugRules
{
    public const int MinLength = 3;
    public const int MaxLength = 30;

    [GeneratedRegex("^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$")]
    private static partial Regex Shape();

    [GeneratedRegex("[^a-z0-9]+")]
    private static partial Regex NotAllowed();

    public static bool IsValid(string slug) =>
        slug.Length is >= MinLength and <= MaxLength && Shape().IsMatch(slug) && !ReservedSlugs.IsReserved(slug);

    /// <summary>
    /// A slug-shaped version of any name ("María López" → "maria-lopez", "Maria-P" → "maria-p").
    /// The result has a valid shape but may be reserved or taken; see <see cref="Candidates"/>.
    /// </summary>
    public static string FromName(string name)
    {
        var plain = new StringBuilder();
        foreach (var c in name.Normalize(NormalizationForm.FormD))
            if (CharUnicodeInfo.GetUnicodeCategory(c) != UnicodeCategory.NonSpacingMark) plain.Append(c);

        var slug = NotAllowed().Replace(plain.ToString().ToLowerInvariant(), "-").Trim('-');
        slug = Trim(slug, MaxLength);
        return slug.Length >= MinLength ? slug : Trim(("user-" + slug).TrimEnd('-'), MaxLength);
    }

    /// <summary>"maria", then "maria-2", "maria-3", ... Reserved ones are skipped; the caller skips taken ones.</summary>
    public static IEnumerable<string> Candidates(string name)
    {
        var slug = FromName(name);
        if (IsValid(slug)) yield return slug;
        for (var n = 2; ; n++)
        {
            var suffix = "-" + n;
            var candidate = Trim(slug, MaxLength - suffix.Length) + suffix;
            if (IsValid(candidate)) yield return candidate;
        }
    }

    private static string Trim(string slug, int max) => slug.Length <= max ? slug : slug[..max].TrimEnd('-');
}
