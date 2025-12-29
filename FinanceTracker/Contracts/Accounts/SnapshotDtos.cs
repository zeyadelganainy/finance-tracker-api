namespace FinanceTracker.Contracts.Accounts;

public record UpsertSnapshotRequest(
    decimal Balance
);

public record SnapshotResponse(
    Guid Id,
    Guid AccountId,
    string Date,
    decimal Balance
);
