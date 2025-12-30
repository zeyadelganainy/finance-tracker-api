using System.Diagnostics;

namespace FinanceTracker.Middleware;

public class RequestLoggingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<RequestLoggingMiddleware> _logger;

    public RequestLoggingMiddleware(RequestDelegate next, ILogger<RequestLoggingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var stopwatch = Stopwatch.StartNew();
        
        try
        {
            await _next(context);
        }
        finally
        {
            stopwatch.Stop();
            
            var method = context.Request.Method;
            var path = context.Request.Path;
            var statusCode = context.Response.StatusCode;
            var elapsed = stopwatch.ElapsedMilliseconds;
            var traceId = context.TraceIdentifier;

            _logger.LogInformation(
                "HTTP {Method} {Path} => {StatusCode} in {Elapsed}ms TraceId={TraceId}",
                method, path, statusCode, elapsed, traceId);
        }
    }
}
