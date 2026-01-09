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
    private readonly ILogger<GoldApiClient> _logger;
    private const string BaseUrl = "https://api.gold-api.com/price/XAU";

    public GoldApiClient(HttpClient httpClient, ILogger<GoldApiClient> logger)
    {
        _httpClient = httpClient;
        _logger = logger;
    }

    public async Task<GoldApiResponse?> GetGoldPriceAsync(CancellationToken ct = default)
    {
        try
        {
            _logger.LogInformation("Fetching gold price from {Url}", BaseUrl);
            
            var response = await _httpClient.GetAsync(BaseUrl, ct);
            
            _logger.LogInformation("Gold-API response: {StatusCode}", response.StatusCode);
            
            if (!response.IsSuccessStatusCode)
            {
                var errorBody = await response.Content.ReadAsStringAsync(ct);
                _logger.LogWarning("Gold-API returned {StatusCode}: {Body}", response.StatusCode, errorBody);
                return null;
            }

            var json = await response.Content.ReadAsStringAsync(ct);
            _logger.LogInformation("Gold-API response body: {Json}", json);
            
            var result = System.Text.Json.JsonSerializer.Deserialize<GoldApiResponse>(json);
            _logger.LogInformation("Parsed gold price: {Price} USD", result?.Price);
            
            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Exception calling Gold-API");
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
    /// Metal name (e.g., "Gold")
    /// </summary>
    [System.Text.Json.Serialization.JsonPropertyName("name")]
    public string? Name { get; set; }

    /// <summary>
    /// Price in USD per troy ounce
    /// </summary>
    [System.Text.Json.Serialization.JsonPropertyName("price")]
    public decimal? Price { get; set; }

    /// <summary>
    /// Metal symbol (e.g., "XAU")
    /// </summary>
    [System.Text.Json.Serialization.JsonPropertyName("symbol")]
    public string? Symbol { get; set; }

    /// <summary>
    /// Timestamp when price was last updated (ISO 8601 format)
    /// </summary>
    [System.Text.Json.Serialization.JsonPropertyName("updatedAt")]
    public string? UpdatedAt { get; set; }

    /// <summary>
    /// Human-readable timestamp
    /// </summary>
    [System.Text.Json.Serialization.JsonPropertyName("updatedAtReadable")]
    public string? UpdatedAtReadable { get; set; }
}
