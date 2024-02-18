/*
  Warnings:

  - Made the column `priv_key` on table `User` required. This step will fail if there are existing NULL values in that column.
  - Made the column `pub_key` on table `User` required. This step will fail if there are existing NULL values in that column.

*/
-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "mnemomic" TEXT,
    "priv_key" TEXT NOT NULL,
    "pub_key" TEXT NOT NULL
);
INSERT INTO "new_User" ("id", "mnemomic", "priv_key", "pub_key") SELECT "id", "mnemomic", "priv_key", "pub_key" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_id_key" ON "User"("id");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
