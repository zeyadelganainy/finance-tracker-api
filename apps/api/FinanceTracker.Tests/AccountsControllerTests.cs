using System.Net;
using System.Net.Http.Json;
using FinanceTracker.Api.Models;
using FinanceTracker.Data;
using Microsoft.EntityFrameworkCore;
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
        var request = new { Name = "Checking Account", Institution = "Chase", Type = "bank", Currency = "USD", IsLiability = false };

        // Act
        var response = await _client.PostAsJsonAsync("/accounts", request);

        // Assert
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var account = await response.Content.ReadFromJsonAsync<AccountDto>();
        Assert.NotNull(account);
        Assert.NotEqual(Guid.Empty, account.Id);
        Assert.Equal("Checking Account", account.Name);
        Assert.Equal("Chase", account.Institution);
        Assert.Equal("bank", account.Type);
        Assert.Equal("USD", account.Currency);
        Assert.False(account.IsLiability);
        Assert.Equal($"/accounts/{account.Id}", response.Headers.Location?.ToString());
    }

    [Fact]
    public async Task CreateAccount_WithMinimalData_ReturnsCreated()
    {
        // Arrange
        await ClearDatabase();
        var request = new { Name = "Cash", Type = (string?)null, Currency = "USD", IsLiability = false };

        // Act
        var response = await _client.PostAsJsonAsync("/accounts", request);

        // Assert
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var account = await response.Content.ReadFromJsonAsync<AccountDto>();
        Assert.NotNull(account);
        Assert.Equal("Cash", account.Name);
        Assert.Null(account.Type);
        Assert.Equal("USD", account.Currency);
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
        Assert.Contains("Name field is required", error);
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
        Assert.Contains("Name", error);
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
    public async Task GetAccountById_WithValidId_ReturnsAccountDetail()
    {
        // Arrange
        await ClearDatabase();
        var accountId = await SeedAccount("Savings", "Chase", "bank", "USD", false);
        await SeedSnapshot(accountId, new DateOnly(2025, 1, 1), 1000m);
        await SeedSnapshot(accountId, new DateOnly(2025, 1, 15), 1500m);

        // Act
        var response = await _client.GetAsync($"/accounts/{accountId}");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var account = await response.Content.ReadFromJsonAsync<AccountDetailDto>();
        Assert.NotNull(account);
        Assert.Equal(accountId, account.Id);
        Assert.Equal("Savings", account.Name);
        Assert.Equal("Chase", account.Institution);
        Assert.Equal(1500m, account.LatestBalance);
        Assert.Equal(new DateOnly(2025, 1, 15), account.LatestBalanceDate);
        Assert.Equal(2, account.SnapshotCount);
    }

    [Fact]
    public async Task GetAccountById_WithNoSnapshots_ReturnsNullBalance()
    {
        // Arrange
        await ClearDatabase();
        var accountId = await SeedAccount("Empty Account", null, "bank", "USD", false);

        // Act
        var response = await _client.GetAsync($"/accounts/{accountId}");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var account = await response.Content.ReadFromJsonAsync<AccountDetailDto>();
        Assert.NotNull(account);
        Assert.Null(account.LatestBalance);
        Assert.Null(account.LatestBalanceDate);
        Assert.Equal(0, account.SnapshotCount);
    }

    [Fact]
    public async Task GetAccountById_WithInvalidId_ReturnsNotFound()
    {
        // Arrange
        await ClearDatabase();

        // Act
        var response = await _client.GetAsync($"/accounts/{Guid.NewGuid()}");

        // Assert
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task UpdateAccount_WithValidData_ReturnsOk()
    {
        // Arrange
        await ClearDatabase();
        var accountId = await SeedAccount("Old Name", "Old Bank", "bank", "USD", false);
        var updateRequest = new { Name = "New Name", Institution = "New Bank", Type = "savings", Currency = "EUR" };

        // Act
        var response = await _client.PatchAsJsonAsync($"/accounts/{accountId}", updateRequest);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var account = await response.Content.ReadFromJsonAsync<AccountDto>();
        Assert.NotNull(account);
        Assert.Equal("New Name", account.Name);
        Assert.Equal("New Bank", account.Institution);
        Assert.Equal("savings", account.Type);
        Assert.Equal("EUR", account.Currency);
    }

    [Fact]
    public async Task UpdateAccount_WithInvalidId_ReturnsNotFound()
    {
        // Arrange
        await ClearDatabase();
        var updateRequest = new { Name = "Test", Institution = (string?)null, Type = "bank", Currency = "USD" };

        // Act
        var response = await _client.PatchAsJsonAsync($"/accounts/{Guid.NewGuid()}", updateRequest);

        // Assert
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task UpdateAccount_WithEmptyName_ReturnsBadRequest()
    {
        // Arrange
        await ClearDatabase();
        var accountId = await SeedAccount("Test", null, "bank", "USD", false);
        var updateRequest = new { Name = "", Institution = (string?)null, Type = "bank", Currency = "USD" };

        // Act
        var response = await _client.PatchAsJsonAsync($"/accounts/{accountId}", updateRequest);

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task DeleteAccount_WithValidId_ReturnsNoContent()
    {
        // Arrange
        await ClearDatabase();
        var accountId = await SeedAccount("To Delete", null, "bank", "USD", false);

        // Act
        var response = await _client.DeleteAsync($"/accounts/{accountId}");

        // Assert
        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);

        // Verify deletion
        var getResponse = await _client.GetAsync($"/accounts/{accountId}");
        Assert.Equal(HttpStatusCode.NotFound, getResponse.StatusCode);
    }

    [Fact]
    public async Task DeleteAccount_WithSnapshots_CascadesDelete()
    {
        // Arrange
        await ClearDatabase();
        var accountId = await SeedAccount("With Snapshots", null, "bank", "USD", false);
        await SeedSnapshot(accountId, new DateOnly(2025, 1, 1), 1000m);
        await SeedSnapshot(accountId, new DateOnly(2025, 1, 15), 1500m);

        // Act
        var response = await _client.DeleteAsync($"/accounts/{accountId}");

        // Assert
        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);

        // Verify snapshots were also deleted
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var snapshots = await db.AccountSnapshots.Where(s => s.AccountId == accountId).ToListAsync();
        Assert.Empty(snapshots);
    }

    [Fact]
    public async Task DeleteAccount_WithInvalidId_ReturnsNotFound()
    {
        // Arrange
        await ClearDatabase();

        // Act
        var response = await _client.DeleteAsync($"/accounts/{Guid.NewGuid()}");

        // Assert
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
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
        await SeedAccount("Savings", "Chase", "bank", "USD", false);
        await SeedAccount("Credit Card", "Visa", "credit", "USD", true);
        await SeedAccount("Cash", null, null, "USD", false);

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

    private async Task ClearDatabase()
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        db.AccountSnapshots.RemoveRange(db.AccountSnapshots);
        db.Accounts.RemoveRange(db.Accounts);
        db.Assets.RemoveRange(db.Assets);
        await db.SaveChangesAsync();
    }

    private async Task<Guid> SeedAccount(string name, string? institution, string? type, string currency, bool isLiability)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var account = new Account
        {
            Name = name,
            Institution = institution,
            Type = type,
            Currency = currency,
            IsLiability = isLiability
        };
        db.Accounts.Add(account);
        await db.SaveChangesAsync();
        return account.Id;
    }

    private async Task SeedSnapshot(Guid accountId, DateOnly date, decimal balance)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var snapshot = new AccountSnapshot
        {
            AccountId = accountId,
            Date = date,
            Balance = balance
        };
        db.AccountSnapshots.Add(snapshot);
        await db.SaveChangesAsync();
    }

    private record AccountDto(Guid Id, string Name, string? Institution, string? Type, string Currency, bool IsLiability, DateTime CreatedAt, DateTime UpdatedAt);
    private record AccountDetailDto(Guid Id, string Name, string? Institution, string? Type, string Currency, bool IsLiability, DateTime CreatedAt, DateTime UpdatedAt, decimal? LatestBalance, DateOnly? LatestBalanceDate, int SnapshotCount);
}
