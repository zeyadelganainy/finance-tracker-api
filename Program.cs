using FinanceTracker.Data;
using Microsoft.EntityFrameworkCore;
using Scalar.AspNetCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();

// .NET 9 built-in OpenAPI document
builder.Services.AddOpenApi();

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("Default")));

var app = builder.Build();

app.MapControllers();

// Serves OpenAPI JSON at /openapi/v1.json
app.MapOpenApi();

// Interactive docs UI at /scalar
app.MapScalarApiReference();

app.Run();

public partial class Program { }
