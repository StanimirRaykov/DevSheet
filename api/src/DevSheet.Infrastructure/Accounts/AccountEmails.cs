using System.Net;
using DevSheet.Application.Abstractions;

namespace DevSheet.Infrastructure.Accounts;

/// <summary>
/// The account emails. Plain words, one action each, and the link written out in full so it can be copied when a
/// mail program blocks buttons. Links point at the web app (<paramref name="webOrigin"/>), which posts the token to the API.
/// </summary>
public class AccountEmails(string webOrigin)
{
    public EmailMessage ConfirmEmail(string to, string name, string token) => Build(to,
        "Confirm your email for DevSheet",
        $"Hi {name},",
        "Confirm this email address to finish creating your DevSheet account. The link works once and expires in 24 hours.",
        "Confirm email", Link("/confirm-email", token),
        "If you did not create a DevSheet account, ignore this email; nothing happens without the link.");

    public EmailMessage ResetPassword(string to, string name, string token) => Build(to,
        "Reset your DevSheet password",
        $"Hi {name},",
        "Choose a new password for your DevSheet account. The link works once and expires in 1 hour. Resetting signs you out everywhere else.",
        "Choose a new password", Link("/reset-password", token),
        "If you did not ask for this, ignore this email; your password stays the same.");

    /// <summary>Sent instead of a confirm link when someone signs up with an email that already has an account.</summary>
    public EmailMessage AlreadyRegistered(string to, string name) => Build(to,
        "You already have a DevSheet account",
        $"Hi {name},",
        "Someone tried to create a DevSheet account with this email address, which already has one. If it was you, sign in, or reset your password if you forgot it.",
        "Reset password", $"{webOrigin}/forgot-password",
        "If it was not you, ignore this email; nobody can use your account without your password.");

    public EmailMessage PasswordChanged(string to, string name) => Build(to,
        "Your DevSheet password was changed",
        $"Hi {name},",
        "The password for your DevSheet account was just changed, and other devices were signed out.",
        "Reset password", $"{webOrigin}/forgot-password",
        "If this was not you, reset your password now.");

    private string Link(string path, string token) => $"{webOrigin}{path}?token={Uri.EscapeDataString(token)}";

    private static EmailMessage Build(string to, string subject, string greeting, string body, string action, string url, string footer)
    {
        var text = $"{greeting}\n\n{body}\n\n{action}: {url}\n\n{footer}\n\nDevSheet\n";
        string H(string s) => WebUtility.HtmlEncode(s);
        var html = $"""
            <!doctype html>
            <html><body style="margin:0;padding:24px;background:#f6f6f4;font-family:Georgia,serif;color:#1d1d1b">
              <div style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #e3e3df;border-radius:8px;padding:32px">
                <p style="margin:0 0 16px">{H(greeting)}</p>
                <p style="margin:0 0 24px;line-height:1.5">{H(body)}</p>
                <p style="margin:0 0 24px"><a href="{H(url)}" style="display:inline-block;background:#1d1d1b;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:6px;font-family:Arial,sans-serif">{H(action)}</a></p>
                <p style="margin:0 0 24px;font-size:13px;color:#5c5c57;word-break:break-all">Or copy this link: {H(url)}</p>
                <p style="margin:0;font-size:13px;color:#5c5c57">{H(footer)}</p>
              </div>
            </body></html>
            """;
        return new EmailMessage(to, subject, text, html);
    }
}
