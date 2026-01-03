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
    public DbSet<Asset> Assets => Set<Asset>();


    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Transaction indexes for performance
        modelBuilder.Entity<Transaction>(e =>
        {
            e.HasIndex(x => x.Date);
            e.HasIndex(x => x.CategoryId);
            e.HasIndex(x => new { x.Date, x.CategoryId });
            e.HasIndex(x => x.UserId); // Index for user data isolation
            
            // Explicit delete behavior: restrict deletion if transactions exist
            e.HasOne(x => x.Category)
                .WithMany()
                .HasForeignKey(x => x.CategoryId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // Category uniqueness constraint and indexes
        modelBuilder.Entity<Category>(e =>
        {
            // Unique constraint per user - each user can have their own categories
            e.HasIndex(x => new { x.UserId, x.Name }).IsUnique();
            e.HasIndex(x => x.UserId); // Index for user data isolation
            e.Property(x => x.Type).HasMaxLength(20);
        });

        // AccountSnapshot constraints and indexes
        modelBuilder.Entity<AccountSnapshot>(e =>
        {
            e.HasIndex(x => new { x.AccountId, x.Date }).IsUnique();
            e.HasIndex(x => x.Date);
            e.HasIndex(x => x.UserId); // Index for user data isolation
            e.Property(x => x.Balance).HasPrecision(18, 2);
            
            // Explicit delete behavior: cascade when account is deleted
            e.HasOne(x => x.Account)
                .WithMany(a => a.Snapshots)
                .HasForeignKey(x => x.AccountId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // Account property constraints and indexes
        modelBuilder.Entity<Account>(e =>
        {
            e.Property(x => x.Institution).HasMaxLength(100);
            e.Property(x => x.Currency).HasMaxLength(10).HasDefaultValue("USD");
            e.HasIndex(x => x.UserId); // Index for user data isolation
        });

        // Asset property constraints and indexes
        modelBuilder.Entity<Asset>(e =>
        {
            e.Property(x => x.Quantity).HasPrecision(18, 8);
            e.Property(x => x.CostBasisTotal).HasPrecision(18, 2);
            e.HasIndex(x => x.AssetClass);
            e.HasIndex(x => x.CreatedAt);
            e.HasIndex(x => x.UserId); // Index for user data isolation
        });
    }
}

