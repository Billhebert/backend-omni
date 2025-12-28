# 🔄 GUIA DE MIGRAÇÃO - OMNI PLATFORM

## ⚠️ IMPORTANTE - LEIA ANTES DE COMEÇAR

Este guia vai adicionar **muitas tabelas novas** ao seu banco de dados. 
**Faça backup antes de começar!**

---

## 📋 PRÉ-REQUISITOS

```bash
# Certifique-se que está no diretório backend
cd backend

# Verifique se o Prisma está instalado
npx prisma --version

# Verifique se o banco está acessível
npx prisma db pull
```

---

## 🛡️ PASSO 1: BACKUP DO BANCO DE DADOS

```bash
# Backup completo do PostgreSQL
# Substitua 'omni_platform' pelo nome do seu banco
pg_dump -U postgres -d omni_platform -F c -b -v -f "backup_$(date +%Y%m%d_%H%M%S).dump"

# OU backup em SQL puro
pg_dump -U postgres -d omni_platform > "backup_$(date +%Y%m%d_%H%M%S).sql"
```

---

## 📝 PASSO 2: SUBSTITUIR SCHEMA DO PRISMA

```bash
# 1. Backup do schema atual
cp prisma/schema.prisma prisma/schema.prisma.backup

# 2. Copiar novo schema
# Cole o conteúdo de schema-complete.prisma em prisma/schema.prisma
```

**Ou via código:**
```bash
# Se você salvou o schema-complete.prisma na pasta backend
cp schema-complete.prisma prisma/schema.prisma
```

---

## 🚀 PASSO 3: GERAR MIGRATION

```bash
# Criar migration com todas as novas tabelas
npx prisma migrate dev --name add_hrm_crm_erp_modules

# Se houver erros, veja a seção de troubleshooting abaixo
```

**O que vai acontecer:**
- Prisma vai detectar todas as novas tabelas
- Vai criar SQL para criá-las
- Vai aplicar no banco de dados
- Vai gerar novo Prisma Client

**Tabelas que serão criadas:**
```
✅ learning_paths
✅ learning_path_items
✅ learning_enrollments
✅ learning_progress
✅ skill_development_plans
✅ job_positions
✅ job_position_skills
✅ job_applications
✅ projects
✅ project_skill_requirements
✅ project_members
✅ performance_reviews
✅ contacts
✅ deals
✅ deal_products
✅ interactions
✅ invoices
✅ invoice_items
✅ expenses
✅ products
✅ stock_movements
✅ suppliers
✅ company_settings
```

---

## 🔍 PASSO 4: VERIFICAR MIGRATION

```bash
# Ver status das migrations
npx prisma migrate status

# Deve mostrar algo como:
# Database schema is up to date!

# Ver o SQL gerado
cat prisma/migrations/$(ls -t prisma/migrations | head -1)/migration.sql
```

---

## 🎨 PASSO 5: GERAR PRISMA CLIENT

```bash
# Gerar client atualizado com novos models
npx prisma generate

# Verificar se funcionou
npx prisma studio
# Isso abre uma UI web onde você pode ver todas as tabelas
```

---

## 🌱 PASSO 6: SEED DE DADOS INICIAIS

Crie o arquivo `prisma/seed-hrm.ts`:

