namespace DevSheet.Api;

/// <summary>
/// Guards "come back here after login" paths. Only paths on our own web app are allowed,
/// so a crafted link cannot send a user to another site after signing in (open redirect).
/// Same rules as safeNext() in web/src/lib/redirect.ts.
/// </summary>
public static class LocalPath
{
    public const string Fallback = "/dashboard";

    public static bool IsSafe(string? path) =>
        !string.IsNullOrEmpty(path)
        && path.Length <= 2048
        && path[0] == '/'
        && !path.StartsWith("//")
        && !path.Contains('\\')
        && !path.Any(char.IsControl);

    public static string OrFallback(string? path, string fallback = Fallback) => IsSafe(path) ? path! : fallback;
}
