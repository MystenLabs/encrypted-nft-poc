-- CreateTable
CREATE TABLE "Image" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ciphertext" TEXT NOT NULL,
    "encodedMasterKey" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    CONSTRAINT "Image_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "mnemomic" TEXT,
    "priv_key" TEXT,
    "pub_key" TEXT
);
INSERT INTO "new_User" ("id", "mnemomic", "priv_key", "pub_key") SELECT "id", "mnemomic", "priv_key", "pub_key" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_id_key" ON "User"("id");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;

-- CreateIndex
CREATE UNIQUE INDEX "Image_id_key" ON "Image"("id");
