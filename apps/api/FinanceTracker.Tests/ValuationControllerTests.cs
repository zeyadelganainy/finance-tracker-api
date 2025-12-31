using System.Net;
using System.Net.Http.Json;
using FinanceTracker.Api.Models;
using FinanceTracker.Data;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace FinanceTracker.Tests;

public class ValuationControllerTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly HttpClient _client;
    private readonly CustomWebApplicationFactory _factory;

    public ValuationControllerTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task GetValuation_WithNoAssets_ReturnsEmptyList()
    {
        // Arrange
        await ClearDatabase();

        // Act
        var response = await _client.GetAsync("/assets/valuation");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var valuation = await response.Content.ReadFromJsonAsync<ValuationResponseDto>();
        Assert.NotNull(valuation);
        Assert.Empty(valuation.Assets);
        Assert.Contains("not enabled", valuation.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task GetValuation_WithAssets_ReturnsAllAssetsWithNullPrices()
    {
        // Arrange
        await ClearDatabase();
        await SeedAsset("Apple Stock", "stock", "AAPL", 100m, "shares", 15000m);
        await SeedAsset("Gold", "metal", null, 10m, "oz", 20000m);
        await SeedAsset("Bitcoin", "crypto", "BTC", 0.5m, "btc", 25000m);

        // Act
        var response = await _client.GetAsync("/assets/valuation");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var valuation = await response.Content.ReadFromJsonAsync<ValuationResponseDto>();
        Assert.NotNull(valuation);
        Assert.Equal(3, valuation.Assets.Count);

        // Verify all assets have null valuation fields
        foreach (var asset in valuation.Assets)
        {
            Assert.Null(asset.CurrentPrice);
            Assert.Null(asset.CurrentValue);
            Assert.Null(asset.UnrealizedGainLoss);
            Assert.Null(asset.ROIPercentage);
            Assert.Equal("NOT_AVAILABLE", asset.ValuationStatus);
        }
    }

    [Fact]
    public async Task GetValuation_IncludesAllAssetFields()
    {
        // Arrange
        await ClearDatabase();
        var assetId = await SeedAsset("Test Stock", "stock", "TEST", 50m, "shares", 5000m);

        // Act
        var response = await _client.GetAsync("/assets/valuation");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var valuation = await response.Content.ReadFromJsonAsync<ValuationResponseDto>();
        Assert.NotNull(valuation);
        Assert.Single(valuation.Assets);

        var asset = valuation.Assets[0];
        Assert.Equal(assetId, asset.AssetId);
        Assert.Equal("Test Stock", asset.Name);
        Assert.Equal("stock", asset.AssetClass);
        Assert.Equal("TEST", asset.Ticker);
        Assert.Equal(50m, asset.Quantity);
        Assert.Equal("shares", asset.Unit);
        Assert.Equal(5000m, asset.CostBasisTotal);
    }

    [Fact]
    public async Task GetAssetValuation_WithValidId_ReturnsAssetWithNullPrices()
    {
        // Arrange
        await ClearDatabase();
        var assetId = await SeedAsset("Apple Stock", "stock", "AAPL", 100m, "shares", 15000m);

        // Act
        var response = await _client.GetAsync($"/assets/{assetId}/valuation");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var valuation = await response.Content.ReadFromJsonAsync<ValuationDataDto>();
        Assert.NotNull(valuation);
        Assert.Equal(assetId, valuation.AssetId);
        Assert.Null(valuation.CurrentPrice);
        Assert.Null(valuation.CurrentValue);
        Assert.Null(valuation.UnrealizedGainLoss);
        Assert.Null(valuation.ROIPercentage);
        Assert.Equal("NOT_AVAILABLE", valuation.ValuationStatus);
    }

    [Fact]
    public async Task GetAssetValuation_WithInvalidId_ReturnsNotFound()
    {
        // Arrange
        await ClearDatabase();

        // Act
        var response = await _client.GetAsync($"/assets/{Guid.NewGuid()}/valuation");

        // Assert
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task GetValuation_OrdersAssetsByName()
    {
        // Arrange
        await ClearDatabase();
        await SeedAsset("Zebra Corp", "stock", "ZBR", 10m, "shares", 1000m);
        await SeedAsset("Apple Inc", "stock", "AAPL", 50m, "shares", 5000m);
        await SeedAsset("Microsoft", "stock", "MSFT", 25m, "shares", 2500m);

        // Act
        var response = await _client.GetAsync("/assets/valuation");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var valuation = await response.Content.ReadFromJsonAsync<ValuationResponseDto>();
        Assert.NotNull(valuation);
        Assert.Equal(3, valuation.Assets.Count);
        Assert.Equal("Apple Inc", valuation.Assets[0].Name);
        Assert.Equal("Microsoft", valuation.Assets[1].Name);
        Assert.Equal("Zebra Corp", valuation.Assets[2].Name);
    }

    [Fact]
    public async Task GetValuation_MessageIndicatesValuationNotImplemented()
    {
        // Arrange
        await ClearDatabase();
        await SeedAsset("Test", "stock", "TEST", 1m, "shares", 100m);

        // Act
        var response = await _client.GetAsync("/assets/valuation");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var valuation = await response.Content.ReadFromJsonAsync<ValuationResponseDto>();
        Assert.NotNull(valuation);
        Assert.NotNull(valuation.Message);
        Assert.Contains("not enabled", valuation.Message, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("pricing", valuation.Message, StringComparison.OrdinalIgnoreCase);
    }

    private async Task ClearDatabase()
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        db.Assets.RemoveRange(db.Assets);
        await db.SaveChangesAsync();
    }

    private async Task<Guid> SeedAsset(string name, string assetClass, string? ticker, decimal quantity, string? unit, decimal costBasis)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var asset = new Asset
        {
            Name = name,
            AssetClass = assetClass,
            Ticker = ticker,
            Quantity = quantity,
            Unit = unit,
            CostBasisTotal = costBasis
        };
        db.Assets.Add(asset);
        await db.SaveChangesAsync();
        return asset.Id;
    }

    private record ValuationResponseDto(
        List<ValuationDataDto> Assets,
        string Message
    );

    private record ValuationDataDto(
        Guid AssetId,
        string Name,
        string AssetClass,
        string? Ticker,
        decimal Quantity,
        string? Unit,
        decimal CostBasisTotal,
        decimal? CurrentPrice,
        decimal? CurrentValue,
        decimal? UnrealizedGainLoss,
        decimal? ROIPercentage,
        string ValuationStatus
    );
}
