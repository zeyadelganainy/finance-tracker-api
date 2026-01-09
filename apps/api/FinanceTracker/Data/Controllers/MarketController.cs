using FinanceTracker.Contracts.Common;
using FinanceTracker.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FinanceTracker.Api.Controllers;

/// <summary>
/// Market data quotes endpoint
/// </summary>
[ApiController]
[Route("market")]
[Authorize]
public class MarketController : ControllerBase
{
    private readonly IMarketDataService _marketDataService;
    private readonly ILogger<MarketController> _logger;

    public MarketController(IMarketDataService marketDataService, ILogger<MarketController> logger)
    {
        _marketDataService = marketDataService;
        _logger = logger;
    }

    /// <summary>
    /// Get market quotes for one or more tickers in a specified currency
    /// </summary>
    /// <param name="tickers">Comma-separated list of ticker symbols (e.g., "AAPL,MSFT,XAU")</param>
    /// <param name="currency">Target currency code (CAD, USD, EUR, GBP)</param>
    /// <returns>List of quotes with prices in the requested currency</returns>
    [HttpGet("quotes")]
    [Produces("application/json")]
    public async Task<IActionResult> GetQuotes(
        [FromQuery(Name = "tickers")] string tickers,
        [FromQuery(Name = "currency")] string currency = "USD",
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(tickers))
            return BadRequest("tickers parameter is required");

        if (string.IsNullOrWhiteSpace(currency))
            return BadRequest("currency parameter is required");

        var tickerList = tickers
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .ToList();

        if (!tickerList.Any())
            return BadRequest("At least one ticker is required");

        try
        {
            var quotes = await _marketDataService.GetQuotesAsync(tickerList, currency, ct);
            return Ok(quotes);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching quotes for tickers: {Tickers}", tickers);
            return StatusCode(500, new { error = "Failed to fetch quotes" });
        }
    }

    /// <summary>
    /// Get a single market quote for a ticker
    /// </summary>
    /// <param name="ticker">Ticker symbol (e.g., "AAPL", "XAU")</param>
    /// <param name="currency">Target currency code (CAD, USD, EUR, GBP)</param>
    /// <returns>Quote with price in the requested currency</returns>
    [HttpGet("quotes/{ticker}")]
    [Produces("application/json")]
    public async Task<IActionResult> GetQuote(
        string ticker,
        [FromQuery(Name = "currency")] string currency = "USD",
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(ticker))
            return BadRequest("ticker is required");

        if (string.IsNullOrWhiteSpace(currency))
            return BadRequest("currency is required");

        try
        {
            var quote = await _marketDataService.GetQuoteAsync(ticker, currency, ct);
            return Ok(quote);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching quote for ticker: {Ticker}", ticker);
            return StatusCode(500, new { error = "Failed to fetch quote" });
        }
    }
}
