using System.Globalization;
using OFXParser;

namespace FinanceTracker.Services;

public class ImportTransactionRow
{
    public DateOnly Date { get; set; }
    public decimal Amount { get; set; }
    public string? Description { get; set; }
    public string? Payee { get; set; }
    public string? Memo { get; set; }
}

public interface IOFXParserService
{
    Task<List<ImportTransactionRow>> ParseOFXAsync(Stream fileStream);
}

public class OFXParserService : IOFXParserService
{
    public async Task<List<ImportTransactionRow>> ParseOFXAsync(Stream fileStream)
    {
        try
        {
            using var reader = new StreamReader(fileStream);
            var content = await reader.ReadToEndAsync();

            // Parse OFX file
            var doc = OFXDocument.Parse(content);

            var transactions = new List<ImportTransactionRow>();

            // Extract transactions from OFX document
            if (doc.BankTransactionLists != null)
            {
                foreach (var list in doc.BankTransactionLists)
                {
                    if (list.Transactions != null)
                    {
                        foreach (var txn in list.Transactions)
                        {
                            var row = new ImportTransactionRow
                            {
                                Date = DateOnly.FromDateTime(txn.DatePosted),
                                Amount = txn.Amount,
                                Description = CleanDescription(txn.Name),
                                Payee = txn.Payee,
                                Memo = txn.Memo
                            };
                            transactions.Add(row);
                        }
                    }
                }
            }

            // Also check credit card transactions
            if (doc.CreditCardTransactionLists != null)
            {
                foreach (var list in doc.CreditCardTransactionLists)
                {
                    if (list.Transactions != null)
                    {
                        foreach (var txn in list.Transactions)
                        {
                            var row = new ImportTransactionRow
                            {
                                Date = DateOnly.FromDateTime(txn.DatePosted),
                                Amount = txn.Amount,
                                Description = CleanDescription(txn.Name),
                                Payee = txn.Payee,
                                Memo = txn.Memo
                            };
                            transactions.Add(row);
                        }
                    }
                }
            }

            // Sort by date ascending
            return transactions.OrderBy(t => t.Date).ToList();
        }
        catch (Exception ex)
        {
            throw new InvalidOperationException($"Failed to parse OFX file: {ex.Message}", ex);
        }
    }

    private static string? CleanDescription(string? input)
    {
        if (string.IsNullOrWhiteSpace(input))
            return null;

        // Remove extra whitespace and normalize
        return System.Text.RegularExpressions.Regex.Replace(input, @"\s+", " ").Trim();
    }
}
