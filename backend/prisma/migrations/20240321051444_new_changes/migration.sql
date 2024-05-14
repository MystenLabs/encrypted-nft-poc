/*
  Warnings:

  - You are about to drop the column `mnemomic` on the `User` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "priv_key" TEXT NOT NULL DEFAULT '',
    "pub_key" TEXT NOT NULL DEFAULT ''
);
INSERT INTO "new_User" ("id", "priv_key", "pub_key") SELECT "id", "priv_key", "pub_key" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_id_key" ON "User"("id");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
