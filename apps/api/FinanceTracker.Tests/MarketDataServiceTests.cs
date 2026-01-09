using FinanceTracker.Contracts.Common;
using FinanceTracker.ExternalApis;
using FinanceTracker.Options;
using FinanceTracker.Services;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using Xunit;

namespace FinanceTracker.Tests;

public class MarketDataServiceTests
{
    private readonly Mock<IFinnhubClient> _finnhubMock;
    private readonly Mock<IGoldApiClient> _goldApiMock;
    private readonly Mock<IFxRateClient> _fxRateMock;
    private readonly IMemoryCache _cache;
    private readonly MarketDataOptions _options;
    private readonly IMarketDataService _service;

    public MarketDataServiceTests()
    {
        _finnhubMock = new Mock<IFinnhubClient>();
        _goldApiMock = new Mock<IGoldApiClient>();
        _fxRateMock = new Mock<IFxRateClient>();
        _cache = new MemoryCache(new MemoryCacheOptions());
        _options = new MarketDataOptions
        {
            FinnhubApiKey = "test-key",
            CacheMinutes = 15
        };

        var loggerMock = new Mock<ILogger<MarketDataService>>();
        var optionsWrapper = Microsoft.Extensions.Options.Options.Create(_options);

        _service = new MarketDataService(
            _finnhubMock.Object,
            _goldApiMock.Object,
            _fxRateMock.Object,
            _cache,
            optionsWrapper,
            loggerMock.Object
        );
    }

    [Fact]
    public async Task GetQuoteAsync_WithValidTicker_ReturnsQuoteInUsd()
    {
        // Arrange
        var ticker = "AAPL";
        var now = DateTime.UtcNow;
        var finnhubResponse = new FinnhubQuoteResponse
        {
            CurrentPrice = 150m,
            Timestamp = ((DateTimeOffset)now).ToUnixTimeSeconds()
        };

        _finnhubMock.Setup(f => f.GetQuoteAsync(ticker, It.IsAny<CancellationToken>()))
            .ReturnsAsync(finnhubResponse);

        // Act
        var quote = await _service.GetQuoteAsync(ticker, "USD");

        // Assert
        Assert.NotNull(quote);
        Assert.Equal(ticker, quote.Ticker);
        Assert.Equal(150m, quote.Price);
        Assert.Equal("USD", quote.Currency);
        Assert.False(quote.IsStale);
        Assert.Equal("finnhub", quote.Source);
        Assert.Null(quote.Error);
    }

    [Fact]
    public async Task GetQuoteAsync_WithCurrencyConversion_ConvertsCorrectly()
    {
        // Arrange
        var ticker = "AAPL";
        var finnhubResponse = new FinnhubQuoteResponse { CurrentPrice = 100m };

        _finnhubMock.Setup(f => f.GetQuoteAsync(ticker, It.IsAny<CancellationToken>()))
            .ReturnsAsync(finnhubResponse);

        // exchangerate.host: 1 USD = 1.35 CAD
        var fxResponse = new FxRateResponse
        {
            Success = true,
            Base = "USD",
            Rates = new Dictionary<string, decimal> { { "CAD", 1.35m } }
        };

        _fxRateMock.Setup(f => f.GetRatesAsync("USD", It.IsAny<CancellationToken>()))
            .ReturnsAsync(fxResponse);

        // Act
        var quote = await _service.GetQuoteAsync(ticker, "CAD");

        // Assert
        Assert.NotNull(quote);
        Assert.Equal(100m * 1.35m, quote.Price);
        Assert.Equal("CAD", quote.Currency);
    }

    [Fact]
    public async Task GetQuoteAsync_WithGoldTicker_ReturnsPricePerOunce()
    {
        // Arrange
        // Gold-API returns: USD 2000 per ounce
        // FX conversion: USD to CAD at 1.35 rate via exchangerate.host
        // Expected: 2000 * 1.35 = 2700 CAD per ounce
        var goldResponse = new GoldApiResponse
        {
            Price = 2000m,
            UpdatedAt = DateTime.UtcNow.ToString("O")
        };

        _goldApiMock.Setup(m => m.GetGoldPriceAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(goldResponse);

        // FX conversion from USD to CAD via exchangerate.host
        var fxResponse = new FxRateResponse
        {
            Success = true,
            Base = "USD",
            Rates = new Dictionary<string, decimal> { { "CAD", 1.35m } }
        };

        _fxRateMock.Setup(f => f.GetRatesAsync("USD", It.IsAny<CancellationToken>()))
            .ReturnsAsync(fxResponse);

        // Act
        var quote = await _service.GetQuoteAsync("XAU", "CAD");

        // Assert
        Assert.NotNull(quote);
        Assert.Equal("XAU", quote.Ticker);
        Assert.Equal(2700m, quote.Price); // 2000 * 1.35
        Assert.Equal("CAD", quote.Currency);
        Assert.Equal("gold-api", quote.Source);
        Assert.False(quote.IsStale);
    }

    [Fact]
    public async Task GetQuoteAsync_WithProviderFailureAndNoCached_ReturnsError()
    {
        // Arrange
        var ticker = "INVALID";

        // Provider fails
        _finnhubMock.Setup(f => f.GetQuoteAsync(ticker, It.IsAny<CancellationToken>()))
            .ReturnsAsync((FinnhubQuoteResponse?)null);

        // Act
        var quote = await _service.GetQuoteAsync(ticker, "USD");

        // Assert
        Assert.NotNull(quote);
        Assert.Null(quote.Price);
        Assert.True(quote.IsStale);
        Assert.NotNull(quote.Error);
        Assert.Contains("no cached value available", quote.Error);
    }

    [Fact]
    public async Task GetQuoteAsync_EmptyTicker_ReturnsError()
    {
        // Act
        var quote = await _service.GetQuoteAsync("", "USD");

        // Assert
        Assert.NotNull(quote);
        Assert.Null(quote.Price);
        Assert.NotNull(quote.Error);
    }

    [Fact]
    public async Task GetQuotesAsync_DeduplicatesTickers()
    {
        // Arrange
        var tickers = new List<string> { "AAPL", "aapl", "AAPL", "MSFT" };
        var finnhubResponse = new FinnhubQuoteResponse { CurrentPrice = 150m };

        _finnhubMock.Setup(f => f.GetQuoteAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(finnhubResponse);

        // Act
        var quotes = await _service.GetQuotesAsync(tickers, "USD");

        // Assert
        var aapl = quotes.First(q => q.Ticker == "AAPL");
        var msft = quotes.First(q => q.Ticker == "MSFT");

        // Verify Finnhub was called exactly twice (deduplicated)
        _finnhubMock.Verify(f => f.GetQuoteAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Exactly(2));
    }

    [Fact]
    public async Task GetQuoteAsync_CachesResultForSubsequentCalls()
    {
        // Arrange
        var ticker = "GOOG";
        var finnhubResponse = new FinnhubQuoteResponse { CurrentPrice = 140m };

        _finnhubMock.Setup(f => f.GetQuoteAsync(ticker, It.IsAny<CancellationToken>()))
            .ReturnsAsync(finnhubResponse);

        // Act - First call
        var quote1 = await _service.GetQuoteAsync(ticker, "USD");

        // Reset mock to verify it's not called again
        _finnhubMock.Reset();

        // Act - Second call (should come from cache)
        var quote2 = await _service.GetQuoteAsync(ticker, "USD");

        // Assert
        Assert.Equal(quote1.Price, quote2.Price);
        _finnhubMock.Verify(f => f.GetQuoteAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }
}
