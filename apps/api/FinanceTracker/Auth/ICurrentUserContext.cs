namespace FinanceTracker.Auth;

/// <summary>
/// Provides access to the current authenticated user's information
/// </summary>
public interface ICurrentUserContext
{
    /// <summary>
    /// The current user's ID from the JWT sub claim (Supabase auth.uid())
    /// </summary>
    string UserId { get; }

    /// <summary>
    /// Whether the current request is authenticated
    /// </summary>
    bool IsAuthenticated { get; }

    /// <summary>
    /// The current user's email from the JWT email claim
    /// </summary>
    string? Email { get; }
}
