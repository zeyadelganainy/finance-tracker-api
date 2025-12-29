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

        // Transaction indexes for performance
        modelBuilder.Entity<Transaction>(e =>
        {
            e.HasIndex(x => x.Date);
            e.HasIndex(x => x.CategoryId);
            e.HasIndex(x => new { x.Date, x.CategoryId });
            
            // Explicit delete behavior: restrict deletion if transactions exist
            e.HasOne(x => x.Category)
                .WithMany()
                .HasForeignKey(x => x.CategoryId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // Category uniqueness constraint
        modelBuilder.Entity<Category>(e =>
        {
            e.HasIndex(x => x.Name).IsUnique();
        });

        // AccountSnapshot constraints and indexes
        modelBuilder.Entity<AccountSnapshot>(e =>
        {
            e.HasIndex(x => new { x.AccountId, x.Date }).IsUnique();
            e.HasIndex(x => x.Date);
            e.Property(x => x.Balance).HasPrecision(18, 2);
            
            // Explicit delete behavior: cascade when account is deleted
            e.HasOne(x => x.Account)
                .WithMany(a => a.Snapshots)
                .HasForeignKey(x => x.AccountId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // Account property constraints
        modelBuilder.Entity<Account>(e =>
        {
            e.Property(x => x.Ticker).HasMaxLength(20);
            e.Property(x => x.AssetClass).HasMaxLength(30);
        });

    }

}

