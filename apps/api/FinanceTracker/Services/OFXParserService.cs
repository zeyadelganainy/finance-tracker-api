using System.Globalization;

namespace FinanceTracker.Services;

public class OfxImportTransactionRow
{
    public DateOnly Date { get; set; }
    public decimal Amount { get; set; }
    public string? Description { get; set; }
    public string? Payee { get; set; }
    public string? Memo { get; set; }
}

public interface IOFXParserService
{
    Task<List<OfxImportTransactionRow>> ParseOFXAsync(Stream fileStream);
}

public class OFXParserService : IOFXParserService
{
    public async Task<List<OfxImportTransactionRow>> ParseOFXAsync(Stream fileStream)
    {
        using var reader = new StreamReader(fileStream);
        var content = await reader.ReadToEndAsync();

        // Parser dependency not available; return an empty list for now
        var transactions = new List<OfxImportTransactionRow>();
        return transactions;
    }

    private static string? CleanDescription(string? input)
    {
        if (string.IsNullOrWhiteSpace(input))
            return null;

        // Remove extra whitespace and normalize
        return System.Text.RegularExpressions.Regex.Replace(input, @"\s+", " ").Trim();
    }
}
