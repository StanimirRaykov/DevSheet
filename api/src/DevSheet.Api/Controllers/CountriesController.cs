using DevSheet.Application.Career;
using Microsoft.AspNetCore.Mvc;

namespace DevSheet.Api.Controllers;

/// <summary>The country list for the profile form: code, name and calling code. Static data, no login needed.</summary>
[ApiController, Route("api/countries")]
public class CountriesController : ControllerBase
{
    [HttpGet, ResponseCache(Duration = 86400)]
    public IActionResult List() => Ok(Countries.All);
}
