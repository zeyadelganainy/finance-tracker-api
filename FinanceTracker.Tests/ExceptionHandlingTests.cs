using System.Net;
using System.Net.Http.Json;
using FinanceTracker.Contracts.Common;
using Xunit;

namespace FinanceTracker.Tests;

public class ExceptionHandlingTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly HttpClient _client;

    public ExceptionHandlingTests(CustomWebApplicationFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task BadRequest_ReturnsErrorResponseWithTraceId()
    {
        // Act - Try to create category with empty name
        var response = await _client.PostAsJsonAsync("/categories", new { Name = "" });

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        
        var error = await response.Content.ReadFromJsonAsync<ErrorResponse>();
        Assert.NotNull(error);
        Assert.Contains("Name is required", error.Error);
        Assert.NotNull(error.TraceId);
        Assert.NotEmpty(error.TraceId);
    }

    [Fact]
    public async Task Conflict_ReturnsErrorResponseWithTraceId()
    {
        // Arrange - Create a category first
        await _client.PostAsJsonAsync("/categories", new { Name = "TestCategory" });

        // Act - Try to create duplicate
        var response = await _client.PostAsJsonAsync("/categories", new { Name = "TestCategory" });

        // Assert
        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        
        var error = await response.Content.ReadFromJsonAsync<ErrorResponse>();
        Assert.NotNull(error);
        Assert.Contains("already exists", error.Error);
        Assert.NotNull(error.TraceId);
        Assert.NotEmpty(error.TraceId);
    }

    [Fact]
    public async Task NotFound_ReturnsErrorResponseWithTraceId()
    {
        // Act - Try to upsert snapshot for non-existent account
        var nonExistentId = Guid.NewGuid();
        var response = await _client.PutAsJsonAsync(
            $"/accounts/{nonExistentId}/snapshots/2025-01-01",
            new { Balance = 100m }
        );

        // Assert
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        
        var error = await response.Content.ReadFromJsonAsync<ErrorResponse>();
        Assert.NotNull(error);
        Assert.Contains("Account not found", error.Error);
        Assert.NotNull(error.TraceId);
        Assert.NotEmpty(error.TraceId);
    }

    [Fact]
    public async Task ValidationError_ReturnsErrorResponseWithTraceId()
    {
        // Act - Send invalid request (missing required fields will trigger model validation)
        var response = await _client.PostAsJsonAsync("/categories", new { });

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        
        var error = await response.Content.ReadFromJsonAsync<ErrorResponse>();
        Assert.NotNull(error);
        Assert.NotNull(error.Error);
        Assert.NotNull(error.TraceId);
        Assert.NotEmpty(error.TraceId);
    }
}