```typescript
// prisma/seed-hrm.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting HRM/CRM/ERP seed...');

  // Buscar primeira company
  const company = await prisma.company.findFirst();
  
  if (!company) {
    throw new Error('❌ Nenhuma company encontrada. Crie uma company primeiro.');
  }

  const companyId = company.id;
  console.log(`✅ Company encontrada: ${company.name} (${companyId})`);

  // ============================================
  // 1. CRIAR SKILLS BASE
  // ============================================
  console.log('\n📚 Criando skills...');
  
  const skillsData = [
    // Technical Skills
    { name: 'TypeScript', category: 'technical', description: 'TypeScript programming language' },
    { name: 'React', category: 'technical', description: 'React.js framework' },
    { name: 'Node.js', category: 'technical', description: 'Node.js runtime' },
    { name: 'PostgreSQL', category: 'technical', description: 'PostgreSQL database' },
    { name: 'Docker', category: 'tools', description: 'Docker containers' },
    { name: 'Git', category: 'tools', description: 'Version control' },
    
    // Soft Skills
    { name: 'Communication', category: 'soft_skills', description: 'Effective communication' },
    { name: 'Leadership', category: 'leadership', description: 'Team leadership' },
    { name: 'Problem Solving', category: 'soft_skills', description: 'Analytical thinking' },
    { name: 'Time Management', category: 'soft_skills', description: 'Organize and prioritize' },
    
    // Sales Skills
    { name: 'Negotiation', category: 'sales', description: 'Deal negotiation' },
    { name: 'Customer Success', category: 'customer_service', description: 'CS best practices' },
    { name: 'Cold Calling', category: 'sales', description: 'Prospecting via phone' },
    
    // Product Knowledge
    { name: 'Product Demo', category: 'product_knowledge', description: 'Product presentations' },
    { name: 'Technical Support', category: 'customer_service', description: 'Technical assistance' },
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
  // 2. CRIAR LEARNING PATHS
  // ============================================
  console.log('\n📖 Criando learning paths...');

  const paths = [
    {
      title: 'Full Stack TypeScript Developer',
      description: 'Become a proficient full-stack developer with TypeScript',
      targetSkills: [skills['TypeScript'].id, skills['React'].id, skills['Node.js'].id],
      estimatedHours: 40,
      category: 'technical',
      difficulty: 'intermediate',
      items: [
        {
          order: 1,
          contentType: 'video',
          title: 'TypeScript Fundamentals',
          description: 'Learn the basics of TypeScript',
          estimatedMinutes: 120,
          required: true,
        },
        {
          order: 2,
          contentType: 'article',
          title: 'Advanced TypeScript Patterns',
          description: 'Generics, decorators, and advanced types',
          estimatedMinutes: 90,
          required: true,
        },
        {
          order: 3,
          contentType: 'quiz',
          title: 'TypeScript Knowledge Check',
          estimatedMinutes: 30,
          required: true,
        },
        {
          order: 4,
          contentType: 'video',
          title: 'React with TypeScript',
          description: 'Building React apps with TypeScript',
          estimatedMinutes: 180,
          required: true,
        },
      ],
    },
    {
      title: 'Sales Excellence Program',
      description: 'Master the art of selling and customer relationships',
      targetSkills: [skills['Negotiation'].id, skills['Communication'].id, skills['Customer Success'].id],
      estimatedHours: 20,
      category: 'sales',
      difficulty: 'beginner',
      items: [
        {
          order: 1,
          contentType: 'video',
          title: 'Sales Fundamentals',
          estimatedMinutes: 60,
          required: true,
        },
        {
          order: 2,
          contentType: 'article',
          title: 'Objection Handling',
          estimatedMinutes: 45,
          required: true,
        },
        {
          order: 3,
          contentType: 'video',
          title: 'Closing Techniques',
          estimatedMinutes: 90,
          required: true,
        },
      ],
    },
    {
      title: 'Leadership Essentials',
      description: 'Develop leadership skills for team management',
      targetSkills: [skills['Leadership'].id, skills['Communication'].id, skills['Problem Solving'].id],
      estimatedHours: 15,
      category: 'leadership',
      difficulty: 'intermediate',
      items: [
        {
          order: 1,
          contentType: 'video',
          title: 'What Makes a Great Leader',
          estimatedMinutes: 60,
          required: true,
        },
        {
          order: 2,
          contentType: 'article',
          title: 'Delegation Strategies',
          estimatedMinutes: 30,
          required: true,
        },
      ],
    },
  ];

  for (const pathData of paths) {
    const { items, ...pathInfo } = pathData;
    await prisma.learningPath.create({
      data: {
        ...pathInfo,
        companyId,
        createdBy: 'system',
        items: {
          create: items,
        },
      },
    });
  }

  console.log(`✅ ${paths.length} learning paths criados`);

  // ============================================
  // 3. CRIAR JOB POSITIONS
  // ============================================
  console.log('\n💼 Criando job positions...');

  const positions = [
    {
      title: 'Senior Full Stack Developer',
      description: 'We are looking for an experienced full-stack developer to join our team.',
      level: 'senior',
      employmentType: 'full-time',
      salaryMin: 100000,
      salaryMax: 150000,
      status: 'open',
      openings: 2,
      requiredSkills: [
        { skillId: skills['TypeScript'].id, requiredLevel: 4, priority: 'required', weight: 5 },
        { skillId: skills['React'].id, requiredLevel: 4, priority: 'required', weight: 5 },
        { skillId: skills['Node.js'].id, requiredLevel: 4, priority: 'required', weight: 4 },
        { skillId: skills['PostgreSQL'].id, requiredLevel: 3, priority: 'required', weight: 3 },
        { skillId: skills['Docker'].id, requiredLevel: 3, priority: 'nice_to_have', weight: 2 },
      ],
    },
    {
      title: 'Sales Development Representative',
      description: 'Drive new business through prospecting and qualification.',
      level: 'junior',
      employmentType: 'full-time',
      salaryMin: 50000,
      salaryMax: 70000,
      status: 'open',
      openings: 3,
      requiredSkills: [
        { skillId: skills['Communication'].id, requiredLevel: 3, priority: 'required', weight: 5 },
        { skillId: skills['Cold Calling'].id, requiredLevel: 2, priority: 'required', weight: 4 },
        { skillId: skills['Customer Success'].id, requiredLevel: 2, priority: 'nice_to_have', weight: 3 },
      ],
    },
    {
      title: 'Engineering Manager',
      description: 'Lead our engineering team to build great products.',
      level: 'manager',
      employmentType: 'full-time',
      salaryMin: 130000,
      salaryMax: 180000,
      status: 'open',
      openings: 1,
      requiredSkills: [
        { skillId: skills['Leadership'].id, requiredLevel: 4, priority: 'required', weight: 5 },
        { skillId: skills['TypeScript'].id, requiredLevel: 3, priority: 'required', weight: 3 },
        { skillId: skills['Problem Solving'].id, requiredLevel: 4, priority: 'required', weight: 4 },
        { skillId: skills['Communication'].id, requiredLevel: 4, priority: 'required', weight: 4 },
      ],
    },
  ];

  for (const positionData of positions) {
    const { requiredSkills, ...positionInfo } = positionData;
    await prisma.jobPosition.create({
      data: {
        ...positionInfo,
        companyId,
        createdBy: 'system',
        requiredSkills: {
          create: requiredSkills,
        },
      },
    });
  }

  console.log(`✅ ${positions.length} job positions criados`);

  // ============================================
  // 4. CRIAR COMPANY SETTINGS
  // ============================================
  console.log('\n⚙️  Criando company settings...');

  await prisma.companySettings.upsert({
    where: { companyId },
    create: {
      companyId,
      industry: 'tech',
      enabledModules: ['hrm', 'crm', 'projects', 'knowledge'],
      customSkillCategories: [],
      zettelAutoGeneration: {
        employee_completed_course: true,
        performance_review_completed: true,
        deal_won: true,
        deal_lost: true,
        project_completed: true,
      },
      learningSettings: {
        requireManagerApproval: false,
        budgetPerEmployee: 5000,
        allowSelfEnrollment: true,
        certificatesEnabled: true,
      },
      crmSettings: {
        defaultCurrency: 'USD',
        pipelineStages: ['lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost'],
      },
      erpSettings: {
        defaultCurrency: 'USD',
        taxRate: 0.0,
        lowStockAlerts: true,
      },
      notificationSettings: {
        emailNotifications: true,
        slackIntegration: false,
      },
      aiSettings: {
        autoZettelGeneration: true,
        smartRecommendations: true,
        skillGapAnalysis: true,
      },
    },
    update: {},
  });

  console.log('✅ Company settings criados');

  // ============================================
  // 5. CRIAR ALGUNS DADOS DE EXEMPLO (CRM)
  // ============================================
  console.log('\n👥 Criando exemplo de CRM...');

  // Buscar primeiro usuário
  const firstUser = await prisma.user.findFirst({
    where: { companyId },
  });

  if (firstUser) {
    // Criar contato
    const contact = await prisma.contact.create({
      data: {
        companyId,
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+1234567890',
        companyName: 'Acme Corp',
        position: 'CEO',
        leadStatus: 'qualified',
        ownerId: firstUser.id,
      },
    });

    // Criar deal
    await prisma.deal.create({
      data: {
        companyId,
        title: 'Enterprise License Deal',
        contactId: contact.id,
        value: 50000,
        stage: 'proposal',
        probability: 70,
        expectedCloseDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        ownerId: firstUser.id,
      },
    });

    console.log('✅ Exemplo de CRM criado');
  }

  console.log('\n✨ Seed completo!\n');
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

**Executar seed:**
```bash
npx tsx prisma/seed-hrm.ts
```

---

## ✅ PASSO 7: VERIFICAR INSTALAÇÃO

```bash
# 1. Abrir Prisma Studio
npx prisma studio

