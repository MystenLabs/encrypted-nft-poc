-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "mnemomic" TEXT,
    "priv_key" TEXT,
    "pub_key" TEXT
);

-- CreateIndex
CREATE UNIQUE INDEX "User_id_key" ON "User"("id");
