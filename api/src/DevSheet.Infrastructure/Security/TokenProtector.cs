using DevSheet.Application.Abstractions;
using Microsoft.AspNetCore.DataProtection;

namespace DevSheet.Infrastructure.Security;

public class TokenProtector(IDataProtectionProvider provider) : ITokenProtector
{
    private readonly IDataProtector _protector = provider.CreateProtector("DevSheet.GithubToken.v1");
    public string Protect(string plain) => _protector.Protect(plain);
    public string Unprotect(string protectedValue) => _protector.Unprotect(protectedValue);
}
