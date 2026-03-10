-- CreateTable
CREATE TABLE "TenancyOccupant" (
    "id" TEXT NOT NULL,
    "tenancyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "relationship" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "notes" TEXT,

    CONSTRAINT "TenancyOccupant_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TenancyOccupant_tenancyId_idx" ON "TenancyOccupant"("tenancyId");

ALTER TABLE "TenancyOccupant" ADD CONSTRAINT "TenancyOccupant_tenancyId_fkey" FOREIGN KEY ("tenancyId") REFERENCES "Tenancy"("id") ON DELETE CASCADE ON UPDATE CASCADE;
