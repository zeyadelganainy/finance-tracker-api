using System.Text.Json.Serialization;

namespace FinanceTracker.ExternalApis;

/// <summary>
/// HTTP client for exchangerate.host FX conversions (free, no API key required)
/// </summary>
public interface IFxRateClient
{
    /// <summary>
    /// Get exchange rates from a base currency to all other currencies
    /// </summary>
    Task<FxRateResponse?> GetRatesAsync(string baseCurrency, CancellationToken ct = default);
}

public class ExchangerateHostClient : IFxRateClient
{
    private readonly HttpClient _httpClient;
    private const string BaseUrl = "https://api.exchangerate.host";

    public ExchangerateHostClient(HttpClient httpClient)
    {
        _httpClient = httpClient;
    }

    public async Task<FxRateResponse?> GetRatesAsync(string baseCurrency, CancellationToken ct = default)
    {
        try
        {
            var url = $"{BaseUrl}/latest?base={Uri.EscapeDataString(baseCurrency.ToUpperInvariant())}";
            var response = await _httpClient.GetAsync(url, ct);

            if (!response.IsSuccessStatusCode)
                return null;

            var json = await response.Content.ReadAsStringAsync(ct);
            return System.Text.Json.JsonSerializer.Deserialize<FxRateResponse>(json);
        }
        catch
        {
            return null;
        }
    }
}

/// <summary>
/// exchangerate.host response model
/// </summary>
public class FxRateResponse
{
    [JsonPropertyName("success")]
    public bool? Success { get; set; }

    [JsonPropertyName("base")]
    public string? Base { get; set; }

    [JsonPropertyName("date")]
    public string? Date { get; set; }

    [JsonPropertyName("rates")]
    public Dictionary<string, decimal>? Rates { get; set; }
}
