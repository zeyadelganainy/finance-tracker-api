using System.Net;
using System.Text.Json;
using FinanceTracker.Contracts.Common;

namespace FinanceTracker.Middleware;

public class ExceptionHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionHandlingMiddleware> _logger;

    public ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            await HandleExceptionAsync(context, ex);
        }
    }

    private async Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        var traceId = context.TraceIdentifier;
        var method = context.Request.Method;
        var path = context.Request.Path;

        // Log the exception with context
        _logger.LogError(
            exception,
            "Unhandled exception. TraceId: {TraceId}, Method: {Method}, Path: {Path}",
            traceId,
            method,
            path
        );

        // Map exception to HTTP status code
        var (statusCode, message) = MapException(exception);

        // Build error response
        var errorResponse = new ErrorResponse(message, traceId);

        // Set response details
        context.Response.ContentType = "application/json";
        context.Response.StatusCode = (int)statusCode;

        // Serialize and write response
        var json = JsonSerializer.Serialize(errorResponse, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        });

        await context.Response.WriteAsync(json);
    }

    private static (HttpStatusCode statusCode, string message) MapException(Exception exception)
    {
        return exception switch
        {
            ArgumentException => 
                (HttpStatusCode.BadRequest, exception.Message),
            
            InvalidOperationException => 
                (HttpStatusCode.Conflict, exception.Message),
            
            KeyNotFoundException => 
                (HttpStatusCode.NotFound, exception.Message),
            
            _ => 
                (HttpStatusCode.InternalServerError, "An unexpected error occurred. Please try again later.")
        };
    }
}