# 2. Verificar se as tabelas existem:
# - learning_paths (deve ter 3 registros)
# - skills (deve ter ~15 registros)
# - job_positions (deve ter 3 registros)
# - company_settings (deve ter 1 registro)

# 3. Testar query no código
```

Criar arquivo `test-migration.ts`:
```typescript
// test-migration.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function test() {
  console.log('🧪 Testando novos models...\n');

  const learningPaths = await prisma.learningPath.findMany({
    include: { items: true },
  });
  console.log(`✅ Learning Paths: ${learningPaths.length}`);

  const skills = await prisma.skill.findMany();
  console.log(`✅ Skills: ${skills.length}`);

  const positions = await prisma.jobPosition.findMany({
    include: { requiredSkills: { include: { skill: true } } },
  });
  console.log(`✅ Job Positions: ${positions.length}`);

  const settings = await prisma.companySettings.findFirst();
  console.log(`✅ Company Settings: ${settings ? 'OK' : 'NOT FOUND'}`);

  console.log('\n✨ Tudo funcionando!\n');
}

test()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

```bash
npx tsx test-migration.ts
```

---

## 🔧 TROUBLESHOOTING

### Erro: "Foreign key constraint violation"
**Causa:** Dados existentes que conflitam com novas constraints

**Solução:**
```bash
# Verificar dados órfãos
npx prisma studio

# Limpar dados problemáticos (CUIDADO!)
# Só se necessário e você souber o que está fazendo
```

