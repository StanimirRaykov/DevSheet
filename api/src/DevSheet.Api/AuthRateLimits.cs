using System.Threading.RateLimiting;
using DevSheet.Domain.Entities;
using Microsoft.AspNetCore.RateLimiting;

namespace DevSheet.Api;

/// <summary>
/// Limits on the password endpoints, against password guessing and against using DevSheet to flood someone's inbox.
/// Two layers: per IP address (middleware policies below) and per email address (<see cref="EmailThrottle"/>), so
/// guessing one account's password from many addresses is slowed down too. Numbers come from <c>Auth:RateLimits</c>.
/// </summary>
public record AuthRateLimits(int SignInsPerIpPerMinute, int EmailsPerIpPerHour, int SignInsPerEmailPer15Minutes, int EmailsPerAddressPerHour)
{
    public const string SignInPolicy = "auth-sign-in";
    public const string EmailPolicy = "auth-email";

    public static AuthRateLimits From(IConfiguration config)
    {
        var s = config.GetSection("Auth:RateLimits");
        return new AuthRateLimits(
            s.GetValue("SignInsPerIpPerMinute", 10),
            s.GetValue("EmailsPerIpPerHour", 20),
            s.GetValue("SignInsPerEmailPer15Minutes", 10),
            s.GetValue("EmailsPerAddressPerHour", 3));
    }

    public static void Add(IServiceCollection services, IConfiguration config)
    {
        var limits = From(config);
        services.AddSingleton(limits);
        services.AddSingleton<EmailThrottle>();
        services.AddRateLimiter(o =>
        {
            o.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
            o.OnRejected = (ctx, ct) => TooMany(ctx.HttpContext, ctx.Lease.TryGetMetadata(MetadataName.RetryAfter, out var after) ? after : null, ct);
            o.AddPolicy(SignInPolicy, http => RateLimitPartition.GetSlidingWindowLimiter(Ip(http), _ => Window(limits.SignInsPerIpPerMinute, TimeSpan.FromMinutes(1))));
            o.AddPolicy(EmailPolicy, http => RateLimitPartition.GetSlidingWindowLimiter(Ip(http), _ => Window(limits.EmailsPerIpPerHour, TimeSpan.FromHours(1))));
        });
    }

    /// <summary>429 with Retry-After and the error code the web app shows ("Too many attempts...").</summary>
    public static async ValueTask TooMany(HttpContext http, TimeSpan? retryAfter, CancellationToken ct)
    {
        http.Response.StatusCode = StatusCodes.Status429TooManyRequests;
        if (retryAfter is { } after) http.Response.Headers.RetryAfter = ((int)Math.Ceiling(after.TotalSeconds)).ToString();
        await http.Response.WriteAsJsonAsync(new { error = "too_many_attempts" }, ct);
    }

    private static string Ip(HttpContext http) => http.Connection.RemoteIpAddress?.ToString() ?? "unknown";

    internal static SlidingWindowRateLimiterOptions Window(int permits, TimeSpan window) => new()
    {
        PermitLimit = Math.Max(1, permits), Window = window, SegmentsPerWindow = 6, QueueLimit = 0,
    };
}

/// <summary>Per email address limits, kept in memory (one API instance; a shared store would be needed for several).</summary>
public sealed class EmailThrottle(AuthRateLimits limits) : IDisposable
{
    private readonly PartitionedRateLimiter<string> _signIns = PartitionedRateLimiter.Create<string, string>(key =>
        RateLimitPartition.GetSlidingWindowLimiter(key, _ => AuthRateLimits.Window(limits.SignInsPerEmailPer15Minutes, TimeSpan.FromMinutes(15))));
    private readonly PartitionedRateLimiter<string> _emails = PartitionedRateLimiter.Create<string, string>(key =>
        RateLimitPartition.GetSlidingWindowLimiter(key, _ => AuthRateLimits.Window(limits.EmailsPerAddressPerHour, TimeSpan.FromHours(1))));

    /// <summary>A sign-in attempt for this address. Null when allowed; otherwise how long to wait.</summary>
    public TimeSpan? SignIn(string? email) => Acquire(_signIns, email);

    /// <summary>An email about to be sent to this address (sign-up, resend, forgot). Null when allowed.</summary>
    public TimeSpan? Email(string? email) => Acquire(_emails, email);

    private static TimeSpan? Acquire(PartitionedRateLimiter<string> limiter, string? email)
    {
        using var lease = limiter.AttemptAcquire(PasswordLogin.Normalize(email ?? ""));
        if (lease.IsAcquired) return null;
        return lease.TryGetMetadata(MetadataName.RetryAfter, out var after) ? after : TimeSpan.FromMinutes(1);
    }

    public void Dispose() { _signIns.Dispose(); _emails.Dispose(); }
}
