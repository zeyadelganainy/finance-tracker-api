START TRANSACTION;
ALTER TABLE "Transactions" DROP CONSTRAINT "FK_Transactions_Categories_CategoryId";

CREATE INDEX "IX_Transactions_Date" ON "Transactions" ("Date");

CREATE INDEX "IX_Transactions_Date_CategoryId" ON "Transactions" ("Date", "CategoryId");

CREATE UNIQUE INDEX "IX_Categories_Name" ON "Categories" ("Name");

CREATE INDEX "IX_AccountSnapshots_Date" ON "AccountSnapshots" ("Date");

ALTER TABLE "Transactions" ADD CONSTRAINT "FK_Transactions_Categories_CategoryId" FOREIGN KEY ("CategoryId") REFERENCES "Categories" ("Id") ON DELETE RESTRICT;

INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
VALUES ('20251229080929_AddIndexesAndConstraints', '9.0.1');

COMMIT;

