using System.Security.Claims;

namespace FinanceTracker.Auth;

/// <summary>
/// Implementation of ICurrentUserContext that reads from HttpContext.User
/// </summary>
public class CurrentUserContext : ICurrentUserContext
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public CurrentUserContext(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    public bool IsAuthenticated => 
        _httpContextAccessor.HttpContext?.User?.Identity?.IsAuthenticated ?? false;

    public string UserId
    {
        get
        {
            if (!IsAuthenticated)
            {
                throw new UnauthorizedAccessException("User is not authenticated");
            }

            // JWT 'sub' claim contains the Supabase user ID (auth.uid())
            var userId = _httpContextAccessor.HttpContext?.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value
                      ?? _httpContextAccessor.HttpContext?.User?.FindFirst("sub")?.Value;

            if (string.IsNullOrEmpty(userId))
            {
                throw new UnauthorizedAccessException("User ID claim not found in token");
            }

            return userId;
        }
    }

    public string? Email => 
        _httpContextAccessor.HttpContext?.User?.FindFirst(ClaimTypes.Email)?.Value
        ?? _httpContextAccessor.HttpContext?.User?.FindFirst("email")?.Value;
}
