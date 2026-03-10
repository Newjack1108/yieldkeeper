import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hash } from "@node-rs/argon2";

const connectionString = process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL!;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const DEMO_USER_ID = "demo-user-seed-123";
const DEMO_PASSWORD = "password123";

async function main() {
  console.log("Seeding database...");

  const passwordHash = await hash(DEMO_PASSWORD, {
    memoryCost: 19456,
    timeCost: 2,
  });

  // Create demo user (email/password auth; sign in with demo@yieldkeeper.com / password123)
  const user = await prisma.user.upsert({
    where: { id: DEMO_USER_ID },
    update: { passwordHash },
    create: {
      id: DEMO_USER_ID,
      email: "demo@yieldkeeper.com",
      name: "Demo Landlord",
      passwordHash,
      role: "portfolio_owner",
    },
  });

  // Create portfolio
  const portfolio = await prisma.portfolio.upsert({
    where: { id: "demo-portfolio-1" },
    update: {},
    create: {
      id: "demo-portfolio-1",
      name: "Main Portfolio",
      userId: user.id,
    },
  });

  // Create properties
  const properties = await Promise.all([
    prisma.property.upsert({
      where: { id: "prop-1" },
      update: {},
      create: {
        id: "prop-1",
        portfolioId: portfolio.id,
        address: "12 Oak Street, London SW1 2AB",
        purchasePrice: 285000,
        purchaseDate: new Date("2020-06-15"),
        currentValue: 320000,
        propertyType: "flat",
        bedrooms: 2,
        occupancyStatus: "occupied",
        notes: "Ground floor flat with garden access",
      },
    }),
    prisma.property.upsert({
      where: { id: "prop-2" },
      update: {},
      create: {
        id: "prop-2",
        portfolioId: portfolio.id,
        address: "45 Maple Road, Birmingham B12 3CD",
        purchasePrice: 195000,
        purchaseDate: new Date("2021-03-22"),
        currentValue: 215000,
        propertyType: "house",
        bedrooms: 3,
        occupancyStatus: "occupied",
        notes: "End of terrace",
      },
    }),
    prisma.property.upsert({
      where: { id: "prop-3" },
      update: {},
      create: {
        id: "prop-3",
        portfolioId: portfolio.id,
        address: "7 Elm Close, Manchester M1 4EF",
        purchasePrice: 155000,
        purchaseDate: new Date("2022-09-10"),
        currentValue: 168000,
        propertyType: "flat",
        bedrooms: 1,
        occupancyStatus: "vacant",
        notes: "Recently refurbished",
      },
    }),
  ]);

  // Create mortgages
  await prisma.mortgage.upsert({
    where: { id: "mortgage-1" },
    update: {},
    create: {
      id: "mortgage-1",
      propertyId: properties[0].id,
      lender: "Nationwide",
      interestRate: 4.25,
      loanBalance: 185000,
      paymentAmount: 980,
      paymentFrequency: "monthly",
      nextPaymentDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1),
      fixedRateEndDate: new Date("2027-06-01"),
      termEndDate: new Date("2045-06-01"),
      notes: "5-year fixed",
    },
  });

  // Create insurance policies
  await Promise.all([
    prisma.insurancePolicy.upsert({
      where: { id: "ins-1" },
      update: {},
      create: {
        id: "ins-1",
        propertyId: properties[0].id,
        provider: "Direct Line",
        policyNumber: "DL-2024-123456",
        premium: 245,
        renewalDate: new Date(new Date().getFullYear() + 1, 2, 15),
        coverageNotes: "Buildings and contents",
      },
    }),
    prisma.insurancePolicy.upsert({
      where: { id: "ins-2" },
      update: {},
      create: {
        id: "ins-2",
        propertyId: properties[1].id,
        provider: "Aviva",
        policyNumber: "AV-2024-789012",
        premium: 189,
        renewalDate: new Date(new Date().getFullYear(), 8, 22),
        coverageNotes: "Buildings and contents",
      },
    }),
  ]);

  // Create tenants
  const tenants = await Promise.all([
    prisma.tenant.upsert({
      where: { id: "tenant-1" },
      update: {},
      create: {
        id: "tenant-1",
        userId: user.id,
        name: "Sarah Mitchell",
        email: "sarah.mitchell@email.com",
        phone: "+447700900123",
        emergencyContact: "John Mitchell - 07700900124",
        notes: "Long-term tenant",
      },
    }),
    prisma.tenant.upsert({
      where: { id: "tenant-2" },
      update: {},
      create: {
        id: "tenant-2",
        userId: user.id,
        name: "James Chen",
        email: "james.chen@email.com",
        phone: "+447700900125",
        emergencyContact: "Emily Chen - 07700900126",
        notes: "Moved in 2023",
      },
    }),
    prisma.tenant.upsert({
      where: { id: "tenant-3" },
      update: {},
      create: {
        id: "tenant-3",
        userId: user.id,
        name: "Emma Wilson",
        email: "emma.wilson@email.com",
        phone: "+447700900127",
        notes: "Previous tenant - moved out",
      },
    }),
  ]);

  // Create tenancies
  const tenancies = await Promise.all([
    prisma.tenancy.upsert({
      where: { id: "ten-1" },
      update: {},
      create: {
        id: "ten-1",
        propertyId: properties[0].id,
        tenantId: tenants[0].id,
        startDate: new Date("2022-01-15"),
        endDate: new Date("2025-01-14"),
        rentAmount: 950,
        rentFrequency: "monthly",
        depositAmount: 1900,
        depositScheme: "DPS",
        status: "active",
        notes: "Assured shorthold tenancy",
      },
    }),
    prisma.tenancy.upsert({
      where: { id: "ten-2" },
      update: {},
      create: {
        id: "ten-2",
        propertyId: properties[1].id,
        tenantId: tenants[1].id,
        startDate: new Date("2023-06-01"),
        endDate: new Date("2026-05-31"),
        rentAmount: 1150,
        rentFrequency: "monthly",
        depositAmount: 2300,
        depositScheme: "TDS",
        status: "active",
        notes: "Assured shorthold tenancy",
      },
    }),
  ]);

  // Create rent schedules (current month overdue, next month pending)
  const now = new Date();
  const thisMonthDue = new Date(now.getFullYear(), now.getMonth(), 15);
  const nextMonthDue = new Date(now.getFullYear(), now.getMonth() + 1, 15);
  for (const tenancy of tenancies) {
    await prisma.rentSchedule.create({
      data: {
        tenancyId: tenancy.id,
        dueDate: thisMonthDue,
        amountDue: Number(tenancy.rentAmount),
        status: "overdue",
      },
    });
    await prisma.rentSchedule.create({
      data: {
        tenancyId: tenancy.id,
        dueDate: nextMonthDue,
        amountDue: Number(tenancy.rentAmount),
        status: "pending",
      },
    });
  }

  // Create contractor
  const contractor = await prisma.contractor.upsert({
    where: { id: "contractor-1" },
    update: {},
    create: {
      id: "contractor-1",
      userId: user.id,
      name: "Premier Plumbing Ltd",
      tradeType: "plumber",
      phone: "+447700900200",
      email: "info@premierplumbing.co.uk",
      coverageArea: "London, Birmingham, Manchester",
      notes: "24hr emergency call-out available",
    },
  });

  // Create maintenance requests
  await Promise.all([
    prisma.maintenanceRequest.upsert({
      where: { id: "maint-1" },
      update: {},
      create: {
        id: "maint-1",
        propertyId: properties[0].id,
        tenancyId: tenancies[0].id,
        contractorId: contractor.id,
        title: "Boiler not heating water",
        description: "Tenant reported cold water only in kitchen and bathroom",
        priority: "urgent",
        status: "in_progress",
        estimatedCost: 350,
        actualCost: null,
        reportedDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        completedDate: null,
        invoiceUrl: null,
      },
    }),
    prisma.maintenanceRequest.upsert({
      where: { id: "maint-2" },
      update: {},
      create: {
        id: "maint-2",
        propertyId: properties[1].id,
        tenancyId: tenancies[1].id,
        title: "Fence panel loose in garden",
        description: "Panel at bottom of garden needs re-fixing",
        priority: "low",
        status: "reported",
        estimatedCost: 120,
        reportedDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      },
    }),
  ]);

  // Create compliance records
  await Promise.all([
    prisma.complianceRecord.upsert({
      where: { id: "comp-1" },
      update: {},
      create: {
        id: "comp-1",
        propertyId: properties[0].id,
        type: "gas_safety",
        issueDate: new Date("2024-03-01"),
        expiryDate: new Date("2025-03-01"),
        certificateNumber: "GAS-2024-001",
        notes: "Annual check completed",
      },
    }),
    prisma.complianceRecord.upsert({
      where: { id: "comp-2" },
      update: {},
      create: {
        id: "comp-2",
        propertyId: properties[0].id,
        type: "eicr",
        issueDate: new Date("2023-06-15"),
        expiryDate: new Date(new Date().getFullYear(), 5, 15),
        certificateNumber: "EICR-2023-456",
        notes: "Electrical installation condition report",
      },
    }),
    prisma.complianceRecord.upsert({
      where: { id: "comp-3" },
      update: {},
      create: {
        id: "comp-3",
        propertyId: properties[1].id,
        type: "epc",
        issueDate: new Date("2022-08-20"),
        expiryDate: new Date("2032-08-20"),
        certificateNumber: "EPC-D-789",
        notes: "Energy rating D",
      },
    }),
  ]);

  // Create sample expenses
  await Promise.all([
    prisma.propertyExpense.create({
      data: {
        propertyId: properties[0].id,
        category: "mortgage",
        amount: 980,
        date: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        description: "Monthly mortgage payment",
      },
    }),
    prisma.propertyExpense.create({
      data: {
        propertyId: properties[0].id,
        category: "insurance",
        amount: 245,
        date: new Date(new Date().getFullYear(), 2, 15),
        description: "Buildings and contents insurance",
      },
    }),
    prisma.propertyExpense.create({
      data: {
        propertyId: properties[1].id,
        category: "maintenance",
        amount: 85,
        date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
        description: "Plumber call-out - leaking tap",
      },
    }),
  ]);

  // Create inspections
  const inspections = await Promise.all([
    prisma.inspection.upsert({
      where: { id: "insp-1" },
      update: {},
      create: {
        id: "insp-1",
        propertyId: properties[0].id,
        tenancyId: tenancies[0].id,
        type: "landlord",
        scheduledDate: new Date(now.getFullYear(), now.getMonth() + 1, 15),
        completedDate: null,
        inspector: "John Smith Surveyors",
        nextDueDate: new Date(now.getFullYear(), now.getMonth() + 7, 15),
        overallRating: null,
        status: "scheduled",
      },
    }),
    prisma.inspection.upsert({
      where: { id: "insp-2" },
      update: {},
      create: {
        id: "insp-2",
        propertyId: properties[1].id,
        tenancyId: tenancies[1].id,
        type: "self",
        scheduledDate: new Date(now.getFullYear(), now.getMonth() - 1, 10),
        completedDate: new Date(now.getFullYear(), now.getMonth() - 1, 12),
        inspector: null,
        nextDueDate: null,
        overallRating: 4,
        status: "completed",
      },
    }),
  ]);

  // Add inspection items and actions for first inspection
  await prisma.inspectionItem.upsert({
    where: { id: "insp-item-1" },
    update: {},
    create: {
      id: "insp-item-1",
      inspectionId: inspections[0].id,
      roomName: "Living room",
      conditionRating: 4,
      notes: "Minor wear on carpet",
    },
  });
  await prisma.inspectionAction.upsert({
    where: { id: "insp-action-1" },
    update: {},
    create: {
      id: "insp-action-1",
      inspectionId: inspections[0].id,
      description: "Replace smoke alarm battery",
      dueDate: new Date(now.getFullYear(), now.getMonth() + 1, 1),
      completedDate: null,
      status: "pending",
    },
  });

  // Create SMS templates
  const smsTemplates = [
    {
      type: "rent_reminder",
      content:
        "Hi {{tenantName}}. Your rent of £{{amount}} is due tomorrow for {{address}}.",
    },
    {
      type: "overdue_alert",
      content:
        "Hi {{tenantName}}. Your rent for {{address}} is now overdue. Please arrange payment as soon as possible.",
    },
    {
      type: "inspection_request",
      content:
        "Hi {{tenantName}}. We need to arrange a property inspection at {{address}}. Please reply with your availability.",
    },
    {
      type: "maintenance_ack",
      content:
        "Hi {{tenantName}}. We've received your maintenance request for {{address}} and will be in touch shortly.",
    },
    {
      type: "maintenance_complete",
      content:
        "Hi {{tenantName}}. The maintenance work at {{address}} is now complete. Please let us know if you have any concerns.",
    },
  ];
  for (const t of smsTemplates) {
    await prisma.smsTemplate.upsert({
      where: { type: t.type },
      update: {},
      create: { ...t, isActive: true },
    });
  }

  console.log("Seed completed successfully!");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
