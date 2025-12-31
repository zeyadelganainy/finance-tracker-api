using FinanceTracker.Auth;
using FinanceTracker.Data;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Authorization.Policy;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using System.Security.Claims;

namespace FinanceTracker.Tests;

public class CustomWebApplicationFactory : WebApplicationFactory<Program>
{
    private readonly string _databaseName;
    public const string TestUserId = "00000000-0000-0000-0000-000000000001";

    public CustomWebApplicationFactory()
    {
        // Create a truly unique database name using Guid only
        // This ensures complete isolation even across parallel test runs
        _databaseName = Guid.NewGuid().ToString("N");
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Test");

        builder.ConfigureServices(services =>
        {
            // Remove ALL existing DbContext-related registrations
            var descriptors = services.Where(d =>
                d.ServiceType == typeof(DbContextOptions) ||
                d.ServiceType == typeof(DbContextOptions<AppDbContext>) ||
                d.ServiceType == typeof(AppDbContext)).ToList();

            foreach (var descriptor in descriptors)
            {
                services.Remove(descriptor);
            }

            // Add in-memory database with truly unique name
            services.AddDbContext<AppDbContext>(options =>
            {
                options.UseInMemoryDatabase(_databaseName);
            });

            // Replace ICurrentUserContext with test mock
            services.RemoveAll<ICurrentUserContext>();
            services.AddScoped<ICurrentUserContext>(_ => new TestCurrentUserContext(TestUserId));

            // Bypass authorization in tests - this allows [Authorize] attributes to pass
            services.AddSingleton<IPolicyEvaluator, FakePolicyEvaluator>();

            // Replace the authentication configuration with test authentication
            services.PostConfigure<AuthenticationOptions>(options =>
            {
                options.DefaultAuthenticateScheme = "Test";
                options.DefaultChallengeScheme = "Test";
            });

            // Add test authentication scheme that always succeeds
            services.AddAuthentication("Test")
                .AddScheme<AuthenticationSchemeOptions, TestAuthHandler>("Test", options => { });
        });
    }
}

/// <summary>
/// Test implementation of ICurrentUserContext that returns a fixed test user ID
/// </summary>
public class TestCurrentUserContext : ICurrentUserContext
{
    public TestCurrentUserContext(string userId)
    {
        UserId = userId;
        Email = "test@example.com";
    }

    public string UserId { get; }
    public bool IsAuthenticated => true;
    public string? Email { get; }
}

/// <summary>
/// Fake policy evaluator that always authenticates in tests
/// </summary>
public class FakePolicyEvaluator : IPolicyEvaluator
{
    public Task<AuthenticateResult> AuthenticateAsync(AuthorizationPolicy policy, HttpContext context)
    {
        var claimsPrincipal = new ClaimsPrincipal();
        var identity = new ClaimsIdentity(new[]
        {
            new Claim(ClaimTypes.NameIdentifier, CustomWebApplicationFactory.TestUserId),
            new Claim("sub", CustomWebApplicationFactory.TestUserId),
            new Claim(ClaimTypes.Email, "test@example.com"),
            new Claim(ClaimTypes.Name, "Test User")
        }, "Test");
        
        claimsPrincipal.AddIdentity(identity);
        var ticket = new AuthenticationTicket(claimsPrincipal, "Test");
        var result = AuthenticateResult.Success(ticket);
        
        return Task.FromResult(result);
    }

    public Task<PolicyAuthorizationResult> AuthorizeAsync(
        AuthorizationPolicy policy,
        AuthenticateResult authenticationResult,
        HttpContext context,
        object? resource)
    {
        var result = PolicyAuthorizationResult.Success();
        return Task.FromResult(result);
    }
}

/// <summary>
/// Test authentication handler that always succeeds
/// </summary>
public class TestAuthHandler : AuthenticationHandler<AuthenticationSchemeOptions>
{
    public TestAuthHandler(
        Microsoft.Extensions.Options.IOptionsMonitor<AuthenticationSchemeOptions> options,
        Microsoft.Extensions.Logging.ILoggerFactory logger,
        System.Text.Encodings.Web.UrlEncoder encoder)
        : base(options, logger, encoder)
    {
    }

    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, CustomWebApplicationFactory.TestUserId),
            new Claim("sub", CustomWebApplicationFactory.TestUserId),
            new Claim(ClaimTypes.Email, "test@example.com"),
            new Claim(ClaimTypes.Name, "Test User")
        };
        
        var identity = new ClaimsIdentity(claims, "Test");
        var principal = new ClaimsPrincipal(identity);
        var ticket = new AuthenticationTicket(principal, "Test");

        return Task.FromResult(AuthenticateResult.Success(ticket));
    }
}