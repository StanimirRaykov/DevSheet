namespace DevSheet.Api;

/// <summary>
/// Where a successful sign-in lands. An account that has not finished or skipped the welcome flow goes to
/// /welcome, whatever page it asked for; after that, always the page it asked for.
/// </summary>
public static class SignInRedirect
{
    public const string WelcomePath = "/welcome";

    public static string After(string requested, string webOrigin, bool onboardingCompleted) =>
        onboardingCompleted ? requested : webOrigin + WelcomePath;
}
