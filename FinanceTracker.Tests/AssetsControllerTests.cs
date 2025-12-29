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
    public async Task CreateAsset_WithValidData_ReturnsCreated()
    {
        // Arrange
        await ClearDatabase();
        var request = new
        {
            Name = "Apple Stock",
            AssetClass = "stock",
            Ticker = "AAPL"
        };

        // Act
        var response = await _client.PostAsJsonAsync("/assets", request);

        // Assert
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var asset = await response.Content.ReadFromJsonAsync<AssetDto>();
        Assert.NotNull(asset);
        Assert.NotEqual(Guid.Empty, asset.Id);
        Assert.Equal("Apple Stock", asset.Name);
        Assert.Equal("stock", asset.AssetClass);
        Assert.Equal("AAPL", asset.Ticker);
        Assert.Equal($"/assets/{asset.Id}", response.Headers.Location?.ToString());
    }

    [Fact]
    public async Task CreateAsset_WithMinimalData_ReturnsCreated()
    {
        // Arrange
        await ClearDatabase();
        var request = new
        {
            Name = "Cash",
            AssetClass = (string?)null,
            Ticker = (string?)null
        };

        // Act
        var response = await _client.PostAsJsonAsync("/assets", request);

        // Assert
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var asset = await response.Content.ReadFromJsonAsync<AssetDto>();
        Assert.NotNull(asset);
        Assert.Equal("Cash", asset.Name);
        Assert.Null(asset.AssetClass);
        Assert.Null(asset.Ticker);
    }

    [Fact]
    public async Task CreateAsset_NormalizesAssetClassToLowerCase()
    {
        // Arrange
        await ClearDatabase();
        var request = new
        {
            Name = "Gold ETF",
            AssetClass = "GOLD",
            Ticker = "GLD"
        };

        // Act
        var response = await _client.PostAsJsonAsync("/assets", request);

        // Assert
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var asset = await response.Content.ReadFromJsonAsync<AssetDto>();
        Assert.NotNull(asset);
        Assert.Equal("gold", asset.AssetClass); // Should be lowercase
    }

    [Fact]
    public async Task CreateAsset_NormalizesTickerToUpperCase()
    {
        // Arrange
        await ClearDatabase();
        var request = new
        {
            Name = "Microsoft Stock",
            AssetClass = "stock",
            Ticker = "msft"
        };

        // Act
        var response = await _client.PostAsJsonAsync("/assets", request);

        // Assert
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var asset = await response.Content.ReadFromJsonAsync<AssetDto>();
        Assert.NotNull(asset);
        Assert.Equal("MSFT", asset.Ticker); // Should be uppercase
    }

    [Fact]
    public async Task CreateAsset_TrimsWhitespace()
    {
        // Arrange
        await ClearDatabase();
        var request = new
        {
            Name = "  Bitcoin  ",
            AssetClass = "  crypto  ",
            Ticker = "  BTC  "
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
    }

    [Fact]
    public async Task CreateAsset_WithEmptyName_ReturnsBadRequest()
    {
        // Arrange
        var request = new
        {
            Name = "",
            AssetClass = "stock",
            Ticker = "AAPL"
        };

        // Act
        var response = await _client.PostAsJsonAsync("/assets", request);

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var error = await response.Content.ReadAsStringAsync();
        Assert.Contains("Name field is required", error);
    }

    [Fact]
    public async Task CreateAsset_WithWhitespaceName_ReturnsBadRequest()
    {
        // Arrange
        var request = new
        {
            Name = "   ",
            AssetClass = "stock",
            Ticker = "AAPL"
        };

        // Act
        var response = await _client.PostAsJsonAsync("/assets", request);

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var error = await response.Content.ReadAsStringAsync();
        Assert.Contains("Name", error);
    }

    [Fact]
    public async Task CreateAsset_WithEmptyAssetClass_StoresNull()
    {
        // Arrange
        await ClearDatabase();
        var request = new
        {
            Name = "Generic Asset",
            AssetClass = "   ",
            Ticker = "TEST"
        };

        // Act
        var response = await _client.PostAsJsonAsync("/assets", request);

        // Assert
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var asset = await response.Content.ReadFromJsonAsync<AssetDto>();
        Assert.NotNull(asset);
        Assert.Null(asset.AssetClass);
    }

    [Fact]
    public async Task CreateAsset_WithEmptyTicker_StoresNull()
    {
        // Arrange
        await ClearDatabase();
        var request = new
        {
            Name = "Private Asset",
            AssetClass = "other",
            Ticker = "   "
        };

        // Act
        var response = await _client.PostAsJsonAsync("/assets", request);

        // Assert
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var asset = await response.Content.ReadFromJsonAsync<AssetDto>();
        Assert.NotNull(asset);
        Assert.Null(asset.Ticker);
    }

    [Fact]
    public async Task CreateAsset_WithVariousAssetClasses_ReturnsCreated()
    {
        // Arrange
        await ClearDatabase();

        // Act & Assert
        var assetClasses = new[] { "stock", "bond", "crypto", "gold", "real estate", "cash", "other" };
        
        int index = 0;
        foreach (var assetClass in assetClasses)
        {
            var request = new
            {
                Name = $"{assetClass} asset {index++}",
                AssetClass = assetClass,
                Ticker = (string?)null
            };

            var response = await _client.PostAsJsonAsync("/assets", request);
            
            Assert.Equal(HttpStatusCode.Created, response.StatusCode);
            var asset = await response.Content.ReadFromJsonAsync<AssetDto>();
            Assert.NotNull(asset);
            Assert.Equal(assetClass, asset.AssetClass);
        }
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
        await SeedAsset("Tesla Stock", "stock", "TSLA");
        await SeedAsset("Gold", "gold", "GLD");
        await SeedAsset("Apple Stock", "stock", "AAPL");

        // Act
        var response = await _client.GetAsync("/assets");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var assets = await response.Content.ReadFromJsonAsync<List<AssetDto>>();
        Assert.NotNull(assets);
        Assert.Equal(3, assets.Count);
        Assert.Equal("Apple Stock", assets[0].Name);
        Assert.Equal("Gold", assets[1].Name);
        Assert.Equal("Tesla Stock", assets[2].Name);
    }

    [Fact]
    public async Task ListAssets_OnlyReturnsAssetAccounts()
    {
        // Arrange
        await ClearDatabase();
        
        // Create assets
        await SeedAsset("Stock", "stock", "AAPL");
        await SeedAsset("Gold", "gold", null);
        
        // Create non-asset accounts (should not be returned)
        await SeedAccount("Checking", "bank", false);
        await SeedAccount("Credit Card", "credit", true);

        // Act
        var response = await _client.GetAsync("/assets");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var assets = await response.Content.ReadFromJsonAsync<List<AssetDto>>();
        Assert.NotNull(assets);
        Assert.Equal(2, assets.Count); // Only the 2 assets
        Assert.All(assets, a => Assert.NotNull(a.Name));
    }

    [Fact]
    public async Task ListAssets_IncludesAllProperties()
    {
        // Arrange
        await ClearDatabase();
        var assetId = await SeedAsset("Bitcoin", "crypto", "BTC");

        // Act
        var response = await _client.GetAsync("/assets");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var assets = await response.Content.ReadFromJsonAsync<List<AssetDto>>();
        Assert.NotNull(assets);
        Assert.Single(assets);
        Assert.Equal(assetId, assets[0].Id);
        Assert.Equal("Bitcoin", assets[0].Name);
        Assert.Equal("crypto", assets[0].AssetClass);
        Assert.Equal("BTC", assets[0].Ticker);
    }

    [Fact]
    public async Task ListAssets_HandlesNullAssetClassAndTicker()
    {
        // Arrange
        await ClearDatabase();
        await SeedAsset("Generic Asset", null, null);

        // Act
        var response = await _client.GetAsync("/assets");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var assets = await response.Content.ReadFromJsonAsync<List<AssetDto>>();
        Assert.NotNull(assets);
        Assert.Single(assets);
        Assert.Equal("Generic Asset", assets[0].Name);
        Assert.Null(assets[0].AssetClass);
        Assert.Null(assets[0].Ticker);
    }

    [Fact]
    public async Task CreateAsset_CreatesAccountWithCorrectType()
    {
        // Arrange
        await ClearDatabase();
        var request = new
        {
            Name = "Test Asset",
            AssetClass = "stock",
            Ticker = "TEST"
        };

        // Act
        await _client.PostAsJsonAsync("/assets", request);

        // Assert - Verify in database
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var account = await db.Accounts.FirstOrDefaultAsync(a => a.Name == "Test Asset");
        
        Assert.NotNull(account);
        Assert.Equal("asset", account.Type);
        Assert.False(account.IsLiability);
        Assert.Equal("stock", account.AssetClass);
        Assert.Equal("TEST", account.Ticker);
    }

    [Fact]
    public async Task CreateAsset_WithMixedCaseAssetClass_NormalizesConsistently()
    {
        // Arrange
        await ClearDatabase();
        var request = new
        {
            Name = "Real Estate",
            AssetClass = "ReAl EsTaTe",
            Ticker = (string?)null
        };

        // Act
        var response = await _client.PostAsJsonAsync("/assets", request);

        // Assert
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var asset = await response.Content.ReadFromJsonAsync<AssetDto>();
        Assert.NotNull(asset);
        Assert.Equal("real estate", asset.AssetClass);
    }

    [Fact]
    public async Task CreateAsset_WithMixedCaseTicker_NormalizesConsistently()
    {
        // Arrange
        await ClearDatabase();
        var request = new
        {
            Name = "Google Stock",
            AssetClass = "stock",
            Ticker = "GoOgL"
        };

        // Act
        var response = await _client.PostAsJsonAsync("/assets", request);

        // Assert
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var asset = await response.Content.ReadFromJsonAsync<AssetDto>();
        Assert.NotNull(asset);
        Assert.Equal("GOOGL", asset.Ticker);
    }

    [Fact]
    public async Task ListAssets_WithMultipleAssetsOfSameClass_ReturnsAll()
    {
        // Arrange
        await ClearDatabase();
        await SeedAsset("Apple", "stock", "AAPL");
        await SeedAsset("Microsoft", "stock", "MSFT");
        await SeedAsset("Google", "stock", "GOOGL");

        // Act
        var response = await _client.GetAsync("/assets");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var assets = await response.Content.ReadFromJsonAsync<List<AssetDto>>();
        Assert.NotNull(assets);
        Assert.Equal(3, assets.Count);
        Assert.All(assets, a => Assert.Equal("stock", a.AssetClass));
    }

    private async Task ClearDatabase()
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        
        var snapshots = await db.AccountSnapshots.ToListAsync();
        db.AccountSnapshots.RemoveRange(snapshots);
        
        var accounts = await db.Accounts.ToListAsync();
        db.Accounts.RemoveRange(accounts);
        
        await db.SaveChangesAsync();
    }

    private async Task<Guid> SeedAsset(string name, string? assetClass, string? ticker)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var asset = new Account
        {
            Name = name,
            Type = "asset",
            IsLiability = false,
            AssetClass = assetClass,
            Ticker = ticker
        };
        db.Accounts.Add(asset);
        await db.SaveChangesAsync();
        return asset.Id;
    }

    private async Task<Guid> SeedAccount(string name, string? type, bool isLiability)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var account = new Account
        {
            Name = name,
            Type = type,
            IsLiability = isLiability
        };
        db.Accounts.Add(account);
        await db.SaveChangesAsync();
        return account.Id;
    }

    private record AssetDto(Guid Id, string Name, string? AssetClass, string? Ticker);
}
