using System.Net;
using System.Net.Http.Json;
using FinanceTracker.Contracts.Common;
using Xunit;

namespace FinanceTracker.Tests;

public class ValidationTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly HttpClient _client;

    public ValidationTests(CustomWebApplicationFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task CreateAccount_WithMissingName_ReturnsValidationError()
    {
        // Arrange - Name is null (violates Required attribute)
        var request = new
        {
            Name = (string?)null,
            Type = "bank",
            IsLiability = false
        };

        // Act
        var response = await _client.PostAsJsonAsync("/accounts", request);

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var error = await response.Content.ReadFromJsonAsync<ErrorResponse>();
        Assert.NotNull(error);
        Assert.Contains("Name", error.Error);
        Assert.NotNull(error.TraceId);
    }

    [Fact]
    public async Task CreateAccount_WithTooLongName_ReturnsValidationError()
    {
        // Arrange - Name exceeds MaxLength(100)
        var request = new
        {
            Name = new string('a', 101),
            Type = "bank",
            IsLiability = false
        };

        // Act
        var response = await _client.PostAsJsonAsync("/accounts", request);

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var error = await response.Content.ReadFromJsonAsync<ErrorResponse>();
        Assert.NotNull(error);
        Assert.Contains("Name", error.Error);
        Assert.NotNull(error.TraceId);
    }

    [Fact]
    public async Task CreateCategory_WithMissingName_ReturnsValidationError()
    {
        // Arrange
        var request = new
        {
            Name = (string?)null
        };

        // Act
        var response = await _client.PostAsJsonAsync("/categories", request);

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var error = await response.Content.ReadFromJsonAsync<ErrorResponse>();
        Assert.NotNull(error);
        Assert.Contains("Name", error.Error);
        Assert.NotNull(error.TraceId);
    }

    [Fact]
    public async Task CreateCategory_WithTooLongName_ReturnsValidationError()
    {
        // Arrange - Exceeds MaxLength(50)
        var request = new
        {
            Name = new string('a', 51)
        };

        // Act
        var response = await _client.PostAsJsonAsync("/categories", request);

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var error = await response.Content.ReadFromJsonAsync<ErrorResponse>();
        Assert.NotNull(error);
        Assert.Contains("Name", error.Error);
        Assert.NotNull(error.TraceId);
    }

    [Fact]
    public async Task CreateTransaction_WithInvalidAmount_ReturnsValidationError()
    {
        // Arrange - Amount exceeds Range
        var request = new
        {
            Amount = 2000000000m, // Exceeds max
            Date = new DateOnly(2025, 1, 1),
            CategoryId = 1,
            Description = (string?)null
        };

        // Act
        var response = await _client.PostAsJsonAsync("/transactions", request);

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var error = await response.Content.ReadFromJsonAsync<ErrorResponse>();
        Assert.NotNull(error);
        Assert.Contains("Amount", error.Error);
        Assert.NotNull(error.TraceId);
    }

    [Fact]
    public async Task CreateTransaction_WithTooLongDescription_ReturnsValidationError()
    {
        // Arrange - Description exceeds MaxLength(200)
        var request = new
        {
            Amount = 100m,
            Date = new DateOnly(2025, 1, 1),
            CategoryId = 1,
            Description = new string('a', 201)
        };

        // Act
        var response = await _client.PostAsJsonAsync("/transactions", request);

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var error = await response.Content.ReadFromJsonAsync<ErrorResponse>();
        Assert.NotNull(error);
        Assert.Contains("Description", error.Error);
        Assert.NotNull(error.TraceId);
    }

    [Fact]
    public async Task UpsertSnapshot_WithOutOfRangeBalance_ReturnsValidationError()
    {
        // Arrange - Balance exceeds Range
        var accountId = Guid.NewGuid();
        var request = new
        {
            Balance = 2000000000m // Exceeds max
        };

        // Act
        var response = await _client.PutAsJsonAsync($"/accounts/{accountId}/snapshots/2025-01-01", request);

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var error = await response.Content.ReadFromJsonAsync<ErrorResponse>();
        Assert.NotNull(error);
        Assert.Contains("Balance", error.Error);
        Assert.NotNull(error.TraceId);
    }

    [Fact]
    public async Task CreateAsset_WithTooLongTicker_ReturnsValidationError()
    {
        // Arrange - Ticker exceeds MaxLength(20)
        var request = new
        {
            Name = "Test Asset",
            AssetClass = "stock",
            Ticker = new string('A', 21)
        };

        // Act
        var response = await _client.PostAsJsonAsync("/assets", request);

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var error = await response.Content.ReadFromJsonAsync<ErrorResponse>();
        Assert.NotNull(error);
        Assert.Contains("Ticker", error.Error);
        Assert.NotNull(error.TraceId);
    }

    [Fact]
    public async Task CreateAsset_WithTooLongAssetClass_ReturnsValidationError()
    {
        // Arrange - AssetClass exceeds MaxLength(50)
        var request = new
        {
            Name = "Test Asset",
            AssetClass = new string('a', 51),
            Ticker = "TEST"
        };

        // Act
        var response = await _client.PostAsJsonAsync("/assets", request);

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var error = await response.Content.ReadFromJsonAsync<ErrorResponse>();
        Assert.NotNull(error);
        Assert.Contains("AssetClass", error.Error);
        Assert.NotNull(error.TraceId);
    }

    [Fact]
    public async Task ValidationError_IncludesTraceId()
    {
        // Arrange - Any validation error
        var request = new
        {
            Name = (string?)null
        };

        // Act
        var response = await _client.PostAsJsonAsync("/categories", request);

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var error = await response.Content.ReadFromJsonAsync<ErrorResponse>();
        Assert.NotNull(error);
        Assert.NotNull(error.TraceId);
        Assert.NotEmpty(error.TraceId);
    }
}
