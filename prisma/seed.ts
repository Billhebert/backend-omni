// prisma/seed.ts
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create demo company
  const company = await prisma.company.upsert({
    where: { domain: 'demo.omni.com' },
    create: {
      name: 'Demo Company',
      domain: 'demo.omni.com',
      active: true,
    },
    update: {},
  });

  console.log(`✅ Company: ${company.name}`);

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: {
      companyId_email: {
        companyId: company.id,
        email: 'admin@demo.omni.com',
      },
    },
    create: {
      email: 'admin@demo.omni.com',
      passwordHash: adminPassword,
      name: 'Admin User',
      role: 'admin',
      companyId: company.id,
    },
    update: {},
  });

  console.log(`✅ Admin user: ${admin.email}`);

  // Create skills
  const skills = await Promise.all([
    prisma.skill.upsert({
      where: { companyId_name: { companyId: company.id, name: 'TypeScript' } },
      create: { companyId: company.id, name: 'TypeScript', category: 'technical', description: 'TypeScript programming' },
      update: {},
    }),
    prisma.skill.upsert({
      where: { companyId_name: { companyId: company.id, name: 'React' } },
      create: { companyId: company.id, name: 'React', category: 'technical', description: 'React framework' },
      update: {},
    }),
    prisma.skill.upsert({
      where: { companyId_name: { companyId: company.id, name: 'Leadership' } },
      create: { companyId: company.id, name: 'Leadership', category: 'soft_skills', description: 'Team leadership' },
      update: {},
    }),
  ]);

  console.log(`✅ ${skills.length} skills created`);

  // Create learning path
  const learningPath = await prisma.learningPath.create({
    data: {
      companyId: company.id,
      title: 'Full Stack Developer',
      description: 'Become a full-stack developer',
      targetSkills: [skills[0].id, skills[1].id],
      estimatedHours: 40,
      category: 'technical',
      difficulty: 'intermediate',
      createdBy: admin.id,
      items: {
        create: [
          {
            order: 1,
            contentType: 'video',
            title: 'TypeScript Fundamentals',
            estimatedMinutes: 120,
            required: true,
          },
        ],
      },
    },
  });

  console.log(`✅ Learning path: ${learningPath.title}`);

  // Company settings
  await prisma.companySettings.upsert({
    where: { companyId: company.id },
    create: {
      companyId: company.id,
      industry: 'tech',
      enabledModules: ['hrm', 'crm', 'erp'],
      customSkillCategories: [],
      zettelAutoGeneration: { enabled: true },
    },
    update: {},
  });

  console.log('✅ Company settings created');
  console.log('\n✨ Seed complete!');
  console.log('\n📧 Login credentials:');
  console.log('   Email: admin@demo.omni.com');
  console.log('   Password: admin123\n');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
