using DevSheet.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace DevSheet.Infrastructure.Persistence;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<Profile> Profiles => Set<Profile>();
    public DbSet<GithubRepo> GithubRepos => Set<GithubRepo>();
    public DbSet<Project> Projects => Set<Project>();
    public DbSet<Skill> Skills => Set<Skill>();
    public DbSet<ProjectSkill> ProjectSkills => Set<ProjectSkill>();
    public DbSet<SkillAlias> SkillAliases => Set<SkillAlias>();
    public DbSet<WorkExperience> WorkExperiences => Set<WorkExperience>();
    public DbSet<Education> Educations => Set<Education>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        b.Entity<User>(e =>
        {
            e.HasIndex(x => x.GithubId).IsUnique();
            e.HasIndex(x => x.Slug).IsUnique();
            e.HasOne(x => x.Profile).WithOne().HasForeignKey<Profile>(p => p.UserId);
            e.HasMany(x => x.Repos).WithOne().HasForeignKey(r => r.UserId);
            e.HasMany(x => x.Projects).WithOne().HasForeignKey(p => p.UserId);
            e.HasMany(x => x.WorkExperiences).WithOne().HasForeignKey(w => w.UserId);
            e.HasMany(x => x.Educations).WithOne().HasForeignKey(ed => ed.UserId);
        });
        b.Entity<GithubRepo>().HasIndex(r => new { r.UserId, r.GithubRepoId }).IsUnique();
        b.Entity<ProjectSkill>().HasKey(ps => new { ps.ProjectId, ps.SkillId });
        b.Entity<Project>().HasMany(p => p.Skills).WithOne(ps => ps.Project).HasForeignKey(ps => ps.ProjectId);
        b.Entity<Skill>().HasIndex(s => s.Name).IsUnique();
        b.Entity<SkillAlias>().HasIndex(a => a.Alias).IsUnique();
        b.Entity<SkillAlias>().HasOne(a => a.Skill).WithMany().HasForeignKey(a => a.SkillId);
    }
}