### Erro: "Migration failed"
**Causa:** SQL gerado tem problemas

**Solução:**
```bash
# Ver detalhes do erro
npx prisma migrate dev --create-only --name debug

# Editar SQL manualmente se necessário
# Arquivo: prisma/migrations/[timestamp]_debug/migration.sql

# Aplicar migration editada
npx prisma migrate deploy
```

### Erro: "Prisma Client validation error"
**Causa:** Client desatualizado

**Solução:**
```bash
# Regenerar client
npx prisma generate

# Reiniciar seu servidor
```

### Banco ficou inconsistente
**Solução: Resetar e refazer**
```bash
# ⚠️ ISSO DELETA TODOS OS DADOS!
npx prisma migrate reset

# Aplicar migrations do zero
npx prisma migrate dev

# Rodar seed
npx tsx prisma/seed-hrm.ts
```

---

## 🎯 PRÓXIMOS PASSOS

Após migração bem-sucedida:

1. ✅ **Criar Services** (learning.service.ts, matching.service.ts, etc)
2. ✅ **Criar Routes** (learning.routes.ts, etc)
3. ✅ **Registrar módulos** no main.ts
4. ✅ **Testar endpoints** com Postman/Thunder Client

Veja os próximos arquivos que vou criar para continuar! 🚀
