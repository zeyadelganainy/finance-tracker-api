namespace FinanceTracker.Auth;

/// <summary>
/// Configuration for Supabase JWT authentication
/// </summary>
public class AuthConfiguration
{
    public const string SectionName = "Auth";

    /// <summary>
    /// Supabase project URL (e.g., https://your-project.supabase.co)
    /// </summary>
    public string SupabaseUrl { get; set; } = string.Empty;

    /// <summary>
    /// Supabase JWT issuer/authority (e.g., https://your-project.supabase.co/auth/v1)
    /// </summary>
    public string Issuer { get; set; } = string.Empty;

    /// <summary>
    /// Supabase JWT audience (typically "authenticated")
    /// </summary>
    public string Audience { get; set; } = string.Empty;

    /// <summary>
    /// Demo user ID for seeded data ownership
    /// </summary>
    public string? DemoUserId { get; set; }
}
