using FinanceTracker.ExternalApis;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FinanceTracker.Api.Controllers;

/// <summary>
/// Diagnostics endpoints to verify external market data providers
/// </summary>
[ApiController]
[Route("diagnostics")]
[Authorize]
public class DiagnosticsController : ControllerBase
{
    private readonly IFinnhubClient _finnhub;
    private readonly IGoldApiClient _goldApi;
    private readonly IFxRateClient _fxClient;
    private readonly ILogger<DiagnosticsController> _logger;

    public DiagnosticsController(
        IFinnhubClient finnhub,
        IGoldApiClient goldApi,
        IFxRateClient fxClient,
        ILogger<DiagnosticsController> logger)
    {
        _finnhub = finnhub;
        _goldApi = goldApi;
        _fxClient = fxClient;
        _logger = logger;
    }

    /// <summary>
    /// Check Finnhub, Gold API, and FX provider connectivity
    /// </summary>
    [HttpGet("market")]
    [Produces("application/json")]
    public async Task<IActionResult> Market(CancellationToken ct = default)
    {
        var response = new
        {
            finnhub = new { ok = false, message = "" },
            goldApi = new { ok = false, message = "" },
            fx = new { ok = false, message = "" }
        };

        // Finnhub test: AAPL quote
        try
        {
            var quote = await _finnhub.GetQuoteAsync("AAPL", ct);
            var ok = quote?.CurrentPrice.HasValue == true;
            var msg = ok ? "OK" : "No price returned (check API key)";
            response = new
            {
                finnhub = new { ok, message = msg },
                goldApi = response.goldApi,
                fx = response.fx
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Finnhub diagnostics failed");
            response = new
            {
                finnhub = new { ok = false, message = ex.Message },
                goldApi = response.goldApi,
                fx = response.fx
            };
        }

        // Gold API test: XAU price
        try
        {
            var gold = await _goldApi.GetGoldPriceAsync(ct);
            var ok = gold?.Price.HasValue == true;
            var msg = ok ? "OK" : "No price returned";
            response = new
            {
                finnhub = response.finnhub,
                goldApi = new { ok, message = msg },
                fx = response.fx
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Gold API diagnostics failed");
            response = new
            {
                finnhub = response.finnhub,
                goldApi = new { ok = false, message = ex.Message },
                fx = response.fx
            };
        }

        // FX test: latest USD rates contain CAD
        try
        {
            var fx = await _fxClient.GetRatesAsync("USD", ct);
            var hasRates = fx?.Rates != null;
            var hasCad = hasRates && fx!.Rates!.ContainsKey("CAD");
            var ok = hasCad;
            var msg = ok ? "OK" : "CAD rate missing";
            response = new
            {
                finnhub = response.finnhub,
                goldApi = response.goldApi,
                fx = new { ok, message = msg }
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "FX diagnostics failed");
            response = new
            {
                finnhub = response.finnhub,
                goldApi = response.goldApi,
                fx = new { ok = false, message = ex.Message }
            };
        }

        return Ok(response);
    }
}
