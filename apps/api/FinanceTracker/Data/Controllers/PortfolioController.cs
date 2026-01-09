using FinanceTracker.Auth;
using FinanceTracker.Contracts.Common;
using FinanceTracker.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FinanceTracker.Api.Controllers;

/// <summary>
/// Portfolio ROI and performance metrics endpoint
/// </summary>
[ApiController]
[Route("portfolio")]
[Authorize]
public class PortfolioController : ControllerBase
{
    private readonly IPortfolioRoiService _portfolioRoiService;
    private readonly ICurrentUserContext _currentUser;
    private readonly ILogger<PortfolioController> _logger;

    public PortfolioController(
        IPortfolioRoiService portfolioRoiService,
        ICurrentUserContext currentUser,
        ILogger<PortfolioController> logger)
    {
        _portfolioRoiService = portfolioRoiService;
        _currentUser = currentUser;
        _logger = logger;
    }

    /// <summary>
    /// Calculate portfolio ROI and performance metrics for the authenticated user
    /// </summary>
    /// <param name="currency">Portfolio currency for pricing and ROI calculation (default: USD)</param>
    /// <returns>Portfolio ROI response with per-asset and total metrics</returns>
    [HttpGet("roi")]
    [Produces("application/json")]
    public async Task<IActionResult> GetPortfolioRoi(
        [FromQuery(Name = "currency")] string currency = "USD",
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(currency))
            currency = "USD";

        try
        {
            var userId = Guid.Parse(_currentUser.UserId);

            var roi = await _portfolioRoiService.CalculatePortfolioRoiAsync(userId, currency, ct);
            return Ok(roi);
        }
        catch (FormatException)
        {
            _logger.LogError("Invalid UserId format in JWT claims");
            return StatusCode(500, new { error = "Invalid user context" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error calculating portfolio ROI for user: {UserId}", _currentUser.UserId);
            return StatusCode(500, new { error = "Failed to calculate portfolio ROI" });
        }
    }
}
