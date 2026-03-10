-- CreateTable
CREATE TABLE "LettingAgent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "company" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "setupFee" DECIMAL(12,2),
    "managementFeeType" TEXT,
    "managementFeeValue" DECIMAL(12,2),
    "inventoryFee" DECIMAL(12,2),
    "renewalFee" DECIMAL(12,2),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LettingAgent_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Property" ADD COLUMN "lettingAgentId" TEXT,
ADD COLUMN "lettingAgentAssignedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "LettingAgent_userId_idx" ON "LettingAgent"("userId");

-- CreateIndex
CREATE INDEX "Property_lettingAgentId_idx" ON "Property"("lettingAgentId");

-- AddForeignKey
ALTER TABLE "LettingAgent" ADD CONSTRAINT "LettingAgent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Property" ADD CONSTRAINT "Property_lettingAgentId_fkey" FOREIGN KEY ("lettingAgentId") REFERENCES "LettingAgent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
