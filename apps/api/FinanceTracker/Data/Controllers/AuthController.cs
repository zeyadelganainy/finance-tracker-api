using FinanceTracker.Auth;
using FinanceTracker.Contracts.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FinanceTracker.Api.Controllers;

/// <summary>
/// Authentication endpoints for user information
/// </summary>
[ApiController]
[Route("auth")]
public class AuthController : ControllerBase
{
    private readonly ICurrentUserContext _currentUser;

    public AuthController(ICurrentUserContext currentUser)
    {
        _currentUser = currentUser;
    }

    /// <summary>
    /// Get current authenticated user information from JWT claims
    /// </summary>
    [HttpGet("me")]
    [Authorize]
    public IActionResult GetMe()
    {
        // Extract additional claims if available
        var iatClaim = User.FindFirst("iat")?.Value;
        var expClaim = User.FindFirst("exp")?.Value;

        long? issuedAt = null;
        long? expiresAt = null;

        if (long.TryParse(iatClaim, out var iat))
        {
            issuedAt = iat;
        }

        if (long.TryParse(expClaim, out var exp))
        {
            expiresAt = exp;
        }

        var response = new AuthMeResponse(
            _currentUser.UserId,
            _currentUser.Email,
            issuedAt,
            expiresAt
        );

        return Ok(response);
    }
}
