using System.Net;
using System.Net.Http.Json;
using Xunit;

namespace FinanceTracker.Tests;

public class HealthControllerTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly HttpClient _client;

    public HealthControllerTests(CustomWebApplicationFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task GetHealth_ReturnsOk()
    {
        // Act
        var response = await _client.GetAsync("/health");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<HealthResponse>();
        Assert.NotNull(result);
        Assert.Equal("ok", result.status);
    }

    [Fact]
    public async Task GetReadiness_WithDatabaseConnected_ReturnsReady()
    {
        // Act
        var response = await _client.GetAsync("/health/ready");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<HealthResponse>();
        Assert.NotNull(result);
        Assert.Equal("ready", result.status);
    }

    [Fact]
    public async Task HealthEndpoint_ReturnsJsonContentType()
    {
        // Act
        var response = await _client.GetAsync("/health");

        // Assert
        Assert.Equal("application/json", response.Content.Headers.ContentType?.MediaType);
    }

    [Fact]
    public async Task ReadinessEndpoint_ReturnsJsonContentType()
    {
        // Act
        var response = await _client.GetAsync("/health/ready");

        // Assert
        Assert.Equal("application/json", response.Content.Headers.ContentType?.MediaType);
    }

    private record HealthResponse(string status);
}

