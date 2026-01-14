using System.Text.Json;
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
    private readonly ILogger<ExchangerateHostClient> _logger;
    private const string PrimaryBaseUrl = "https://api.exchangerate.host";
    private const string FallbackBaseUrl = "https://open.er-api.com/v6/latest";

    public ExchangerateHostClient(HttpClient httpClient, ILogger<ExchangerateHostClient> logger)
    {
        _httpClient = httpClient;
        _logger = logger;
    }

    public async Task<FxRateResponse?> GetRatesAsync(string baseCurrency, CancellationToken ct = default)
    {
        var normalizedBase = baseCurrency.ToUpperInvariant();

        var primary = await TryGetFromPrimaryAsync(normalizedBase, ct);
        if (primary?.Rates != null && primary.Rates.Count > 0)
            return primary;

        _logger.LogWarning("Primary FX provider failed for {BaseCurrency}. Attempting fallback provider.", normalizedBase);

        var fallback = await TryGetFromFallbackAsync(normalizedBase, ct);
        if (fallback?.Rates != null && fallback.Rates.Count > 0)
            return fallback;

        _logger.LogError("All FX providers failed for base currency {BaseCurrency}", normalizedBase);
        return null;
    }

    private async Task<FxRateResponse?> TryGetFromPrimaryAsync(string baseCurrency, CancellationToken ct)
    {
        try
        {
            var url = $"{PrimaryBaseUrl}/latest?base={Uri.EscapeDataString(baseCurrency)}";
            var response = await _httpClient.GetAsync(url, ct);
            if (!response.IsSuccessStatusCode)
                return null;

            var json = await response.Content.ReadAsStringAsync(ct);
            return JsonSerializer.Deserialize<FxRateResponse>(json);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Primary FX provider threw an exception for base {BaseCurrency}", baseCurrency);
            return null;
        }
    }

    private async Task<FxRateResponse?> TryGetFromFallbackAsync(string baseCurrency, CancellationToken ct)
    {
        try
        {
            var url = $"{FallbackBaseUrl}/{Uri.EscapeDataString(baseCurrency)}";
            var response = await _httpClient.GetAsync(url, ct);
            if (!response.IsSuccessStatusCode)
                return null;

            var json = await response.Content.ReadAsStringAsync(ct);
            var fallback = JsonSerializer.Deserialize<ExchangeRateApiResponse>(json);
            if (fallback?.Rates == null)
                return null;

            return new FxRateResponse
            {
                Success = string.Equals(fallback.Result, "success", StringComparison.OrdinalIgnoreCase),
                Base = fallback.BaseCode,
                Date = fallback.TimeLastUpdateUtc,
                Rates = fallback.Rates
            };
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Fallback FX provider threw an exception for base {BaseCurrency}", baseCurrency);
            return null;
        }
    }

    private sealed class ExchangeRateApiResponse
    {
        [JsonPropertyName("result")]
        public string? Result { get; set; }

        [JsonPropertyName("base_code")]
        public string? BaseCode { get; set; }

        [JsonPropertyName("time_last_update_utc")]
        public string? TimeLastUpdateUtc { get; set; }

        [JsonPropertyName("rates")]
        public Dictionary<string, decimal>? Rates { get; set; }
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
