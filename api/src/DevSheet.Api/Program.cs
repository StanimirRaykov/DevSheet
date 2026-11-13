using System.Security.Claims;
using AspNet.Security.OAuth.GitHub;
using DevSheet.Domain.Entities;
using DevSheet.Application.Abstractions;
using DevSheet.Infrastructure;
using DevSheet.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);
var webOrigin = builder.Configuration["WebOrigin"]!;

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddDataProtection();
builder.Services.AddInfrastructure(builder.Configuration);

builder.Services.AddCors(o => o.AddDefaultPolicy(p =>
    p.WithOrigins(webOrigin).AllowCredentials().AllowAnyHeader().AllowAnyMethod()));

builder.Services
    .AddAuthentication(o =>
    {
        o.DefaultScheme = CookieAuthenticationDefaults.AuthenticationScheme;
        o.DefaultChallengeScheme = GitHubAuthenticationDefaults.AuthenticationScheme;
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
        o.Events.OnCreatingTicket = async ctx =>
        {
            var db = ctx.HttpContext.RequestServices.GetRequiredService<AppDbContext>();
            var protector = ctx.HttpContext.RequestServices.GetRequiredService<ITokenProtector>();
            var githubId = long.Parse(ctx.Principal!.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var login = ctx.Principal.FindFirstValue(ClaimTypes.Name) ?? $"user{githubId}";

            var user = await db.Users.FirstOrDefaultAsync(u => u.GithubId == githubId);
            if (user is null)
            {
                user = new User { GithubId = githubId, GithubLogin = login, Slug = login.ToLowerInvariant() };
                db.Users.Add(user);
            }
            user.GithubLogin = login;
            user.EncryptedGithubToken = protector.Protect(ctx.AccessToken!);
            await db.SaveChangesAsync();

            // Identity key in the cookie is OUR user id.
            ((ClaimsIdentity)ctx.Principal.Identity!).AddClaim(new Claim("devsheet:uid", user.Id.ToString()));
        };
    });
builder.Services.AddAuthorization();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
    // Demo shortcut: create tables directly. Switch to EF migrations before real deployment.
    using var scope = app.Services.CreateScope();
    scope.ServiceProvider.GetRequiredService<AppDbContext>().Database.EnsureCreated();
}

app.UseCors();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.Run();
