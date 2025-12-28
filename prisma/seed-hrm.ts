// backend/prisma/seed-hrm.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting HRM seed...');

  // Buscar primeira company
  const company = await prisma.company.findFirst();
  
  if (!company) {
    console.log('⚠️  Nenhuma company encontrada.');
    console.log('💡 Crie uma company primeiro e rode o seed novamente.');
    return;
  }

  const companyId = company.id;
  console.log(`✅ Company: ${company.name} (${companyId})`);

  // ============================================
  // SKILLS
  // ============================================
  console.log('\n📚 Criando skills...');
  
  const skillsData = [
    // Technical
    { name: 'TypeScript', category: 'technical', description: 'TypeScript programming' },
    { name: 'React', category: 'technical', description: 'React.js framework' },
    { name: 'Node.js', category: 'technical', description: 'Node.js runtime' },
    { name: 'PostgreSQL', category: 'technical', description: 'PostgreSQL database' },
    { name: 'Docker', category: 'tools', description: 'Containers' },
    { name: 'Git', category: 'tools', description: 'Version control' },
    
    // Soft Skills
    { name: 'Communication', category: 'soft_skills', description: 'Effective communication' },
    { name: 'Leadership', category: 'leadership', description: 'Team leadership' },
    { name: 'Problem Solving', category: 'soft_skills', description: 'Analytical thinking' },
    
    // Sales
    { name: 'Negotiation', category: 'sales', description: 'Deal negotiation' },
    { name: 'Customer Success', category: 'customer_service', description: 'CS best practices' },
  ];

  const skills: any = {};
  for (const skillData of skillsData) {
    const skill = await prisma.skill.upsert({
      where: { 
        companyId_name: {
          companyId,
          name: skillData.name
        }
      },
      create: { ...skillData, companyId },
      update: skillData,
    });
    skills[skillData.name] = skill;
  }

  console.log(`✅ ${skillsData.length} skills criadas`);

  // ============================================
  // LEARNING PATHS
  // ============================================
  console.log('\n📖 Criando learning paths...');

  await prisma.learningPath.upsert({
    where: { id: 'path-1' },
    create: {
      id: 'path-1',
      companyId,
      title: 'Full Stack Developer',
      description: 'Become a full-stack developer',
      targetSkills: [skills['TypeScript'].id, skills['React'].id, skills['Node.js'].id],
      estimatedHours: 40,
      category: 'technical',
      difficulty: 'intermediate',
      createdBy: 'system',
      items: {
        create: [
          {
            order: 1,
            contentType: 'video',
            title: 'TypeScript Fundamentals',
            estimatedMinutes: 120,
            required: true,
          },
          {
            order: 2,
            contentType: 'article',
            title: 'React Basics',
            estimatedMinutes: 90,
            required: true,
          },
        ],
      },
    },
    update: {},
  });

  console.log('✅ Learning paths criados');

  // ============================================
  // JOB POSITIONS
  // ============================================
  console.log('\n💼 Criando job positions...');

  await prisma.jobPosition.upsert({
    where: { id: 'pos-1' },
    create: {
      id: 'pos-1',
      companyId,
      title: 'Senior Full Stack Developer',
      description: 'Looking for experienced developer',
      level: 'senior',
      employmentType: 'full-time',
      salaryMin: 100000,
      salaryMax: 150000,
      status: 'open',
      openings: 2,
      createdBy: 'system',
      requiredSkills: {
        create: [
          { skillId: skills['TypeScript'].id, requiredLevel: 4, priority: 'required', weight: 5 },
          { skillId: skills['React'].id, requiredLevel: 4, priority: 'required', weight: 5 },
          { skillId: skills['Node.js'].id, requiredLevel: 4, priority: 'required', weight: 4 },
        ],
      },
    },
    update: {},
  });

  console.log('✅ Job positions criados');

  // ============================================
  // COMPANY SETTINGS
  // ============================================
  console.log('\n⚙️  Company settings...');

  await prisma.companySettings.upsert({
    where: { companyId },
    create: {
      companyId,
      industry: 'tech',
      enabledModules: ['hrm', 'knowledge'],
      customSkillCategories: [],
      zettelAutoGeneration: {
        employee_completed_course: true,
        performance_review_completed: true,
      },
      learningSettings: {
        requireManagerApproval: false,
        budgetPerEmployee: 5000,
      },
    },
    update: {},
  });

  console.log('✅ Settings criados');
  console.log('\n✨ Seed completo!\n');
}

main()
  .catch((e) => {
    console.error('❌ Erro:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
