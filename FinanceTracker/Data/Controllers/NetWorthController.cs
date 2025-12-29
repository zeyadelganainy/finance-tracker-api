using FinanceTracker.Contracts.NetWorth;
using FinanceTracker.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FinanceTracker.Api.Controllers;

[ApiController]
public class NetWorthController : ControllerBase
{
    private readonly AppDbContext _db;

    public NetWorthController(AppDbContext db) => _db = db;

    [HttpGet("/net-worth")]
    public async Task<IActionResult> Get([FromQuery] DateOnly from, [FromQuery] DateOnly to, [FromQuery] string interval = "month")
    {
        if (to < from) throw new ArgumentException("to must be >= from");

        // Load snapshots in range with account info
        var rows = await _db.AccountSnapshots
            .AsNoTracking()
            .Where(s => s.Date >= from && s.Date <= to)
            .Select(s => new
            {
                s.AccountId,
                s.Date,
                s.Balance,
                IsLiability = s.Account.IsLiability
            })
            .ToListAsync();

        DateOnly BucketStart(DateOnly d)
        {
            interval = interval.ToLowerInvariant();
            if (interval == "day") return d;

            if (interval == "week")
            {
                // ISO-ish: bucket by Monday
                var dow = (int)d.DayOfWeek; // Sunday=0
                var mondayOffset = (dow == 0) ? 6 : dow - 1;
                return d.AddDays(-mondayOffset);
            }

            // month default
            return new DateOnly(d.Year, d.Month, 1);
        }

        // Latest snapshot per (bucket, account)
        var latestPerAccountBucket = rows
            .GroupBy(r => new { Bucket = BucketStart(r.Date), r.AccountId })
            .Select(g => g.OrderByDescending(x => x.Date).First())
            .ToList();

        var points = latestPerAccountBucket
            .GroupBy(x => BucketStart(x.Date))
            .Select(g => new NetWorthPoint(
                g.Key.ToString("yyyy-MM-dd"),
                g.Sum(x => x.IsLiability ? -x.Balance : x.Balance)
            ))
            .OrderBy(x => x.Date)
            .ToList();

        return Ok(points);
    }
}
