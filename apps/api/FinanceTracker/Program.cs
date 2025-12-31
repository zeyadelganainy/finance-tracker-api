using FinanceTracker.Auth;
using FinanceTracker.Contracts.Common;
using FinanceTracker.Data;
using FinanceTracker.Middleware;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Scalar.AspNetCore;

var builder = WebApplication.CreateBuilder(args);

// Configure Auth settings
var authConfig = builder.Configuration.GetSection(AuthConfiguration.SectionName).Get<AuthConfiguration>()
    ?? throw new InvalidOperationException("Auth configuration is missing");

// Validate required auth configuration
if (string.IsNullOrEmpty(authConfig.Issuer))
{
    throw new InvalidOperationException("Auth:Issuer is required. Set SUPABASE_JWT_ISSUER environment variable or appsettings.");
}

// Configure JWT Bearer Authentication with Supabase JWKS
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    // Set Authority to Supabase Auth issuer - enables automatic JWKS discovery
    options.Authority = authConfig.Issuer;

    // JWKS endpoint will be discovered at: {Authority}/.well-known/openid-configuration
    // Supabase exposes keys at: https://<project>.supabase.co/auth/v1/.well-known/jwks.json
    options.RequireHttpsMetadata = true; // Enforce HTTPS for JWKS endpoint

    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidIssuer = authConfig.Issuer,
        
        ValidateAudience = true,
        ValidAudience = authConfig.Audience,
        
        ValidateLifetime = true,
        ClockSkew = TimeSpan.FromMinutes(5), // Allow 5 minute clock skew
        
        ValidateIssuerSigningKey = true,
        // Signing keys are automatically fetched from JWKS endpoint via Authority
        // ASP.NET Core caches keys and refreshes them periodically
        
        // Map 'sub' claim to NameIdentifier for consistency
        NameClaimType = "sub",
        RoleClaimType = "role"
    };

    // Keep original claim names (don't map to Microsoft schema)
    options.MapInboundClaims = false;

    options.Events = new JwtBearerEvents
    {
        OnAuthenticationFailed = context =>
        {
            if (context.Exception.GetType() == typeof(SecurityTokenExpiredException))
            {
                context.Response.Headers.Append("Token-Expired", "true");
            }
            return Task.CompletedTask;
        },
        OnTokenValidated = context =>
        {
            // Optional: Log successful authentication for debugging
            var userId = context.Principal?.FindFirst("sub")?.Value;
            var logger = context.HttpContext.RequestServices.GetRequiredService<ILogger<Program>>();
            logger.LogDebug("JWT validated successfully for user: {UserId}", userId);
            return Task.CompletedTask;
        }
    };
});

builder.Services.AddAuthorization();

// Register auth configuration and current user context
builder.Services.Configure<AuthConfiguration>(builder.Configuration.GetSection(AuthConfiguration.SectionName));
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ICurrentUserContext, CurrentUserContext>();

// ========================================
// CORS Configuration
// ========================================
// Priority: CORS_ALLOWED_ORIGINS environment variable > appsettings.json
// Example: CORS_ALLOWED_ORIGINS=https://wealthwise-sable.vercel.app,http://localhost:5173
var corsOriginsEnv = builder.Configuration["CORS_ALLOWED_ORIGINS"];
string[] allowedOrigins;

if (!string.IsNullOrWhiteSpace(corsOriginsEnv))
{
    // Parse comma-separated list from environment variable
    allowedOrigins = corsOriginsEnv
        .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
        .Where(origin => !string.IsNullOrWhiteSpace(origin))
        .ToArray();
}
else
{
    // Fallback to appsettings.json
    allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() 
        ?? Array.Empty<string>();
}

// Security: Reject wildcard origin in production
if (builder.Environment.IsProduction() && (allowedOrigins.Contains("*") || allowedOrigins.Length == 0))
{
    throw new InvalidOperationException(
        "Production requires explicit CORS origins. " +
        "Set CORS_ALLOWED_ORIGINS environment variable in App Runner with comma-separated origins. " +
        "Example: https://wealthwise-sable.vercel.app,http://localhost:5173");
}

// Log configured origins for debugging
var logger = LoggerFactory.Create(config => config.AddConsole()).CreateLogger<Program>();
logger.LogInformation("CORS configured with {Count} allowed origin(s): {Origins}", 
    allowedOrigins.Length, 
    string.Join(", ", allowedOrigins));

builder.Services.AddCors(options =>
{
    options.AddPolicy("CorsPolicy", policy =>
    {
        if (allowedOrigins.Length > 0)
        {
            policy.WithOrigins(allowedOrigins)
                  .WithHeaders("Authorization", "Content-Type")
                  .WithMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS");
            // Do NOT call AllowCredentials() - not using cookies, only Authorization header
        }
        else
        {
            // No origins configured - block all cross-origin requests (secure default)
            logger.LogWarning("No CORS origins configured. All cross-origin requests will be blocked.");
        }
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

// ========================================
// Middleware Pipeline - CORRECT ORDER
// ========================================
// 1. Routing (required for endpoint routing)
app.UseRouting();

// 2. CORS (must be after UseRouting and before UseAuthentication)
//    Handles preflight OPTIONS requests before authentication
app.UseCors("CorsPolicy");

// 3. Request logging (logs all requests including OPTIONS)
app.UseMiddleware<RequestLoggingMiddleware>();

// 4. Authentication (validates JWT tokens)
app.UseAuthentication();

// 5. Authorization (checks [Authorize] attributes)
app.UseAuthorization();

// 6. Exception handling (AFTER auth for proper 401/403 responses)
app.UseMiddleware<ExceptionHandlingMiddleware>();

// 7. Map controllers (endpoint execution)
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
