//This is the "DB session" that EF uses to interact with the database

using FinanceTracker.Models;
using Microsoft.EntityFrameworkCore;

namespace FinanceTracker.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }
    
    // Represents the Categories table in the database, mapped to the Category model, enabling CRUD operations, queries, and data manipulation.
    public DbSet<Category> Categories =>  Set<Category>();
    public DbSet<Transaction> Transactions => Set<Transaction>();
}
