# Finance Tracker API - Production Dockerfile for AWS App Runner
# Multi-stage build optimized for .NET 9 Web API

# ============================================================================
# BUILD STAGE - Compile and publish the application
# ============================================================================
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

# Copy project files and restore dependencies
# Separate layer for better caching - dependencies change less frequently
COPY ["FinanceTracker/FinanceTracker.csproj", "FinanceTracker/"]
RUN dotnet restore "FinanceTracker/FinanceTracker.csproj"

# Copy all source code
COPY . .

# Build and publish in Release configuration
# --no-restore: Skip restore since we already did it
# -c Release: Optimize for production
# -o /app/publish: Output to specific directory
WORKDIR "/src/FinanceTracker"
RUN dotnet publish "FinanceTracker.csproj" -c Release -o /app/publish --no-restore

# ============================================================================
# RUNTIME STAGE - Minimal image with only runtime dependencies
# ============================================================================
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS runtime
WORKDIR /app

# Create non-root user for security best practices
# AWS App Runner runs as non-root by default, this ensures compatibility
RUN groupadd -r appuser && useradd -r -g appuser appuser

# Copy published application from build stage
COPY --from=build /app/publish .

# Change ownership to non-root user
RUN chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

# ============================================================================
# CONFIGURATION
# ============================================================================

# AWS App Runner requires applications to listen on port 8080
# ASP.NET Core binds to http://+:8080 (all network interfaces)
ENV ASPNETCORE_URLS=http://+:8080
ENV ASPNETCORE_ENVIRONMENT=Production

# Expose port 8080 for AWS App Runner
EXPOSE 8080

# Health check for local testing (AWS App Runner uses HTTP health checks)
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

# ============================================================================
# ENTRYPOINT
# ============================================================================

# Start the Finance Tracker API
# Use FinanceTracker.dll as the entry point
ENTRYPOINT ["dotnet", "FinanceTracker.dll"]
