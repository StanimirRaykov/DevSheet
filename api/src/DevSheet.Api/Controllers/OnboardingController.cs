using DevSheet.Domain.Entities;
using DevSheet.Infrastructure.Accounts;
using DevSheet.Infrastructure.Career;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DevSheet.Api.Controllers;

/// <summary>The welcome flow at /welcome. Sync and repository review reuse /api/me/sync and /api/me/projects.</summary>
[ApiController, Route("api/me/onboarding"), Authorize]
public class OnboardingController(OnboardingService onboarding) : ControllerBase
{
    private Guid Uid => Guid.Parse(User.FindFirst(ExternalAuth.UserIdClaim)!.Value);

    [HttpGet]
    public async Task<IActionResult> Get() => Ok(await onboarding.GetAsync(Uid, HttpContext.RequestAborted));

    /// <summary>Step 1: name and headline. 400 with {errors} when a field is not valid.</summary>
    [HttpPut("about")]
    public async Task<IActionResult> About(AboutInput input)
    {
        var result = await onboarding.SaveAboutAsync(Uid, input, HttpContext.RequestAborted);
        return result.Outcome == Outcome.Ok ? Ok(result.Value) : BadRequest(new { errors = result.Errors });
    }

    public record StepInput(OnboardingStep Step);

    [HttpPut("step")]
    public async Task<IActionResult> Step(StepInput input)
    {
        if (!Enum.IsDefined(input.Step)) return BadRequest(new { error = "Unknown step." });
        await onboarding.SetStepAsync(Uid, input.Step, HttpContext.RequestAborted);
        return NoContent();
    }

    /// <summary>Finish or skip the flow. After this, signing in goes straight to the dashboard.</summary>
    [HttpPost("complete")]
    public async Task<IActionResult> Complete() =>
        Ok(new { completedAt = await onboarding.CompleteAsync(Uid, HttpContext.RequestAborted) });
}
