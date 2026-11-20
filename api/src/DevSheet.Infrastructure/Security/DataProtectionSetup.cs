using Microsoft.AspNetCore.DataProtection;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace DevSheet.Infrastructure.Security;

public static class DataProtectionSetup
{
    /// <summary>
    /// Data Protection encrypts the login cookie and the stored GitHub tokens. Its keys must outlive the process:
    /// if they are lost (a container restart), everyone is logged out and every stored token becomes unreadable.
    /// Set <c>DataProtection:KeysPath</c> to a persistent folder (a Docker volume); without it the framework
    /// default is used (the user profile, fine for running on your own machine).
    /// The fixed application name keeps keys valid when the app moves to another folder or image.
    /// </summary>
    public static IServiceCollection AddDevSheetDataProtection(this IServiceCollection services, IConfiguration config)
    {
        var builder = services.AddDataProtection().SetApplicationName("DevSheet");
        if (config["DataProtection:KeysPath"] is { Length: > 0 } path)
            builder.PersistKeysToFileSystem(new DirectoryInfo(path));
        return services;
    }
}
