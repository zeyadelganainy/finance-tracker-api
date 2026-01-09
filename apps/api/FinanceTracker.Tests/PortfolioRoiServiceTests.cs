using FinanceTracker.Api.Models;
using FinanceTracker.Contracts.Common;
using FinanceTracker.Data;
using FinanceTracker.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace FinanceTracker.Tests;

public class PortfolioRoiServiceTests
{
    private readonly AppDbContext _db;
    private readonly Mock<IMarketDataService> _marketDataMock;
    private readonly IPortfolioRoiService _service;

    public PortfolioRoiServiceTests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        _db = new AppDbContext(options);
        _marketDataMock = new Mock<IMarketDataService>();
        var loggerMock = new Mock<ILogger<PortfolioRoiService>>();

        _service = new PortfolioRoiService(_db, _marketDataMock.Object, loggerMock.Object);
    }

    [Fact]
    public async Task CalculatePortfolioRoiAsync_WithValidAssets_CalculatesRoiCorrectly()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var asset = new Asset
        {
            UserId = userId,
            Name = "Apple Stock",
            AssetClass = "Stock",
            Ticker = "AAPL",
            Quantity = 10m,
            Unit = "shares",
            CostBasisTotal = 1000m
        };

        _db.Assets.Add(asset);
        await _db.SaveChangesAsync();

        // Current price: $150/share (up from $100/share average cost)
        var quote = new QuoteDto
        {
            Ticker = "AAPL",
            Price = 150m,
            Currency = "USD",
            AsOfUtc = DateTime.UtcNow,
            Source = "finnhub",
            IsStale = false
        };

        _marketDataMock.Setup(m => m.GetQuotesAsync(It.IsAny<List<string>>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<QuoteDto> { quote });

        // Act
        var result = await _service.CalculatePortfolioRoiAsync(userId, "USD");

        // Assert
        Assert.NotNull(result);
        Assert.Single(result.Items);

        var item = result.Items[0];
        Assert.Equal("AAPL", item.Ticker);
        Assert.Equal(10m, item.Quantity);
        Assert.Equal(150m, item.UnitPrice);
        Assert.Equal(1500m, item.CurrentValue); // 10 * 150
        Assert.Equal(500m, item.UnrealizedGain); // 1500 - 1000
        Assert.Equal(50m, item.RoiPercent); // (500 / 1000) * 100

        // Portfolio totals
        Assert.Equal(1000m, result.Totals.CostBasisTotal);
        Assert.Equal(1500m, result.Totals.CurrentValueTotal);
        Assert.Equal(500m, result.Totals.UnrealizedGainTotal);
        Assert.Equal(50m, result.Totals.RoiPercentTotal);
    }

    [Fact]
    public async Task CalculatePortfolioRoiAsync_WithZeroCostBasis_IncludesErrorAndDoesNotAffectTotals()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var assetNormal = new Asset
        {
            UserId = userId,
            Name = "Normal Asset",
            AssetClass = "Stock",
            Ticker = "MSFT",
            Quantity = 5m,
            CostBasisTotal = 500m
        };

        var assetZeroCost = new Asset
        {
            UserId = userId,
            Name = "Zero Cost Asset",
            AssetClass = "Stock",
            Ticker = "GOOG",
            Quantity = 10m,
            CostBasisTotal = 0m // Zero cost basis
        };

        _db.Assets.AddRange(assetNormal, assetZeroCost);
        await _db.SaveChangesAsync();

        var quotes = new List<QuoteDto>
        {
            new() { Ticker = "MSFT", Price = 100m, Currency = "USD" },
            new() { Ticker = "GOOG", Price = 140m, Currency = "USD" }
        };

        _marketDataMock.Setup(m => m.GetQuotesAsync(It.IsAny<List<string>>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(quotes);

        // Act
        var result = await _service.CalculatePortfolioRoiAsync(userId, "USD");

        // Assert
        Assert.Equal(2, result.Items.Count);

        var zeroItem = result.Items.First(i => i.Ticker == "GOOG");
        Assert.NotNull(zeroItem.Error);
        Assert.Contains("Cost basis is zero", zeroItem.Error);
        Assert.Null(zeroItem.RoiPercent);
        Assert.Null(zeroItem.CurrentValue);

        // Totals should only include MSFT (valid quote)
        Assert.Equal(500m, result.Totals.CostBasisTotal);
        Assert.Equal(500m, result.Totals.CurrentValueTotal); // 5 * 100
        Assert.Equal(1, result.Totals.ItemsWithValidQuotes);
        Assert.Equal(1, result.Totals.ItemsWithErrors);
    }

    [Fact]
    public async Task CalculatePortfolioRoiAsync_WithNullTicker_IncludesErrorAndDoesNotAffectTotals()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var assetNoTicker = new Asset
        {
            UserId = userId,
            Name = "Real Estate",
            AssetClass = "RealEstate",
            Ticker = null, // No ticker
            Quantity = 1m,
            CostBasisTotal = 500000m
        };

        _db.Assets.Add(assetNoTicker);
        await _db.SaveChangesAsync();

        // Act
        var result = await _service.CalculatePortfolioRoiAsync(userId, "USD");

        // Assert
        Assert.Single(result.Items);
        var item = result.Items[0];
        Assert.NotNull(item.Error);
        Assert.Contains("No ticker", item.Error);
        Assert.Null(item.CurrentValue);
        Assert.Null(item.RoiPercent);

        // Totals should be empty
        Assert.Equal(0, result.Totals.ItemsWithValidQuotes);
        Assert.Equal(1, result.Totals.ItemsWithErrors);
    }

    [Fact]
    public async Task CalculatePortfolioRoiAsync_WithMultipleCurrencies_CalculatesTotalsCorrectly()
    {
        // Arrange
        var userId = Guid.NewGuid();

        var asset1 = new Asset
        {
            UserId = userId,
            Name = "US Stock",
            AssetClass = "Stock",
            Ticker = "AAPL",
            Quantity = 10m,
            CostBasisTotal = 1000m
        };

        var asset2 = new Asset
        {
            UserId = userId,
            Name = "Another US Stock",
            AssetClass = "Stock",
            Ticker = "MSFT",
            Quantity = 5m,
            CostBasisTotal = 500m
        };

        _db.Assets.AddRange(asset1, asset2);
        await _db.SaveChangesAsync();

        // Prices for CAD (AAPL = 150 CAD, MSFT = 100 CAD)
        var quotes = new List<QuoteDto>
        {
            new() { Ticker = "AAPL", Price = 150m, Currency = "CAD", IsStale = false },
            new() { Ticker = "MSFT", Price = 100m, Currency = "CAD", IsStale = false }
        };

        _marketDataMock.Setup(m => m.GetQuotesAsync(It.IsAny<List<string>>(), "CAD", It.IsAny<CancellationToken>()))
            .ReturnsAsync(quotes);

        // Act
        var result = await _service.CalculatePortfolioRoiAsync(userId, "CAD");

        // Assert
        Assert.Equal(2, result.Items.Count);

        // Totals: Cost = 1500, Current = (10*150) + (5*100) = 2000
        Assert.Equal(1500m, result.Totals.CostBasisTotal);
        Assert.Equal(2000m, result.Totals.CurrentValueTotal);
        Assert.Equal(500m, result.Totals.UnrealizedGainTotal);
        Assert.Equal(33.33m, result.Totals.RoiPercentTotal.GetValueOrDefault(), 2);
    }

    [Fact]
    public async Task CalculatePortfolioRoiAsync_WithLossPosition_CalculatesNegativeRoiCorrectly()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var asset = new Asset
        {
            UserId = userId,
            Name = "Loss Position",
            AssetClass = "Stock",
            Ticker = "NVDA",
            Quantity = 100m,
            CostBasisTotal = 10000m // $100 average cost
        };

        _db.Assets.Add(asset);
        await _db.SaveChangesAsync();

        // Price dropped to $80/share
        var quote = new QuoteDto
        {
            Ticker = "NVDA",
            Price = 80m,
            Currency = "USD",
            IsStale = false
        };

        _marketDataMock.Setup(m => m.GetQuotesAsync(It.IsAny<List<string>>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<QuoteDto> { quote });

        // Act
        var result = await _service.CalculatePortfolioRoiAsync(userId, "USD");

        // Assert
        var item = result.Items[0];
        Assert.Equal(8000m, item.CurrentValue); // 100 * 80
        Assert.Equal(-2000m, item.UnrealizedGain); // 8000 - 10000
        Assert.Equal(-20m, item.RoiPercent); // (-2000 / 10000) * 100
    }

    [Fact]
    public async Task CalculatePortfolioRoiAsync_WithStaleQuote_MarksAsStaleAndIncludesError()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var asset = new Asset
        {
            UserId = userId,
            Name = "Test Asset",
            AssetClass = "Stock",
            Ticker = "TSLA",
            Quantity = 5m,
            CostBasisTotal = 500m
        };

        _db.Assets.Add(asset);
        await _db.SaveChangesAsync();

        var quote = new QuoteDto
        {
            Ticker = "TSLA",
            Price = 200m,
            Currency = "USD",
            IsStale = true,
            Error = "Using cached quote"
        };

        _marketDataMock.Setup(m => m.GetQuotesAsync(It.IsAny<List<string>>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<QuoteDto> { quote });

        // Act
        var result = await _service.CalculatePortfolioRoiAsync(userId, "USD");

        // Assert
        var item = result.Items[0];
        Assert.True(item.IsQuoteStale);
        Assert.NotNull(item.Error);
        // ROI should still be calculated even with stale quote
        Assert.Equal(1000m, item.CurrentValue);
        Assert.Equal(500m, item.UnrealizedGain);
        Assert.Equal(100m, item.RoiPercent);
    }

    [Fact]
    public async Task CalculatePortfolioRoiAsync_EmptyPortfolio_ReturnEmptyResult()
    {
        // Arrange
        var userId = Guid.NewGuid();

        // Act
        var result = await _service.CalculatePortfolioRoiAsync(userId, "USD");

        // Assert
        Assert.Empty(result.Items);
        Assert.Equal(0, result.Totals.CostBasisTotal);
        Assert.Equal(0, result.Totals.CurrentValueTotal);
        Assert.Equal(0, result.Totals.ItemsWithValidQuotes);
    }
}
