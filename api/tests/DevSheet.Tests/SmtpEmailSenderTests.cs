using DevSheet.Application.Abstractions;
using DevSheet.Infrastructure.Email;
using MailKit.Security;
using Microsoft.Extensions.Configuration;
using MimeKit;

namespace DevSheet.Tests;

public class SmtpEmailSenderTests
{
    private static SmtpOptions Options(params (string Key, string? Value)[] settings) =>
        SmtpOptions.From(new ConfigurationBuilder()
            .AddInMemoryCollection(settings.Select(s => new KeyValuePair<string, string?>("Email:Smtp:" + s.Key, s.Value)))
            .Build());

    [Fact]
    public void Defaults_are_the_local_mailpit()
    {
        var o = Options();
        Assert.Equal(("localhost", 1025, SecureSocketOptions.None), (o.Host, o.Port, o.Security));
        Assert.Null(o.User);
        Assert.Equal(("no-reply@devsheet.local", "DevSheet"), (o.FromAddress, o.FromName));
    }

    [Fact]
    public void Reads_a_real_provider_from_configuration()
    {
        var o = Options(("Host", " smtp.example.test "), ("Port", "587"), ("Security", "starttls"),
            ("User", "apikey"), ("Password", "not-a-real-secret"), ("From", "hello@example.test"), ("FromName", "DevSheet test"));
        Assert.Equal(("smtp.example.test", 587, SecureSocketOptions.StartTls), (o.Host, o.Port, o.Security));
        Assert.Equal(("apikey", "not-a-real-secret"), (o.User, o.Password));
        Assert.Equal(("hello@example.test", "DevSheet test"), (o.FromAddress, o.FromName));
    }

    [Fact]
    public void Blank_settings_fall_back_to_the_defaults()
    {
        var o = Options(("Host", "  "), ("Port", "not a number"), ("Security", "nonsense"), ("User", ""));
        Assert.Equal(("localhost", 1025, SecureSocketOptions.None), (o.Host, o.Port, o.Security));
        Assert.Null(o.User);
    }

    [Fact]
    public void Message_has_text_and_html_from_the_configured_sender()
    {
        var mime = SmtpEmailSender.Build(
            new EmailMessage("maria@example.test", "Confirm your email", "Plain body", "<p>Html body</p>"), Options());

        Assert.Equal("\"DevSheet\" <no-reply@devsheet.local>", mime.From.ToString());
        Assert.Equal("maria@example.test", mime.To.Mailboxes.Single().Address);
        Assert.Equal("Confirm your email", mime.Subject);
        var body = Assert.IsType<MultipartAlternative>(mime.Body);
        Assert.Equal("Plain body", mime.TextBody.Trim());
        Assert.Equal("<p>Html body</p>", mime.HtmlBody.Trim());
        Assert.Equal(2, body.Count);
    }
}
