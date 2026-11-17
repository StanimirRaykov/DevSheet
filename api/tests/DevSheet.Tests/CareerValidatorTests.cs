using DevSheet.Application.Career;

namespace DevSheet.Tests;

public class CareerValidatorTests
{
    private static readonly DateOnly Jan = new(2024, 1, 1), Mar = new(2024, 3, 1);

    // ---- experience ----
    [Fact]
    public void Valid_experience_has_no_errors() =>
        Assert.Empty(CareerValidator.Validate(new ExperienceInput("Acme", "Dev", Jan, Mar, "did things")));

    [Fact]
    public void Experience_with_no_end_date_is_valid_current_role() =>
        Assert.Empty(CareerValidator.Validate(new ExperienceInput("Acme", "Dev", Jan, null, null)));

    [Fact]
    public void Experience_requires_company_title_and_start_date()
    {
        var errors = CareerValidator.Validate(new ExperienceInput(" ", null, null, null, null));
        Assert.Contains("company", errors.Keys);
        Assert.Contains("title", errors.Keys);
        Assert.Contains("startDate", errors.Keys);
    }

    [Fact]
    public void Experience_end_before_start_is_rejected()
    {
        var errors = CareerValidator.Validate(new ExperienceInput("Acme", "Dev", Mar, Jan, null));
        Assert.Contains("endDate", errors.Keys);
    }

    [Fact]
    public void Experience_end_equal_to_start_is_allowed() =>
        Assert.Empty(CareerValidator.Validate(new ExperienceInput("Acme", "Dev", Jan, Jan, null)));

    [Fact]
    public void Experience_length_limits_are_enforced()
    {
        var errors = CareerValidator.Validate(new ExperienceInput(
            new string('c', CareerValidator.ShortMax + 1), "Dev", Jan, null, new string('d', CareerValidator.LongMax + 1)));
        Assert.Contains("company", errors.Keys);
        Assert.Contains("description", errors.Keys);
    }

    // ---- education ----
    [Fact]
    public void Education_requires_institution_but_dates_and_degree_are_optional()
    {
        Assert.Contains("institution", CareerValidator.Validate(new EducationInput("", "BSc", null, null)).Keys);
        Assert.Empty(CareerValidator.Validate(new EducationInput("TU Sofia", null, null, null)));
    }

    [Fact]
    public void Education_end_before_start_is_rejected() =>
        Assert.Contains("endDate", CareerValidator.Validate(new EducationInput("TU", "BSc", Mar, Jan)).Keys);

    // ---- profile ----
    [Theory]
    [InlineData("a@b.com", true)]
    [InlineData("", true)]
    [InlineData(null, true)]
    [InlineData("not-an-email", false)]
    [InlineData("a@", false)]
    [InlineData("Name <a@b.com>", false)]
    public void Profile_email_validation(string? email, bool valid)
    {
        var errors = CareerValidator.Validate(new ProfileInput("N", "H", "S", "L", email, false, false));
        Assert.Equal(valid, !errors.ContainsKey("email"));
    }

    [Fact]
    public void Profile_summary_length_limit_is_enforced() =>
        Assert.Contains("summary", CareerValidator.Validate(
            new ProfileInput("N", "H", new string('s', CareerValidator.LongMax + 1), "L", "", false, false)).Keys);
}
