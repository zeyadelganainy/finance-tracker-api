namespace FinanceTracker.ExternalApis;

/// <summary>
/// HTTP client for Gold-API gold prices
/// </summary>
public interface IGoldApiClient
{
    /// <summary>
    /// Get current gold price in USD per troy ounce
    /// </summary>
    Task<GoldApiResponse?> GetGoldPriceAsync(CancellationToken ct = default);
}

public class GoldApiClient : IGoldApiClient
{
    private readonly HttpClient _httpClient;
    private const string BaseUrl = "https://api.gold-api.com/price/XAU";

    public GoldApiClient(HttpClient httpClient)
    {
        _httpClient = httpClient;
    }

    public async Task<GoldApiResponse?> GetGoldPriceAsync(CancellationToken ct = default)
    {
        try
        {
            var response = await _httpClient.GetAsync(BaseUrl, ct);
            
            if (!response.IsSuccessStatusCode)
                return null;

            var json = await response.Content.ReadAsStringAsync(ct);
            return System.Text.Json.JsonSerializer.Deserialize<GoldApiResponse>(json);
        }
        catch
        {
            return null;
        }
    }
}

/// <summary>
/// Gold-API response model
/// Returns gold price in USD per troy ounce
/// </summary>
public class GoldApiResponse
{
    /// <summary>
    /// Price in USD per troy ounce
    /// </summary>
    [System.Text.Json.Serialization.JsonPropertyName("price")]
    public decimal? Price { get; set; }

    /// <summary>
    /// Currency code (always "USD" from Gold-API)
    /// </summary>
    [System.Text.Json.Serialization.JsonPropertyName("currency")]
    public string? Currency { get; set; }

    /// <summary>
    /// Timestamp when price was last updated (ISO 8601 format)
    /// </summary>
    [System.Text.Json.Serialization.JsonPropertyName("timestamp")]
    public string? Timestamp { get; set; }
}
