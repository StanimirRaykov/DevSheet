using DevSheet.Application.Abstractions;
using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Configuration;
using MimeKit;

namespace DevSheet.Infrastructure.Email;

/// <summary>
/// SMTP settings, section <c>Email:Smtp</c>. The defaults are Mailpit from docker-compose (localhost:1025, no
/// login, no TLS), so development works without configuration. Anywhere else set Host, Port, Security, User,
/// Password and From; the password is a secret (user-secrets or the environment, never committed).
/// </summary>
public record SmtpOptions(
    string Host, int Port, SecureSocketOptions Security, string? User, string? Password, string FromAddress, string FromName)
{
    public static SmtpOptions From(IConfiguration config)
    {
        var s = config.GetSection("Email:Smtp");
        return new SmtpOptions(
            Host: Value(s["Host"]) ?? "localhost",
            Port: int.TryParse(s["Port"], out var port) ? port : 1025,
            Security: Enum.TryParse<SecureSocketOptions>(s["Security"], ignoreCase: true, out var security) ? security : SecureSocketOptions.None,
            User: Value(s["User"]),
            Password: Value(s["Password"]),
            FromAddress: Value(s["From"]) ?? "no-reply@devsheet.local",
            FromName: Value(s["FromName"]) ?? "DevSheet");
    }

    private static string? Value(string? raw) => string.IsNullOrWhiteSpace(raw) ? null : raw.Trim();
}

/// <summary>Sends through SMTP with MailKit: one connection per email, which is plenty for account emails.</summary>
public class SmtpEmailSender(SmtpOptions options) : IEmailSender
{
    public async Task SendAsync(EmailMessage message, CancellationToken ct = default)
    {
        using var client = new SmtpClient();
        await client.ConnectAsync(options.Host, options.Port, options.Security, ct);
        if (options.User is not null)
            await client.AuthenticateAsync(options.User, options.Password ?? "", ct);
        await client.SendAsync(Build(message, options), ct);
        await client.DisconnectAsync(quit: true, ct);
    }

    /// <summary>The MIME message: plain text and HTML alternatives, from the configured sender.</summary>
    public static MimeMessage Build(EmailMessage message, SmtpOptions options)
    {
        var mime = new MimeMessage();
        mime.From.Add(new MailboxAddress(options.FromName, options.FromAddress));
        mime.To.Add(MailboxAddress.Parse(message.To));
        mime.Subject = message.Subject;
        mime.Body = new BodyBuilder { TextBody = message.Text, HtmlBody = message.Html }.ToMessageBody();
        return mime;
    }
}
