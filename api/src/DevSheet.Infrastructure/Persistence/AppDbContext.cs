using DevSheet.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace DevSheet.Infrastructure.Persistence;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<ExternalLogin> ExternalLogins => Set<ExternalLogin>();
    public DbSet<PasswordLogin> PasswordLogins => Set<PasswordLogin>();
    public DbSet<AccountToken> AccountTokens => Set<AccountToken>();
    public DbSet<GithubConnection> GithubConnections => Set<GithubConnection>();
    public DbSet<Profile> Profiles => Set<Profile>();
    public DbSet<GithubRepo> GithubRepos => Set<GithubRepo>();
    public DbSet<Project> Projects => Set<Project>();
    public DbSet<Skill> Skills => Set<Skill>();
    public DbSet<ProjectSkill> ProjectSkills => Set<ProjectSkill>();
    public DbSet<SkillAlias> SkillAliases => Set<SkillAlias>();
    public DbSet<WorkExperience> WorkExperiences => Set<WorkExperience>();
    public DbSet<Education> Educations => Set<Education>();
    public DbSet<Language> Languages => Set<Language>();
    public DbSet<Certification> Certifications => Set<Certification>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        b.Entity<User>(e =>
        {
            e.HasIndex(x => x.Slug).IsUnique();
            e.Property(x => x.SecurityStamp).HasMaxLength(64);
            e.HasOne(x => x.PasswordLogin).WithOne().HasForeignKey<PasswordLogin>(p => p.UserId).OnDelete(DeleteBehavior.Cascade);
            e.HasMany(x => x.Logins).WithOne(l => l.User).HasForeignKey(l => l.UserId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.GithubConnection).WithOne().HasForeignKey<GithubConnection>(c => c.UserId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Profile).WithOne().HasForeignKey<Profile>(p => p.UserId);
            e.HasMany(x => x.Repos).WithOne().HasForeignKey(r => r.UserId);
            e.HasMany(x => x.Projects).WithOne().HasForeignKey(p => p.UserId);
            e.HasMany(x => x.WorkExperiences).WithOne().HasForeignKey(w => w.UserId);
            e.HasMany(x => x.Educations).WithOne().HasForeignKey(ed => ed.UserId);
            e.HasMany(x => x.Languages).WithOne().HasForeignKey(l => l.UserId);
            e.HasMany(x => x.Certifications).WithOne().HasForeignKey(c => c.UserId);
        });
        b.Entity<ExternalLogin>(e =>
        {
            e.Property(x => x.Provider).HasMaxLength(20);
            e.HasIndex(x => new { x.Provider, x.ProviderKey }).IsUnique();
        });
        b.Entity<PasswordLogin>(e =>
        {
            e.HasKey(x => x.UserId);
            e.Property(x => x.Email).HasMaxLength(254);
            e.Property(x => x.NormalizedEmail).HasMaxLength(254);
            e.HasIndex(x => x.NormalizedEmail).IsUnique();
        });
        b.Entity<AccountToken>(e =>
        {
            e.Property(x => x.Purpose).HasConversion<string>().HasMaxLength(20);
            e.Property(x => x.TokenHash).HasMaxLength(64);
            e.HasIndex(x => x.TokenHash).IsUnique();
            e.HasIndex(x => new { x.UserId, x.Purpose });
            e.HasOne<User>().WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
        });
        b.Entity<GithubConnection>(e =>
        {
            e.HasKey(x => x.UserId);
            e.HasIndex(x => x.GithubId).IsUnique();
        });
        b.Entity<GithubRepo>().HasIndex(r => new { r.UserId, r.GithubRepoId }).IsUnique();
        b.Entity<ProjectSkill>().HasKey(ps => new { ps.ProjectId, ps.SkillId });
        b.Entity<Project>().HasMany(p => p.Skills).WithOne(ps => ps.Project).HasForeignKey(ps => ps.ProjectId);
        b.Entity<Skill>().HasIndex(s => s.Name).IsUnique();
        b.Entity<SkillAlias>().HasIndex(a => a.Alias).IsUnique();
        b.Entity<SkillAlias>().HasOne(a => a.Skill).WithMany().HasForeignKey(a => a.SkillId);
    }
}
