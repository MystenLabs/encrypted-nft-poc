-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "mnemomic" TEXT,
    "priv_key" TEXT NOT NULL DEFAULT '',
    "pub_key" TEXT NOT NULL DEFAULT ''
);
INSERT INTO "new_User" ("id", "mnemomic", "priv_key", "pub_key") SELECT "id", "mnemomic", "priv_key", "pub_key" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_id_key" ON "User"("id");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
