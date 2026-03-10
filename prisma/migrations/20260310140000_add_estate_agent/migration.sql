-- CreateTable
CREATE TABLE "EstateAgent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "company" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EstateAgent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EstateAgent_userId_key" ON "EstateAgent"("userId");

-- CreateIndex
CREATE INDEX "EstateAgent_userId_idx" ON "EstateAgent"("userId");

-- CreateIndex
CREATE INDEX "EstateAgent_createdByUserId_idx" ON "EstateAgent"("createdByUserId");

-- AlterTable
ALTER TABLE "Property" ADD COLUMN "estateAgentId" TEXT;

-- CreateIndex
CREATE INDEX "Property_estateAgentId_idx" ON "Property"("estateAgentId");

-- AddForeignKey
ALTER TABLE "EstateAgent" ADD CONSTRAINT "EstateAgent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstateAgent" ADD CONSTRAINT "EstateAgent_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Property" ADD CONSTRAINT "Property_estateAgentId_fkey" FOREIGN KEY ("estateAgentId") REFERENCES "EstateAgent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
