using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FinanceTracker.Migrations
{
    /// <inheritdoc />
    public partial class AddUserIdForMultiTenancy : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Index might not exist if database was created after earlier migrations were squashed; drop conditionally to avoid failure.
            migrationBuilder.Sql("DROP INDEX IF EXISTS \"IX_Categories_Name\";");

            // Add UserId columns only if they do not already exist to keep this migration idempotent in partially applied databases.
            migrationBuilder.Sql(@"
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Transactions' AND column_name = 'UserId') THEN
        ALTER TABLE ""Transactions"" ADD COLUMN ""UserId"" uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Categories' AND column_name = 'UserId') THEN
        ALTER TABLE ""Categories"" ADD COLUMN ""UserId"" uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Assets' AND column_name = 'UserId') THEN
        ALTER TABLE ""Assets"" ADD COLUMN ""UserId"" uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'AccountSnapshots' AND column_name = 'UserId') THEN
        ALTER TABLE ""AccountSnapshots"" ADD COLUMN ""UserId"" uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Accounts' AND column_name = 'UserId') THEN
        ALTER TABLE ""Accounts"" ADD COLUMN ""UserId"" uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000';
    END IF;
END;
$$;
");

            // Create indexes only if they do not already exist (idempotent for partially applied DBs)
            migrationBuilder.Sql(@"
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'IX_Transactions_UserId') THEN
        CREATE INDEX ""IX_Transactions_UserId"" ON ""Transactions"" (""UserId"");
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'IX_Categories_UserId') THEN
        CREATE INDEX ""IX_Categories_UserId"" ON ""Categories"" (""UserId"");
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'IX_Categories_UserId_Name') THEN
        CREATE UNIQUE INDEX ""IX_Categories_UserId_Name"" ON ""Categories"" (""UserId"", ""Name"");
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'IX_Assets_UserId') THEN
        CREATE INDEX ""IX_Assets_UserId"" ON ""Assets"" (""UserId"");
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'IX_AccountSnapshots_UserId') THEN
        CREATE INDEX ""IX_AccountSnapshots_UserId"" ON ""AccountSnapshots"" (""UserId"");
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'IX_Accounts_UserId') THEN
        CREATE INDEX ""IX_Accounts_UserId"" ON ""Accounts"" (""UserId"");
    END IF;
END;
$$;
");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Transactions_UserId",
                table: "Transactions");

            migrationBuilder.DropIndex(
                name: "IX_Categories_UserId",
                table: "Categories");

            migrationBuilder.DropIndex(
                name: "IX_Categories_UserId_Name",
                table: "Categories");

            migrationBuilder.DropIndex(
                name: "IX_Assets_UserId",
                table: "Assets");

            migrationBuilder.DropIndex(
                name: "IX_AccountSnapshots_UserId",
                table: "AccountSnapshots");

            migrationBuilder.DropIndex(
                name: "IX_Accounts_UserId",
                table: "Accounts");

            migrationBuilder.DropColumn(
                name: "UserId",
                table: "Transactions");

            migrationBuilder.DropColumn(
                name: "UserId",
                table: "Categories");

            migrationBuilder.DropColumn(
                name: "UserId",
                table: "Assets");

            migrationBuilder.DropColumn(
                name: "UserId",
                table: "AccountSnapshots");

            migrationBuilder.DropColumn(
                name: "UserId",
                table: "Accounts");

            migrationBuilder.CreateIndex(
                name: "IX_Categories_Name",
                table: "Categories",
                column: "Name",
                unique: true);
        }
    }
}
