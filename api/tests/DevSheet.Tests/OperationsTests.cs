using System.Net;
using DevSheet.Infrastructure.Persistence;
using DevSheet.Infrastructure.Security;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace DevSheet.Tests;

public class HealthTests(WebApplicationFactory<Program> factory) : IClassFixture<WebApplicationFactory<Program>>
{
    [Fact]
    public async Task Health_is_200_when_the_database_is_reachable()
    {
        using var conn = new SqliteConnection("DataSource=:memory:");
        conn.Open();
        var client = factory.WithWebHostBuilder(b => b
            .UseEnvironment("Testing")
            .ConfigureTestServices(s =>
            {
                s.RemoveAll<DbContextOptions<AppDbContext>>();
                s.AddDbContext<AppDbContext>(o => o.UseSqlite(conn));
            })).CreateClient();

        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/health")).StatusCode);
    }

    [Fact]
    public async Task Health_is_503_when_the_database_is_down()
    {
        // Nothing listens on port 1, so the connection fails at once.
        var client = factory.WithWebHostBuilder(b => b
            .UseEnvironment("Testing")
            .UseSetting("ConnectionStrings:Default", "Host=127.0.0.1;Port=1;Database=x;Username=x;Password=x;Timeout=2"))
            .CreateClient();

        Assert.Equal(HttpStatusCode.ServiceUnavailable, (await client.GetAsync("/health")).StatusCode);
    }
}

public class DataProtectionTests
{
    private static TokenProtector ProtectorUsing(string keysPath)
    {
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?> { ["DataProtection:KeysPath"] = keysPath })
            .Build();
        var provider = new ServiceCollection().AddDevSheetDataProtection(config).BuildServiceProvider();
        return new TokenProtector(provider.GetRequiredService<Microsoft.AspNetCore.DataProtection.IDataProtectionProvider>());
    }

    [Fact]
    public void Token_survives_a_restart_with_the_same_key_folder()
    {
        var keys = Directory.CreateTempSubdirectory("devsheet-keys-");
        try
        {
            var stored = ProtectorUsing(keys.FullName).Protect("gho_example");
            // A new service provider stands in for the restarted container.
            Assert.Equal("gho_example", ProtectorUsing(keys.FullName).Unprotect(stored));
            Assert.NotEmpty(keys.GetFiles("*.xml"));
        }
        finally
        {
            keys.Delete(recursive: true);
        }
    }
}
