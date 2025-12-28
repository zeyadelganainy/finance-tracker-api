//This is the "DB session" that EF uses to interact with the database

using FinanceTracker.Api.Models;
using FinanceTracker.Models;
using Microsoft.EntityFrameworkCore;

namespace FinanceTracker.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    
    // Represents the Categories table in the database, mapped to the Category model, enabling CRUD operations, queries, and data manipulation.
    public DbSet<Category> Categories =>  Set<Category>();
    public DbSet<Transaction> Transactions => Set<Transaction>();
    public DbSet<Account> Accounts => Set<Account>();
    public DbSet<AccountSnapshot> AccountSnapshots => Set<AccountSnapshot>();


    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<AccountSnapshot>(e =>
        {
            e.HasIndex(x => new { x.AccountId, x.Date }).IsUnique();
            e.Property(x => x.Balance).HasPrecision(18, 2);
        });
    }

}

