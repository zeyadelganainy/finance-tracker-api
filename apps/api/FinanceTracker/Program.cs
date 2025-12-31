using FinanceTracker.Auth;
using FinanceTracker.Contracts.Common;
using FinanceTracker.Data;
using FinanceTracker.Middleware;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Scalar.AspNetCore;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// Configure Auth settings
var authConfig = builder.Configuration.GetSection(AuthConfiguration.SectionName).Get<AuthConfiguration>()
    ?? throw new InvalidOperationException("Auth configuration is missing");

// Validate required auth configuration
if (string.IsNullOrEmpty(authConfig.Secret))
{
    throw new InvalidOperationException("Auth:Secret is required. Set it via environment variable or appsettings.");
}

// Configure JWT Bearer Authentication
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = authConfig.Issuer,
        ValidAudience = authConfig.Audience,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(authConfig.Secret)),
        ClockSkew = TimeSpan.FromMinutes(5) // Allow 5 minute clock skew
    };

    // Map JWT claims to ClaimTypes
    options.MapInboundClaims = false; // Keep original claim names

    options.Events = new JwtBearerEvents
    {
        OnAuthenticationFailed = context =>
        {
            if (context.Exception.GetType() == typeof(SecurityTokenExpiredException))
            {
                context.Response.Headers.Append("Token-Expired", "true");
            }
            return Task.CompletedTask;
        }
    };
});

builder.Services.AddAuthorization();

// Register auth configuration and current user context
builder.Services.Configure<AuthConfiguration>(builder.Configuration.GetSection(AuthConfiguration.SectionName));
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ICurrentUserContext, CurrentUserContext>();

// Configure CORS policy for frontend
var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() 
    ?? Array.Empty<string>();

builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy =>
    {
        policy.WithOrigins(allowedOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

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

// Apply CORS policy globally
app.UseCors("Frontend");

// Request logging middleware (logs all requests)
app.UseMiddleware<RequestLoggingMiddleware>();

// Authentication & Authorization middleware (MUST be before exception handling for proper 401/403)
app.UseAuthentication();
app.UseAuthorization();

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
