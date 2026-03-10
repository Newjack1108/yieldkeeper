-- CreateTable
CREATE TABLE "LandlordCompany" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "registrationNumber" TEXT NOT NULL,
    "address" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LandlordCompany_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Property" ADD COLUMN "ownershipType" TEXT NOT NULL DEFAULT 'sole',
ADD COLUMN "landlordCompanyId" TEXT;

-- CreateIndex
CREATE INDEX "LandlordCompany_userId_idx" ON "LandlordCompany"("userId");

-- CreateIndex
CREATE INDEX "Property_landlordCompanyId_idx" ON "Property"("landlordCompanyId");

-- AddForeignKey
ALTER TABLE "LandlordCompany" ADD CONSTRAINT "LandlordCompany_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Property" ADD CONSTRAINT "Property_landlordCompanyId_fkey" FOREIGN KEY ("landlordCompanyId") REFERENCES "LandlordCompany"("id") ON DELETE SET NULL ON UPDATE CASCADE;
