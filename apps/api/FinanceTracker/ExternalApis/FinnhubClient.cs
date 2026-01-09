namespace FinanceTracker.ExternalApis;

/// <summary>
/// HTTP client for Finnhub stock/ETF quotes
/// </summary>
public interface IFinnhubClient
{
    /// <summary>
    /// Get a quote for a ticker symbol (returns USD price)
    /// </summary>
    Task<FinnhubQuoteResponse?> GetQuoteAsync(string ticker, CancellationToken ct = default);
}

public class FinnhubClient : IFinnhubClient
{
    private readonly HttpClient _httpClient;
    private readonly string _apiKey;
    private const string BaseUrl = "https://finnhub.io/api/v1";

    public FinnhubClient(HttpClient httpClient, string apiKey)
    {
        _httpClient = httpClient;
        _apiKey = apiKey;
    }

    public async Task<FinnhubQuoteResponse?> GetQuoteAsync(string ticker, CancellationToken ct = default)
    {
        try
        {
            var url = $"{BaseUrl}/quote?symbol={Uri.EscapeDataString(ticker.ToUpperInvariant())}&token={Uri.EscapeDataString(_apiKey)}";
            var response = await _httpClient.GetAsync(url, ct);
            
            if (!response.IsSuccessStatusCode)
                return null;

            var json = await response.Content.ReadAsStringAsync(ct);
            return System.Text.Json.JsonSerializer.Deserialize<FinnhubQuoteResponse>(json);
        }
        catch
        {
            return null;
        }
    }
}

/// <summary>
/// Finnhub API response model
/// </summary>
public class FinnhubQuoteResponse
{
    /// <summary>
    /// Current price (c field in API response)
    /// </summary>
    [System.Text.Json.Serialization.JsonPropertyName("c")]
    public decimal? CurrentPrice { get; set; }

    /// <summary>
    /// Quote timestamp in unix seconds (t field in API response)
    /// </summary>
    [System.Text.Json.Serialization.JsonPropertyName("t")]
    public long? Timestamp { get; set; }
}
