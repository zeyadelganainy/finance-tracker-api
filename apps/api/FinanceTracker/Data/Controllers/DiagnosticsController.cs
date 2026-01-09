using FinanceTracker.ExternalApis;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Diagnostics;

namespace FinanceTracker.Api.Controllers;

/// <summary>
/// Diagnostics endpoints to verify external market data providers
/// </summary>
[ApiController]
[Route("diagnostics")]
public class DiagnosticsController : ControllerBase
{
    private readonly IFinnhubClient _finnhub;
    private readonly IGoldApiClient _goldApi;
    private readonly IFxRateClient _fxClient;
    private readonly ILogger<DiagnosticsController> _logger;
    private readonly IWebHostEnvironment _env;

    public DiagnosticsController(
        IFinnhubClient finnhub,
        IGoldApiClient goldApi,
        IFxRateClient fxClient,
        ILogger<DiagnosticsController> logger,
        IWebHostEnvironment env)
    {
        _finnhub = finnhub;
        _goldApi = goldApi;
        _fxClient = fxClient;
        _logger = logger;
        _env = env;
    }

    /// <summary>
    /// Check Finnhub, Gold API, and FX provider connectivity (requires auth)
    /// </summary>
    [HttpGet("market")]
    [Authorize]
    [Produces("application/json")]
    public async Task<IActionResult> Market(CancellationToken ct = default)
    {
        return Ok(await PerformHealthChecks(ct));
    }

    /// <summary>
    /// Check providers without auth (Development only)
    /// </summary>
    [HttpGet("health/providers")]
    [Produces("application/json")]
    public async Task<IActionResult> HealthProviders(CancellationToken ct = default)
    {
        if (!_env.IsDevelopment())
        {
            return NotFound(new { error = "This endpoint is only available in Development" });
        }

        return Ok(await PerformHealthChecks(ct));
    }

    /// <summary>
    /// Test raw Gold-API call (Development only)
    /// </summary>
    [HttpGet("gold/raw")]
    [Produces("application/json")]
    public async Task<IActionResult> GoldRaw(CancellationToken ct = default)
    {
        if (!_env.IsDevelopment())
        {
            return NotFound(new { error = "This endpoint is only available in Development" });
        }

        try
        {
            var httpClient = new HttpClient();
            httpClient.Timeout = TimeSpan.FromSeconds(10);
            
            var response = await httpClient.GetAsync("https://api.gold-api.com/price/XAU", ct);
            var statusCode = (int)response.StatusCode;
            var body = await response.Content.ReadAsStringAsync(ct);
            var bodySnippet = body.Length > 200 ? body.Substring(0, 200) + "..." : body;

            decimal? parsedPrice = null;
            string? parseError = null;

            try
            {
                var goldResponse = System.Text.Json.JsonSerializer.Deserialize<GoldApiResponse>(body);
                parsedPrice = goldResponse?.Price;
            }
            catch (Exception ex)
            {
                parseError = ex.Message;
            }

            return Ok(new
            {
                ok = response.IsSuccessStatusCode && parsedPrice.HasValue,
                statusCode,
                parsedUsdPerOz = parsedPrice,
                bodySnippet,
                parseError
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Gold raw API test failed");
            return Ok(new
            {
                ok = false,
                error = ex.Message
            });
        }
    }

    private async Task<object> PerformHealthChecks(CancellationToken ct)
    {
        var results = new
        {
            timestamp = DateTime.UtcNow,
            environment = _env.EnvironmentName,
            finnhub = await CheckFinnhub(ct),
            goldApi = await CheckGoldApi(ct),
            fx = await CheckFx(ct)
        };

        return results;
    }

    private async Task<object> CheckFinnhub(CancellationToken ct)
    {
        var sw = Stopwatch.StartNew();
        try
        {
            var quote = await _finnhub.GetQuoteAsync("AAPL", ct);
            sw.Stop();
            
            var hasPrice = quote?.CurrentPrice.HasValue == true;
            if (hasPrice)
            {
                return new
                {
                    ok = true,
                    latencyMs = sw.ElapsedMilliseconds,
                    message = "Successfully fetched AAPL quote",
                    samplePrice = quote!.CurrentPrice!.Value
                };
            }
            else
            {
                return new
                {
                    ok = false,
                    latencyMs = sw.ElapsedMilliseconds,
                    message = "Response received but no price data (check API key validity)"
                };
            }
        }
        catch (Exception ex)
        {
            sw.Stop();
            _logger.LogError(ex, "Finnhub health check failed");
            return new
            {
                ok = false,
                latencyMs = sw.ElapsedMilliseconds,
                message = $"Error: {ex.Message}",
                hint = "Ensure FINNHUB_API_KEY is set and valid"
            };
        }
    }

    private async Task<object> CheckGoldApi(CancellationToken ct)
    {
        var sw = Stopwatch.StartNew();
        try
        {
            var gold = await _goldApi.GetGoldPriceAsync(ct);
            sw.Stop();
            
            var hasPrice = gold?.Price.HasValue == true;
            if (hasPrice)
            {
                return new
                {
                    ok = true,
                    latencyMs = sw.ElapsedMilliseconds,
                    message = "Successfully fetched XAU price",
                    samplePrice = gold!.Price!.Value
                };
            }
            else
            {
                return new
                {
                    ok = false,
                    latencyMs = sw.ElapsedMilliseconds,
                    message = "Response received but no price data"
                };
            }
        }
        catch (Exception ex)
        {
            sw.Stop();
            _logger.LogError(ex, "Gold API health check failed");
            return new
            {
                ok = false,
                latencyMs = sw.ElapsedMilliseconds,
                message = $"Error: {ex.Message}",
                hint = "Check Gold-API service status"
            };
        }
    }

    private async Task<object> CheckFx(CancellationToken ct)
    {
        var sw = Stopwatch.StartNew();
        try
        {
            var fx = await _fxClient.GetRatesAsync("USD", ct);
            sw.Stop();
            
            var hasRates = fx?.Rates != null && fx.Rates.Count > 0;
            var hasCad = hasRates && fx!.Rates!.ContainsKey("CAD");
            
            if (hasCad)
            {
                return new
                {
                    ok = true,
                    latencyMs = sw.ElapsedMilliseconds,
                    message = "Successfully fetched FX rates",
                    sampleRate = new { USD_CAD = fx.Rates["CAD"] },
                    ratesCount = fx.Rates.Count
                };
            }
            else
            {
                return new
                {
                    ok = false,
                    latencyMs = sw.ElapsedMilliseconds,
                    message = hasRates ? "CAD rate missing from response" : "No rates data returned"
                };
            }
        }
        catch (Exception ex)
        {
            sw.Stop();
            _logger.LogError(ex, "FX health check failed");
            return new
            {
                ok = false,
                latencyMs = sw.ElapsedMilliseconds,
                message = $"Error: {ex.Message}",
                hint = "Check exchangerate.host service status"
            };
        }
    }
}
