using FinanceTracker.Data;
using Microsoft.AspNetCore.Mvc;

namespace FinanceTracker.Api.Controllers;

[ApiController]
[Route("health")]
public class HealthController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ILogger<HealthController> _logger;

    public HealthController(AppDbContext db, ILogger<HealthController> logger)
    {
        _db = db;
        _logger = logger;
    }

    // GET /health - Liveness probe
    [HttpGet]
    public IActionResult GetHealth()
    {
        return Ok(new { status = "ok" });
    }

    // GET /health/ready - Readiness probe
    [HttpGet("ready")]
    public async Task<IActionResult> GetReadiness()
    {
        try
        {
            var canConnect = await _db.Database.CanConnectAsync();
            
            if (canConnect)
            {
                return Ok(new { status = "ready" });
            }
            
            _logger.LogWarning("Database connection check failed - cannot connect");
            return StatusCode(503, new { status = "not_ready" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Database readiness check failed");
            return StatusCode(503, new { status = "not_ready" });
        }
    }
}
