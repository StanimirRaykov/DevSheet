namespace DevSheet.Domain;

/// <summary>
/// Public page slugs live at the site root (/maria), so they must never match a route of the web app.
/// The web app keeps a copy in web/src/lib/reserved-slugs.ts; a web test fails if the two lists differ
/// or if a top-level folder in web/src/app is missing here.
/// </summary>
public static class ReservedSlugs
{
    // reserved-slugs:start
    private static readonly HashSet<string> Names = new(StringComparer.OrdinalIgnoreCase)
    {
        "about",
        "account",
        "admin",
        "api",
        "auth",
        "blog",
        "contact",
        "cv",
        "dashboard",
        "demo",
        "dev",
        "docs",
        "help",
        "login",
        "logout",
        "me",
        "new",
        "pricing",
        "privacy",
        "register",
        "settings",
        "signup",
        "static",
        "status",
        "support",
        "terms",
        "welcome",
        "www",
    };
    // reserved-slugs:end

    public static bool IsReserved(string slug) => Names.Contains(slug.Trim());
}
