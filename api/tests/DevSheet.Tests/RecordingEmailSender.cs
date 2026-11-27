using System.Collections.Concurrent;
using DevSheet.Application.Abstractions;

namespace DevSheet.Tests;

/// <summary>Keeps sent emails in memory instead of talking to SMTP. <see cref="ApiHost"/> uses it for every test.</summary>
public class RecordingEmailSender : IEmailSender
{
    private readonly ConcurrentQueue<EmailMessage> _sent = new();
    public IReadOnlyList<EmailMessage> Sent => _sent.ToList();
    /// <summary>Set to make every send fail, like a mail server that is down.</summary>
    public bool Fail { get; set; }

    public Task SendAsync(EmailMessage message, CancellationToken ct = default)
    {
        if (Fail) throw new IOException("mail server down (test)");
        _sent.Enqueue(message);
        return Task.CompletedTask;
    }
}
