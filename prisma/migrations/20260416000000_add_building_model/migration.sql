-- CreateTable: Building
CREATE TABLE "Building" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'PT',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Building_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- AlterTable: Add buildingId to Property
ALTER TABLE "Property" ADD COLUMN "buildingId" TEXT;

-- AddForeignKey
-- Note: SQLite does not support ADD CONSTRAINT for foreign keys after table creation.
-- The foreign key is enforced at the application/Prisma level.

-- CreateIndex
CREATE INDEX "Building_userId_idx" ON "Building"("userId");
CREATE INDEX "Property_buildingId_idx" ON "Property"("buildingId");
