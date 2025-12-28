using System.Net;
using System.Net.Http.Json;
using FinanceTracker.Api.Models;
using FinanceTracker.Data;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace FinanceTracker.Tests;

public class AccountsControllerTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly HttpClient _client;
    private readonly CustomWebApplicationFactory _factory;

    public AccountsControllerTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task CreateAccount_WithValidData_ReturnsCreated()
    {
        // Arrange
        await ClearDatabase();
        var request = new { Name = "Checking Account", Type = "bank", IsLiability = false };

        // Act
        var response = await _client.PostAsJsonAsync("/accounts", request);

        // Assert
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var account = await response.Content.ReadFromJsonAsync<AccountDto>();
        Assert.NotNull(account);
        Assert.NotEqual(Guid.Empty, account.Id);
        Assert.Equal("Checking Account", account.Name);
        Assert.Equal("bank", account.Type);
        Assert.False(account.IsLiability);
        Assert.Equal($"/accounts/{account.Id}", response.Headers.Location?.ToString());
    }

    [Fact]
    public async Task CreateAccount_WithMinimalData_ReturnsCreated()
    {
        // Arrange
        await ClearDatabase();
        var request = new { Name = "Cash", Type = (string?)null, IsLiability = false };

        // Act
        var response = await _client.PostAsJsonAsync("/accounts", request);

        // Assert
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var account = await response.Content.ReadFromJsonAsync<AccountDto>();
        Assert.NotNull(account);
        Assert.Equal("Cash", account.Name);
        Assert.Null(account.Type);
        Assert.False(account.IsLiability);
    }

    [Fact]
    public async Task CreateAccount_WithLiability_ReturnsCreated()
    {
        // Arrange
        await ClearDatabase();
        var request = new { Name = "Credit Card", Type = "credit", IsLiability = true };

        // Act
        var response = await _client.PostAsJsonAsync("/accounts", request);

        // Assert
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var account = await response.Content.ReadFromJsonAsync<AccountDto>();
        Assert.NotNull(account);
        Assert.Equal("Credit Card", account.Name);
        Assert.True(account.IsLiability);
    }

    [Fact]
    public async Task CreateAccount_WithEmptyName_ReturnsBadRequest()
    {
        // Arrange
        var request = new { Name = "", Type = "bank", IsLiability = false };

        // Act
        var response = await _client.PostAsJsonAsync("/accounts", request);

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var error = await response.Content.ReadAsStringAsync();
        Assert.Contains("Name is required", error);
    }

    [Fact]
    public async Task CreateAccount_WithWhitespaceName_ReturnsBadRequest()
    {
        // Arrange
        var request = new { Name = "   ", Type = "bank", IsLiability = false };

        // Act
        var response = await _client.PostAsJsonAsync("/accounts", request);

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var error = await response.Content.ReadAsStringAsync();
        Assert.Contains("Name is required", error);
    }

    [Fact]
    public async Task CreateAccount_TrimsWhitespace()
    {
        // Arrange
        await ClearDatabase();
        var request = new { Name = "  Savings Account  ", Type = "  bank  ", IsLiability = false };

        // Act
        var response = await _client.PostAsJsonAsync("/accounts", request);

        // Assert
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var account = await response.Content.ReadFromJsonAsync<AccountDto>();
        Assert.NotNull(account);
        Assert.Equal("Savings Account", account.Name);
        Assert.Equal("bank", account.Type);
    }

    [Fact]
    public async Task CreateAccount_WithEmptyType_StoresNull()
    {
        // Arrange
        await ClearDatabase();
        var request = new { Name = "Generic Account", Type = "   ", IsLiability = false };

        // Act
        var response = await _client.PostAsJsonAsync("/accounts", request);

        // Assert
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var account = await response.Content.ReadFromJsonAsync<AccountDto>();
        Assert.NotNull(account);
        Assert.Null(account.Type);
    }

    [Fact]
    public async Task ListAccounts_WithNoAccounts_ReturnsEmptyList()
    {
        // Arrange
        await ClearDatabase();

        // Act
        var response = await _client.GetAsync("/accounts");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var accounts = await response.Content.ReadFromJsonAsync<List<AccountDto>>();
        Assert.NotNull(accounts);
        Assert.Empty(accounts);
    }

    [Fact]
    public async Task ListAccounts_ReturnsAccountsOrderedByName()
    {
        // Arrange
        await ClearDatabase();
        await SeedAccount("Savings", "bank", false);
        await SeedAccount("Credit Card", "credit", true);
        await SeedAccount("Cash", null, false);

        // Act
        var response = await _client.GetAsync("/accounts");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var accounts = await response.Content.ReadFromJsonAsync<List<AccountDto>>();
        Assert.NotNull(accounts);
        Assert.Equal(3, accounts.Count);
        Assert.Equal("Cash", accounts[0].Name);
        Assert.Equal("Credit Card", accounts[1].Name);
        Assert.Equal("Savings", accounts[2].Name);
    }

    [Fact]
    public async Task ListAccounts_IncludesAllProperties()
    {
        // Arrange
        await ClearDatabase();
        var accountId = await SeedAccount("Investment", "investment", false);

        // Act
        var response = await _client.GetAsync("/accounts");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var accounts = await response.Content.ReadFromJsonAsync<List<AccountDto>>();
        Assert.NotNull(accounts);
        Assert.Single(accounts);
        Assert.Equal(accountId, accounts[0].Id);
        Assert.Equal("Investment", accounts[0].Name);
        Assert.Equal("investment", accounts[0].Type);
        Assert.False(accounts[0].IsLiability);
    }

    private async Task ClearDatabase()
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        db.AccountSnapshots.RemoveRange(db.AccountSnapshots);
        db.Accounts.RemoveRange(db.Accounts);
        await db.SaveChangesAsync();
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

    private record AccountDto(Guid Id, string Name, string? Type, bool IsLiability);
}
