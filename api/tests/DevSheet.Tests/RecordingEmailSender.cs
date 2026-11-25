using System.Collections.Concurrent;
using DevSheet.Application.Abstractions;

namespace DevSheet.Tests;

/// <summary>Keeps sent emails in memory instead of talking to SMTP. <see cref="ApiHost"/> uses it for every test.</summary>
public class RecordingEmailSender : IEmailSender
{
    private readonly ConcurrentQueue<EmailMessage> _sent = new();
    public IReadOnlyList<EmailMessage> Sent => _sent.ToList();

    public Task SendAsync(EmailMessage message, CancellationToken ct = default)
    {
        _sent.Enqueue(message);
        return Task.CompletedTask;
    }
}
