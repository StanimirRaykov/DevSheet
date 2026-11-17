using DevSheet.Application.Career;
using DevSheet.Infrastructure.Career;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DevSheet.Api.Controllers;

[ApiController, Route("api/me"), Authorize]
public class CareerController(CareerService career) : ControllerBase
{
    private Guid Uid => Guid.Parse(User.FindFirst("devsheet:uid")!.Value);

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
}
