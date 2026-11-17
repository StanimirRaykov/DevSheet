using DevSheet.Domain.Entities;

namespace DevSheet.Infrastructure.Career;

/// <summary>One ordering rule shared by the owner API and the public page.</summary>
public static class CareerQueries
{
    /// <summary>Current roles (no end date) first, then by start date, newest first.</summary>
    public static IOrderedQueryable<WorkExperience> NewestFirst(this IQueryable<WorkExperience> q) =>
        q.OrderBy(w => w.EndDate == null ? 0 : 1).ThenByDescending(w => w.StartDate);

    /// <summary>Ongoing studies first, then by end date, newest first.</summary>
    public static IOrderedQueryable<Education> NewestFirst(this IQueryable<Education> q) =>
        q.OrderBy(e => e.EndDate == null ? 0 : 1).ThenByDescending(e => e.EndDate).ThenByDescending(e => e.StartDate);
}
