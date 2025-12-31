using System.Net;
using System.Net.Http.Json;
using FinanceTracker.Api.Models;
using FinanceTracker.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace FinanceTracker.Tests;

public class AssetsControllerTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly HttpClient _client;
    private readonly CustomWebApplicationFactory _factory;

    public AssetsControllerTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task CreateAsset_WithGold_DoesNotCreateAccount()
    {
        // Arrange
        await ClearDatabase();
        var request = new
        {
            Name = "Gold",
            AssetClass = "metal",
            Ticker = (string?)null,
            Quantity = 10m,
            Unit = "oz",
            CostBasisTotal = 20000m,
            PurchaseDate = (DateTime?)null,
            Notes = "Physical gold bars"
        };

        // Act
        var response = await _client.PostAsJsonAsync("/assets", request);

        // Assert
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        
        // Verify no Account was created
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var accountCount = await db.Accounts.CountAsync();
        var assetCount = await db.Assets.CountAsync();
        
        Assert.Equal(0, accountCount); // No accounts should exist
        Assert.Equal(1, assetCount); // Only Asset should exist
    }

    [Fact]
    public async Task CreateAsset_WithStock_RequiresTicker()
    {
        // Arrange
        await ClearDatabase();
        var request = new
        {
            Name = "Apple Stock",
            AssetClass = "stock",
            Ticker = (string?)null,
            Quantity = 100m,
            Unit = "shares",
            CostBasisTotal = 15000m
        };

        // Act
        var response = await _client.PostAsJsonAsync("/assets", request);

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var error = await response.Content.ReadAsStringAsync();
        Assert.Contains("Ticker is required for stocks", error);
    }

    [Fact]
    public async Task CreateAsset_WithMetal_RequiresUnit()
    {
        // Arrange
        await ClearDatabase();
        var request = new
        {
            Name = "Silver",
            AssetClass = "metal",
            Ticker = (string?)null,
            Quantity = 500m,
            Unit = (string?)null,
            CostBasisTotal = 10000m
        };

        // Act
        var response = await _client.PostAsJsonAsync("/assets", request);

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var error = await response.Content.ReadAsStringAsync();
        Assert.Contains("Unit is required for metals", error);
    }

    [Fact]
    public async Task CreateAsset_WithValidStock_ReturnsCreated()
    {
        // Arrange
        await ClearDatabase();
        var request = new
        {
            Name = "Apple Stock",
            AssetClass = "stock",
            Ticker = "AAPL",
            Quantity = 100m,
            Unit = "shares",
            CostBasisTotal = 15000m,
            PurchaseDate = new DateTime(2024, 1, 15),
            Notes = "Tech investment"
        };

        // Act
        var response = await _client.PostAsJsonAsync("/assets", request);

        // Assert
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var asset = await response.Content.ReadFromJsonAsync<AssetDto>();
        Assert.NotNull(asset);
        Assert.Equal("Apple Stock", asset.Name);
        Assert.Equal("stock", asset.AssetClass);
        Assert.Equal("AAPL", asset.Ticker);
        Assert.Equal(100m, asset.Quantity);
        Assert.Equal("shares", asset.Unit);
        Assert.Equal(15000m, asset.CostBasisTotal);
    }

    [Fact]
    public async Task CreateAsset_WithCrypto_ReturnsCreated()
    {
        // Arrange
        await ClearDatabase();
        var request = new
        {
            Name = "Bitcoin",
            AssetClass = "crypto",
            Ticker = "BTC",
            Quantity = 0.5m,
            Unit = "btc",
            CostBasisTotal = 25000m,
            PurchaseDate = new DateTime(2023, 6, 1),
            Notes = "Long-term hold"
        };

        // Act
        var response = await _client.PostAsJsonAsync("/assets", request);

        // Assert
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var asset = await response.Content.ReadFromJsonAsync<AssetDto>();
        Assert.NotNull(asset);
        Assert.Equal("Bitcoin", asset.Name);
        Assert.Equal("crypto", asset.AssetClass);
        Assert.Equal("BTC", asset.Ticker);
        Assert.Equal(0.5m, asset.Quantity);
    }

    [Fact]
    public async Task GetAssetById_WithValidId_ReturnsAsset()
    {
        // Arrange
        await ClearDatabase();
        var assetId = await SeedAsset("Gold", "metal", null, 10m, "oz", 20000m);

        // Act
        var response = await _client.GetAsync($"/assets/{assetId}");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var asset = await response.Content.ReadFromJsonAsync<AssetDto>();
        Assert.NotNull(asset);
        Assert.Equal(assetId, asset.Id);
        Assert.Equal("Gold", asset.Name);
    }

    [Fact]
    public async Task GetAssetById_WithInvalidId_ReturnsNotFound()
    {
        // Arrange
        await ClearDatabase();

        // Act
        var response = await _client.GetAsync($"/assets/{Guid.NewGuid()}");

        // Assert
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task UpdateAsset_WithValidData_ReturnsOk()
    {
        // Arrange
        await ClearDatabase();
        var assetId = await SeedAsset("Old Name", "stock", "OLD", 10m, "shares", 1000m);
        var updateRequest = new
        {
            Name = "New Name",
            AssetClass = "stock",
            Ticker = "NEW",
            Quantity = 20m,
            Unit = "shares",
            CostBasisTotal = 2000m,
            PurchaseDate = (DateTime?)null,
            Notes = "Updated"
        };

        // Act
        var response = await _client.PatchAsJsonAsync($"/assets/{assetId}", updateRequest);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var asset = await response.Content.ReadFromJsonAsync<AssetDto>();
        Assert.NotNull(asset);
        Assert.Equal("New Name", asset.Name);
        Assert.Equal("NEW", asset.Ticker);
        Assert.Equal(20m, asset.Quantity);
    }

    [Fact]
    public async Task DeleteAsset_WithValidId_ReturnsNoContent()
    {
        // Arrange
        await ClearDatabase();
        var assetId = await SeedAsset("To Delete", "stock", "DEL", 10m, "shares", 1000m);

        // Act
        var response = await _client.DeleteAsync($"/assets/{assetId}");

        // Assert
        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);

        // Verify deletion
        var getResponse = await _client.GetAsync($"/assets/{assetId}");
        Assert.Equal(HttpStatusCode.NotFound, getResponse.StatusCode);
    }

    [Fact]
    public async Task ListAssets_WithNoAssets_ReturnsEmptyList()
    {
        // Arrange
        await ClearDatabase();

        // Act
        var response = await _client.GetAsync("/assets");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var assets = await response.Content.ReadFromJsonAsync<List<AssetDto>>();
        Assert.NotNull(assets);
        Assert.Empty(assets);
    }

    [Fact]
    public async Task ListAssets_ReturnsAssetsOrderedByName()
    {
        // Arrange
        await ClearDatabase();
        await SeedAsset("Tesla", "stock", "TSLA", 10m, "shares", 2000m);
        await SeedAsset("Gold", "metal", null, 5m, "oz", 10000m);
        await SeedAsset("Apple", "stock", "AAPL", 50m, "shares", 7500m);

        // Act
        var response = await _client.GetAsync("/assets");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var assets = await response.Content.ReadFromJsonAsync<List<AssetDto>>();
        Assert.NotNull(assets);
        Assert.Equal(3, assets.Count);
        Assert.Equal("Apple", assets[0].Name);
        Assert.Equal("Gold", assets[1].Name);
        Assert.Equal("Tesla", assets[2].Name);
    }

    [Fact]
    public async Task CreateAsset_WithZeroQuantity_ReturnsBadRequest()
    {
        // Arrange
        var request = new
        {
            Name = "Test",
            AssetClass = "stock",
            Ticker = "TEST",
            Quantity = 0m,
            Unit = "shares",
            CostBasisTotal = 1000m
        };

        // Act
        var response = await _client.PostAsJsonAsync("/assets", request);

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task CreateAsset_WithNegativeCostBasis_ReturnsBadRequest()
    {
        // Arrange
        var request = new
        {
            Name = "Test",
            AssetClass = "stock",
            Ticker = "TEST",
            Quantity = 10m,
            Unit = "shares",
            CostBasisTotal = -1000m
        };

        // Act
        var response = await _client.PostAsJsonAsync("/assets", request);

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    private async Task ClearDatabase()
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        db.Assets.RemoveRange(db.Assets);
        db.AccountSnapshots.RemoveRange(db.AccountSnapshots);
        db.Accounts.RemoveRange(db.Accounts);
        await db.SaveChangesAsync();
    }

    private async Task<Guid> SeedAsset(string name, string assetClass, string? ticker, decimal quantity, string? unit, decimal costBasis)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var asset = new Asset
        {
            UserId = Guid.Parse(CustomWebApplicationFactory.TestUserId),
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

    private record AssetDto(
        Guid Id,
        string Name,
        string AssetClass,
        string? Ticker,
        decimal Quantity,
        string? Unit,
        decimal CostBasisTotal,
        DateTime? PurchaseDate,
        string? Notes,
        DateTime CreatedAt,
        DateTime UpdatedAt
    );
}

