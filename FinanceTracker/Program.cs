using FinanceTracker.Contracts.Common;
using FinanceTracker.Data;
using FinanceTracker.Middleware;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Scalar.AspNetCore;

var builder = WebApplication.CreateBuilder(args);

// Configure model validation error responses
builder.Services.AddControllers()
    .ConfigureApiBehaviorOptions(options =>
    {
        options.InvalidModelStateResponseFactory = context =>
        {
            var errors = context.ModelState
                .Where(e => e.Value?.Errors.Count > 0)
                .SelectMany(e => e.Value!.Errors.Select(x => x.ErrorMessage))
                .ToList();

            var errorMessage = errors.Count > 0 
                ? string.Join(" ", errors)
                : "One or more validation errors occurred.";

            var errorResponse = new ErrorResponse(
                errorMessage,
                context.HttpContext.TraceIdentifier
            );

            return new BadRequestObjectResult(errorResponse);
        };
    });

// .NET 9 built-in OpenAPI document
builder.Services.AddOpenApi();

// Use in-memory database for Test and Development environments
// Use PostgreSQL only for Production
if (builder.Environment.IsProduction())
{
    builder.Services.AddDbContext<AppDbContext>(options =>
        options.UseNpgsql(builder.Configuration.GetConnectionString("Default")));
}
else if (builder.Environment.EnvironmentName != "Test")
{
    builder.Services.AddDbContext<AppDbContext>(options =>
        options.UseNpgsql(builder.Configuration.GetConnectionString("Default")));
}

var app = builder.Build();

// Request logging middleware (logs all requests)
app.UseMiddleware<RequestLoggingMiddleware>();

// Global exception handling middleware
app.UseMiddleware<ExceptionHandlingMiddleware>();

// Map controllers
app.MapControllers();

// Enable OpenAPI and Scalar UI only in Development
if (app.Environment.IsDevelopment())
{
    // Serves OpenAPI JSON at /openapi/v1.json
    app.MapOpenApi();

    // Interactive docs UI at /scalar
    app.MapScalarApiReference();
}

app.Run();

public partial class Program { }
