using System.Globalization;
using DevSheet.Application.Career;

namespace DevSheet.Application.Cv;

public static class CvFormat
{
    private static readonly CultureInfo Inv = CultureInfo.InvariantCulture;

    public static string Month(DateOnly d) => d.ToString("MMM yyyy", Inv);

    /// <summary>"Jan 2023 - Present". A missing end date means ongoing. Empty when both are missing.</summary>
    public static string Range(DateOnly? start, DateOnly? end)
    {
        if (start is null && end is null) return "";
        if (start is null) return Month(end!.Value);
        return $"{Month(start.Value)} – {(end is { } e ? Month(e) : "Present")}";
    }

    /// <summary>"Plovdiv, Bulgaria": the free-text location and the country name, each optional. Empty when neither.</summary>
    public static string Place(string? location, string? countryCode)
    {
        var city = location?.Trim() ?? "";
        var country = Countries.Find(countryCode)?.Name ?? "";
        // Someone who already typed the country into the location does not get it twice.
        if (country.Length > 0 && city.Contains(country, StringComparison.OrdinalIgnoreCase)) return city;
        return string.Join(", ", new[] { city, country }.Where(s => s.Length > 0));
    }
}
