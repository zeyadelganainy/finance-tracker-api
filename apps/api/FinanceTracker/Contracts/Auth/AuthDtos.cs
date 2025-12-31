namespace FinanceTracker.Contracts.Auth;

/// <summary>
/// Response for the /auth/me endpoint
/// </summary>
public record AuthMeResponse(
    string UserId,
    string? Email,
    long? IssuedAt,
    long? ExpiresAt
);
