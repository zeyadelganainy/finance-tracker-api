namespace FinanceTracker.Contracts.NetWorth;

public record NetWorthPoint(
    string Date,
    decimal NetWorth
);

public record NetWorthHistoryResponse(
    string From,
    string To,
    string Interval,
    List<NetWorthPoint> DataPoints
);
