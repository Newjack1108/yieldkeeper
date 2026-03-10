-- CreateTable
CREATE TABLE "QuarterlyChecklist" (
    "id" TEXT NOT NULL,
    "tenancyId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "answers" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuarterlyChecklist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InspectionPreChecklist" (
    "id" TEXT NOT NULL,
    "inspectionId" TEXT NOT NULL,
    "tenancyId" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "answers" JSONB NOT NULL,

    CONSTRAINT "InspectionPreChecklist_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Inspection" ADD COLUMN "preChecklistToken" TEXT,
ADD COLUMN "preChecklistExpiresAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "QuarterlyChecklist_token_key" ON "QuarterlyChecklist"("token");

-- CreateIndex
CREATE INDEX "QuarterlyChecklist_tenancyId_idx" ON "QuarterlyChecklist"("tenancyId");

-- CreateIndex
CREATE INDEX "QuarterlyChecklist_token_idx" ON "QuarterlyChecklist"("token");

-- CreateIndex
CREATE UNIQUE INDEX "InspectionPreChecklist_inspectionId_key" ON "InspectionPreChecklist"("inspectionId");

-- CreateIndex
CREATE INDEX "InspectionPreChecklist_inspectionId_idx" ON "InspectionPreChecklist"("inspectionId");

-- CreateIndex
CREATE INDEX "InspectionPreChecklist_tenancyId_idx" ON "InspectionPreChecklist"("tenancyId");

-- CreateIndex
CREATE UNIQUE INDEX "Inspection_preChecklistToken_key" ON "Inspection"("preChecklistToken");

-- AddForeignKey
ALTER TABLE "QuarterlyChecklist" ADD CONSTRAINT "QuarterlyChecklist_tenancyId_fkey" FOREIGN KEY ("tenancyId") REFERENCES "Tenancy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InspectionPreChecklist" ADD CONSTRAINT "InspectionPreChecklist_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "Inspection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InspectionPreChecklist" ADD CONSTRAINT "InspectionPreChecklist_tenancyId_fkey" FOREIGN KEY ("tenancyId") REFERENCES "Tenancy"("id") ON DELETE CASCADE ON UPDATE CASCADE;
