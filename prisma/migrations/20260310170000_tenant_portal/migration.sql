-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN "loginUserId" TEXT;

-- CreateTable
CREATE TABLE "TenantInvite" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TenantInvite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_loginUserId_key" ON "Tenant"("loginUserId");

-- CreateIndex
CREATE INDEX "Tenant_loginUserId_idx" ON "Tenant"("loginUserId");

-- CreateIndex
CREATE UNIQUE INDEX "TenantInvite_token_key" ON "TenantInvite"("token");

-- CreateIndex
CREATE INDEX "TenantInvite_tenantId_idx" ON "TenantInvite"("tenantId");

-- CreateIndex
CREATE INDEX "TenantInvite_token_idx" ON "TenantInvite"("token");

-- AddForeignKey
ALTER TABLE "Tenant" ADD CONSTRAINT "Tenant_loginUserId_fkey" FOREIGN KEY ("loginUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantInvite" ADD CONSTRAINT "TenantInvite_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
