using DevSheet.Application.Abstractions;
using Octokit;

namespace DevSheet.Infrastructure.GitHub;

public class OctokitRepoSource : IGitHubRepoSource
{
    public async Task<IReadOnlyList<RemoteRepo>> GetPublicReposAsync(string login, string token, int max, CancellationToken ct = default)
    {
        var client = new GitHubClient(new ProductHeaderValue("DevSheet")) { Credentials = new Credentials(token) };
        var repos = (await client.Repository.GetAllForUser(login))
            .Where(r => !r.Private)
            .OrderByDescending(r => r.PushedAt)
            .Take(max)
            .ToList();

        var result = new List<RemoteRepo>();
        foreach (var r in repos)
        {
            var langs = await client.Repository.GetAllLanguages(r.Owner.Login, r.Name);
            result.Add(new RemoteRepo(
                r.Id, r.Name, r.Description, r.HtmlUrl, r.StargazersCount, r.Fork,
                r.PushedAt?.UtcDateTime, langs.ToDictionary(l => l.Name, l => l.NumberOfBytes)));
        }
        return result;
    }
}
