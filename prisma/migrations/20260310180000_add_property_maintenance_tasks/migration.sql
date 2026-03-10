-- CreateTable
CREATE TABLE "PropertyMaintenanceTask" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "taskType" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PropertyMaintenanceTask_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "MaintenanceRequest" ADD COLUMN "propertyMaintenanceTaskId" TEXT,
ADD COLUMN "quotedAmount" DECIMAL(12,2),
ADD COLUMN "quotedAt" TIMESTAMP(3),
ADD COLUMN "quotedById" TEXT,
ADD COLUMN "paymentStatus" TEXT NOT NULL DEFAULT 'none',
ADD COLUMN "stripePaymentIntentId" TEXT,
ADD COLUMN "tenantPaidAmount" DECIMAL(12,2);

-- CreateIndex
CREATE INDEX "PropertyMaintenanceTask_propertyId_idx" ON "PropertyMaintenanceTask"("propertyId");

-- CreateIndex
CREATE INDEX "MaintenanceRequest_propertyMaintenanceTaskId_idx" ON "MaintenanceRequest"("propertyMaintenanceTaskId");

-- AddForeignKey
ALTER TABLE "PropertyMaintenanceTask" ADD CONSTRAINT "PropertyMaintenanceTask_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceRequest" ADD CONSTRAINT "MaintenanceRequest_propertyMaintenanceTaskId_fkey" FOREIGN KEY ("propertyMaintenanceTaskId") REFERENCES "PropertyMaintenanceTask"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceRequest" ADD CONSTRAINT "MaintenanceRequest_quotedById_fkey" FOREIGN KEY ("quotedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
