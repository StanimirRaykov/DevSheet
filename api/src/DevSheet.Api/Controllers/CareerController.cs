using DevSheet.Application.Career;
using DevSheet.Infrastructure.Career;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DevSheet.Api.Controllers;

[ApiController, Route("api/me"), Authorize]
public class CareerController(CareerService career) : ControllerBase
{
    private Guid Uid => Guid.Parse(User.FindFirst(ExternalAuth.UserIdClaim)!.Value);

    private IActionResult Map<T>(Result<T> r) => r.Outcome switch
    {
        Outcome.Ok => Ok(r.Value),
        Outcome.NotFound => NotFound(),
        _ => BadRequest(new { errors = r.Errors }),
    };

    [HttpGet("profile")]
    public async Task<IActionResult> GetProfile() => Ok(await career.GetProfileAsync(Uid));

    [HttpPut("profile")]
    public async Task<IActionResult> PutProfile(ProfileInput input) => Map(await career.UpsertProfileAsync(Uid, input));

    [HttpGet("experience")]
    public async Task<IActionResult> ListExperience() => Ok(await career.ListExperienceAsync(Uid));

    [HttpPost("experience")]
    public async Task<IActionResult> CreateExperience(ExperienceInput input) => Map(await career.CreateExperienceAsync(Uid, input));

    [HttpPut("experience/{id:guid}")]
    public async Task<IActionResult> UpdateExperience(Guid id, ExperienceInput input) => Map(await career.UpdateExperienceAsync(Uid, id, input));

    [HttpDelete("experience/{id:guid}")]
    public async Task<IActionResult> DeleteExperience(Guid id) => await career.DeleteExperienceAsync(Uid, id) ? NoContent() : NotFound();

    [HttpGet("education")]
    public async Task<IActionResult> ListEducation() => Ok(await career.ListEducationAsync(Uid));

    [HttpPost("education")]
    public async Task<IActionResult> CreateEducation(EducationInput input) => Map(await career.CreateEducationAsync(Uid, input));

    [HttpPut("education/{id:guid}")]
    public async Task<IActionResult> UpdateEducation(Guid id, EducationInput input) => Map(await career.UpdateEducationAsync(Uid, id, input));

    [HttpDelete("education/{id:guid}")]
    public async Task<IActionResult> DeleteEducation(Guid id) => await career.DeleteEducationAsync(Uid, id) ? NoContent() : NotFound();

    [HttpGet("languages")]
    public async Task<IActionResult> ListLanguages() => Ok(await career.ListLanguagesAsync(Uid));

    [HttpPost("languages")]
    public async Task<IActionResult> CreateLanguage(LanguageInput input) => Map(await career.CreateLanguageAsync(Uid, input));

    [HttpPut("languages/{id:guid}")]
    public async Task<IActionResult> UpdateLanguage(Guid id, LanguageInput input) => Map(await career.UpdateLanguageAsync(Uid, id, input));

    [HttpDelete("languages/{id:guid}")]
    public async Task<IActionResult> DeleteLanguage(Guid id) => await career.DeleteLanguageAsync(Uid, id) ? NoContent() : NotFound();

    [HttpGet("certifications")]
    public async Task<IActionResult> ListCertifications() => Ok(await career.ListCertificationsAsync(Uid));

    [HttpPost("certifications")]
    public async Task<IActionResult> CreateCertification(CertificationInput input) => Map(await career.CreateCertificationAsync(Uid, input));

    [HttpPut("certifications/{id:guid}")]
    public async Task<IActionResult> UpdateCertification(Guid id, CertificationInput input) => Map(await career.UpdateCertificationAsync(Uid, id, input));

    [HttpDelete("certifications/{id:guid}")]
    public async Task<IActionResult> DeleteCertification(Guid id) => await career.DeleteCertificationAsync(Uid, id) ? NoContent() : NotFound();
}
