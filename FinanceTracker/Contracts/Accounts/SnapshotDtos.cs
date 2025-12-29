using System.ComponentModel.DataAnnotations;

namespace FinanceTracker.Contracts.Accounts;

public record UpsertSnapshotRequest(
    [Range(typeof(decimal), "-1000000000", "1000000000")]
    decimal Balance
);

public record SnapshotResponse(
    Guid Id,
    Guid AccountId,
    string Date,
    decimal Balance
);
