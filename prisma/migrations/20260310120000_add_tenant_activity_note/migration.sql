-- CreateTable
CREATE TABLE "TenantActivityNote" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "type" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TenantActivityNote_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TenantActivityNote_tenantId_idx" ON "TenantActivityNote"("tenantId");

ALTER TABLE "TenantActivityNote" ADD CONSTRAINT "TenantActivityNote_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TenantActivityNote" ADD CONSTRAINT "TenantActivityNote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
