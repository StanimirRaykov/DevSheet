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
const string GooglePictureClaim = "urn:google:picture";

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddInfrastructure(builder.Configuration);
builder.Services.AddTestingServices(builder.Environment, builder.Configuration); // Testing environment only
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
        o.ClientId = Credential("GitHub", "ClientId");
        o.ClientSecret = Credential("GitHub", "ClientSecret");
        o.SignInScheme = CookieAuthenticationDefaults.AuthenticationScheme;
        o.Scope.Add("read:user"); // public data only; no private-repo access
        o.SaveTokens = false;     // we store the token ourselves, encrypted
        o.ClaimActions.MapJsonKey(AvatarClaim, "avatar_url");
        o.Events.OnCreatingTicket = ctx =>
        {
            var github = ctx.Principal!;
            var githubId = long.Parse(github.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var login = github.FindFirstValue(ClaimTypes.Name) ?? $"user{githubId}";
            var name = github.FindFirstValue(GitHubAuthenticationConstants.Claims.Name);
            return ExternalAuth.CompleteAsync(ctx,
                new ExternalIdentity(LoginProviders.GitHub, githubId.ToString(),
                    DisplayName: string.IsNullOrWhiteSpace(name) ? login : name,
                    Email: github.FindFirstValue(ClaimTypes.Email),
                    AvatarUrl: github.FindFirstValue(AvatarClaim)),
                new GithubGrant(githubId, login, ctx.AccessToken!));
        };
        o.Events.OnRemoteFailure = ctx => ExternalAuth.OnRemoteFailure(ctx, webOrigin);
    })
    .AddGoogle(o =>
    {
        o.ClientId = Credential("Google", "ClientId");
        o.ClientSecret = Credential("Google", "ClientSecret");
        o.SignInScheme = CookieAuthenticationDefaults.AuthenticationScheme;
        // The default scopes (openid, profile, email) are all we ask for.
        o.SaveTokens = false;
        o.ClaimActions.MapJsonKey(GooglePictureClaim, "picture");
        o.Events.OnCreatingTicket = ctx =>
        {
            var google = ctx.Principal!;
            var email = google.FindFirstValue(ClaimTypes.Email);
            var name = google.FindFirstValue(ClaimTypes.Name);
            return ExternalAuth.CompleteAsync(ctx,
                new ExternalIdentity(LoginProviders.Google, google.FindFirstValue(ClaimTypes.NameIdentifier)!,
                    DisplayName: !string.IsNullOrWhiteSpace(name) ? name : email?.Split('@')[0] ?? "developer",
                    Email: email,
                    AvatarUrl: google.FindFirstValue(GooglePictureClaim)),
                github: null);
        };
        o.Events.OnRemoteFailure = ctx => ExternalAuth.OnRemoteFailure(ctx, webOrigin);
    });
builder.Services.AddAuthorization();

// OAuth credentials fall back to a placeholder so the API boots before a provider is registered.
// GET /auth/providers leaves such a provider out, so the login page never shows a button that cannot work.
// Trimmed: copying from a provider's console can bring invisible characters along (a trailing U+2028 made
// Google answer "OAuth client was not found").
string Credential(string provider, string key) =>
    builder.Configuration[$"Authentication:{provider}:{key}"]?.Trim() is { Length: > 0 } value ? value : "unset";

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
app.MapTestingEndpoints(); // Testing environment only
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
