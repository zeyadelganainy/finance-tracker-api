using FinanceTracker.Data;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace FinanceTracker.Tests;

public class CustomWebApplicationFactory : WebApplicationFactory<Program>
{
    private readonly string _databaseName;

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
        });
    }
}