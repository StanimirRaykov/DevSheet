using DevSheet.Application.Abstractions;
using DevSheet.Infrastructure.GitHub;
using DevSheet.Infrastructure.Persistence;
using DevSheet.Infrastructure.Security;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace DevSheet.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration config)
    {
        services.AddDbContext<AppDbContext>(o => o.UseNpgsql(config.GetConnectionString("Default")));
        services.AddScoped<ITokenProtector, TokenProtector>();
        services.AddSingleton(TimeProvider.System);
        services.AddScoped<IGitHubRepoSource, OctokitRepoSource>();
        services.AddScoped<IGitHubSyncService, GitHubSyncService>();
        services.AddScoped<DevSheet.Infrastructure.Skills.ProjectSkillService>();
        services.AddScoped<DevSheet.Infrastructure.Career.CareerService>();
        services.AddScoped<DevSheet.Infrastructure.Cv.CvDataService>();
        services.AddScoped<DevSheet.Infrastructure.Accounts.AccountService>();
        return services;
    }
}
