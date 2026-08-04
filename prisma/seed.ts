import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const roles = [
  { key: "ADMIN", name: "Admin" },
  { key: "CAREER_OFFICER", name: "Career Development Officer" },
  { key: "TRAINER", name: "Trainer" },
  { key: "LEARNER", name: "Learner" },
];

const permissions = [
  ["users.manage", "Manage platform users"],
  ["feed.manage", "Manage learning feed"],
  ["crm.manage", "Manage leads and follow-ups"],
  ["trainers.manage", "Manage trainer network"],
  ["certificates.manage", "Issue certificates"],
  ["advertisements.manage", "Manage feed advertisements"],
  ["settings.manage", "Manage platform settings"],
];

async function main() {
  for (const role of roles) {
    await prisma.role.upsert({
      where: { key: role.key },
      update: { name: role.name },
      create: role,
    });
  }

  for (const [key, description] of permissions) {
    await prisma.permission.upsert({
      where: { key },
      update: { description },
      create: { key, description },
    });
  }

  const admin = await prisma.role.findUniqueOrThrow({ where: { key: "ADMIN" } });
  const allPermissions = await prisma.permission.findMany();
  await prisma.rolePermission.createMany({
    data: allPermissions.map((permission) => ({
      roleId: admin.id,
      permissionId: permission.id,
    })),
    skipDuplicates: true,
  });

  const categories = [
    ["Medical Coding", "medical-coding"],
    ["Career Growth", "career-growth"],
    ["Industry Updates", "industry-updates"],
    ["Webinars", "webinars"],
  ];

  for (const [name, slug] of categories) {
    await prisma.feedCategory.upsert({
      where: { slug },
      update: { name },
      create: { name, slug },
    });
  }

  // Sync any Supabase Auth users missing from public.users (e.g. created before trigger).
  const learner = await prisma.role.findUniqueOrThrow({ where: { key: "LEARNER" } });
  await prisma.$executeRaw`
    INSERT INTO public.users (id, email, full_name, phone, role_id, is_active, created_at, updated_at)
    SELECT
      u.id,
      COALESCE(u.email, ''),
      COALESCE(u.raw_user_meta_data->>'full_name', split_part(COALESCE(u.email, ''), '@', 1)),
      NULLIF(u.raw_user_meta_data->>'phone', ''),
      ${learner.id},
      true,
      now(),
      now()
    FROM auth.users u
    LEFT JOIN public.users pu ON pu.id = u.id
    WHERE pu.id IS NULL
  `;

  const bootstrapEmail = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();
  if (bootstrapEmail) {
    await prisma.user.updateMany({
      where: { email: { equals: bootstrapEmail, mode: "insensitive" } },
      data: { roleId: admin.id, isActive: true },
    });
  }

  // Sample published feed so dashboards / feed are not empty on first run.
  const coding = await prisma.feedCategory.findUniqueOrThrow({ where: { slug: "medical-coding" } });
  const career = await prisma.feedCategory.findUniqueOrThrow({ where: { slug: "career-growth" } });
  const sampleFeed = [
    {
      title: "Welcome to Medical Coding Global",
      description: "Start here — an orientation overview of medical coding careers and MCG Learn.",
      categoryId: coding.id,
      type: "ARTICLE" as const,
      externalUrl: "https://medicalcodingglobal.com",
      status: "PUBLISHED" as const,
      isFeatured: true,
      priority: 10,
      publishedAt: new Date(),
    },
    {
      title: "Career tip: Building your coding resume",
      description: "Practical guidance for presenting your medical coding skills to employers.",
      categoryId: career.id,
      type: "CAREER_TIP" as const,
      status: "PUBLISHED" as const,
      priority: 5,
      publishedAt: new Date(),
    },
    {
      title: "Orientation quiz",
      description: "Quick check of foundational medical coding concepts.",
      categoryId: coding.id,
      type: "QUIZ" as const,
      status: "PUBLISHED" as const,
      priority: 8,
      publishedAt: new Date(),
      content: {
        questions: [
          {
            question: "What does ICD typically stand for in medical coding?",
            options: [
              "International Classification of Diseases",
              "Internal Care Document",
              "Insurance Claim Details",
              "Inpatient Coding Directory",
            ],
            answer: 0,
          },
          {
            question: "CPT codes are primarily used to report:",
            options: ["Diagnoses", "Procedures and services", "Hospital beds", "Pharmacy stock"],
            answer: 1,
          },
        ],
      },
    },
  ];

  for (const item of sampleFeed) {
    const existing = await prisma.feedItem.findFirst({
      where: { title: item.title, status: "PUBLISHED" },
    });
    if (!existing) {
      await prisma.feedItem.create({ data: item });
    }
  }

  const leadCount = await prisma.lead.count();
  if (leadCount === 0) {
    await prisma.lead.create({
      data: {
        fullName: "Sample Lead",
        email: "sample.lead@example.com",
        phone: "+910000000000",
        status: "NEW",
        source: "Seed",
      },
    });
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
