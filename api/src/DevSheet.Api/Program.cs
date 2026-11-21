using System.Security.Claims;
using AspNet.Security.OAuth.GitHub;
using DevSheet.Domain.Entities;
using DevSheet.Application.Abstractions;
using DevSheet.Infrastructure;
using DevSheet.Api;
using DevSheet.Infrastructure.Accounts;
using DevSheet.Infrastructure.Persistence;
using DevSheet.Infrastructure.Security;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);
var webOrigin = builder.Configuration["WebOrigin"]!;
const string AvatarClaim = "urn:github:avatar";

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddInfrastructure(builder.Configuration);
builder.Services.AddDevSheetDataProtection(builder.Configuration);
// GET /health: 200 when the API can reach its database, 503 otherwise (used by the Docker health check).
builder.Services.AddHealthChecks().AddDbContextCheck<AppDbContext>("database");

builder.Services.AddCors(o => o.AddDefaultPolicy(p =>
    p.WithOrigins(webOrigin).AllowCredentials().AllowAnyHeader().AllowAnyMethod()));

builder.Services
    .AddAuthentication(o =>
    {
        o.DefaultScheme = CookieAuthenticationDefaults.AuthenticationScheme;
        // API calls without a valid cookie must get 401 (see the cookie's OnRedirectToLogin below), not a redirect to GitHub.
        // The login endpoint challenges GitHub explicitly (AuthController.Login).
        o.DefaultChallengeScheme = CookieAuthenticationDefaults.AuthenticationScheme;
    })
    .AddCookie(o =>
    {
        o.Cookie.Name = "devsheet.auth";
        o.Cookie.SameSite = SameSiteMode.Lax;
        // API endpoints should answer 401, not redirect to GitHub.
        o.Events.OnRedirectToLogin = ctx => { ctx.Response.StatusCode = 401; return Task.CompletedTask; };
    })
    .AddGitHub(o =>
    {
        // Falls back to a placeholder so the app boots before you register the OAuth app.
        o.ClientId = builder.Configuration["Authentication:GitHub:ClientId"] is { Length: > 0 } id ? id : "unset";
        o.ClientSecret = builder.Configuration["Authentication:GitHub:ClientSecret"] is { Length: > 0 } s ? s : "unset";
        o.Scope.Add("read:user"); // public data only; no private-repo access
        o.SaveTokens = false;     // we store the token ourselves, encrypted
        o.ClaimActions.MapJsonKey(AvatarClaim, "avatar_url");
        o.Events.OnCreatingTicket = ctx =>
        {
            var githubId = long.Parse(ctx.Principal!.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var login = ctx.Principal.FindFirstValue(ClaimTypes.Name) ?? $"user{githubId}";
            var name = ctx.Principal.FindFirstValue(GitHubAuthenticationConstants.Claims.Name);
            return ExternalAuth.CompleteAsync(ctx,
                new ExternalIdentity(LoginProviders.GitHub, githubId.ToString(),
                    DisplayName: string.IsNullOrWhiteSpace(name) ? login : name,
                    Email: ctx.Principal.FindFirstValue(ClaimTypes.Email),
                    AvatarUrl: ctx.Principal.FindFirstValue(AvatarClaim)),
                new GithubGrant(githubId, login, ctx.AccessToken!));
        };
        o.Events.OnRemoteFailure = ctx => ExternalAuth.OnRemoteFailure(ctx, webOrigin);
    });
builder.Services.AddAuthorization();

var app = builder.Build();

// `DevSheet.Api --migrate` applies migrations and seeds, then exits. This is the explicit
// database step for production (and for the Docker setup); the server itself never migrates there.
if (args.Contains("--migrate"))
{
    await MigrateDatabaseAsync(app);
    return;
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
    // Local convenience: keep the database up to date on every start.
    await MigrateDatabaseAsync(app);
}

app.UseCors();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapHealthChecks("/health");
app.Run();

static async Task MigrateDatabaseAsync(WebApplication app)
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await DatabaseMigrator.MigrateAsync(db, app.Logger, seedDemo: app.Configuration.GetValue("Demo:Seed", true));
}

// Needed so integration tests can start the app with WebApplicationFactory<Program>.
public partial class Program { }
