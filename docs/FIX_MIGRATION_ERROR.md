# 🔧 RESOLVER ERRO DE MIGRATION - Skills Duplicadas

## 🚨 Erro Encontrado

```
ERROR: could not create unique index "skills_companyId_name_key"
DETAIL: Key ("companyId", name)=(company-123, React) is duplicated.
```

**Causa:** Você tem skills com mesmo `companyId` e `name` no banco de dados.

---

## ✅ SOLUÇÃO RECOMENDADA (Passo a Passo)

### PASSO 1: Reverter Migration Falhada

```bash
npx prisma migrate resolve --rolled-back 20251228172357_add_hrm_crm_erp_tables
```

---

### PASSO 2: Escolher Método de Limpeza

#### Opção A: Via Prisma Studio (Mais Fácil - Recomendado)

```bash
# 1. Abrir Prisma Studio
npx prisma studio
```

**No navegador:**
1. Clique em `skills` na sidebar
2. Ordene por `name` para ver duplicatas
3. Para cada skill duplicada (ex: "React" aparece 2x):
   - Mantenha UMA
   - Delete as outras (botão 🗑️)
4. Salve as mudanças

**Depois:**
```bash
# 2. Tentar migration novamente
npx prisma migrate dev --name add_hrm_crm_erp_tables
```

---

#### Opção B: Via SQL (Mais Rápido)

```bash
# 1. Conectar no PostgreSQL
psql -U postgres -d omni_db
```

**No psql, executar:**

```sql
-- Ver duplicatas
SELECT "companyId", name, COUNT(*) as quantidade
FROM skills 
GROUP BY "companyId", name 
HAVING COUNT(*) > 1
ORDER BY quantidade DESC;

-- Deletar duplicatas (mantém apenas primeira)
DELETE FROM skills
WHERE id NOT IN (
    SELECT MIN(id)
    FROM skills
    GROUP BY "companyId", name
);

-- Verificar que não há mais duplicatas
SELECT COUNT(*) FROM (
    SELECT "companyId", name
    FROM skills 
    GROUP BY "companyId", name 
    HAVING COUNT(*) > 1
) duplicates;
-- Deve retornar: 0

-- Sair
\q
```

**Depois:**
```bash
# 2. Tentar migration novamente
npx prisma migrate dev --name add_hrm_crm_erp_tables
```

---

#### Opção C: Script SQL Seguro (Preserva Relações)

Se você tem `employee_skills` referenciando as skills duplicadas:

```bash
# 1. Copiar script para o diretório do projeto
# (Use o arquivo clean-duplicate-skills-safe.sql fornecido)

# 2. Executar script
psql -U postgres -d omni_db -f clean-duplicate-skills-safe.sql
```

**Depois:**
```bash
# 3. Tentar migration novamente
npx prisma migrate dev --name add_hrm_crm_erp_tables
```

---

### PASSO 3: Verificar Sucesso

Após limpar duplicatas e rodar migration novamente, você deve ver:

```
✔ Migration applied successfully
✔ Generated Prisma Client
```

**Teste:**
```bash
# Abrir Prisma Studio
npx prisma studio

# Verificar:
# - Tabela skills tem constraint unique em (companyId, name) ✅
# - Novas tabelas criadas (learning_paths, job_positions, etc) ✅
```

---

## 🆘 TROUBLESHOOTING

### Erro: "Migration already applied"

```bash
# Ver status
npx prisma migrate status

# Se migration está marcada como aplicada mas falhou:
npx prisma migrate resolve --rolled-back 20251228172357_add_hrm_crm_erp_tables
```

---

### Erro: "Foreign key constraint violation"

Se ao deletar skills você receber erro de FK:

```sql
-- Opção 1: Ver quais employee_skills usam essa skill
SELECT es.*, u.name as user_name, s.name as skill_name
FROM employee_skills es
JOIN users u ON u.id = es."userId"
JOIN skills s ON s.id = es."skillId"
WHERE es."skillId" IN (
    -- IDs das skills duplicadas
    SELECT id FROM skills 
    WHERE id NOT IN (
        SELECT MIN(id) FROM skills GROUP BY "companyId", name
    )
);

-- Opção 2: Usar script seguro (clean-duplicate-skills-safe.sql)
-- que atualiza employee_skills antes de deletar
```

---

### Erro: "Cannot connect to database"

```bash
# Verificar se PostgreSQL está rodando
# Windows:
services.msc
# Procure por "postgresql" e inicie o serviço

# OU
pg_ctl -D "C:\Program Files\PostgreSQL\15\data" status
```

---

## 🔄 ALTERNATIVA: Reset Completo

**⚠️ ATENÇÃO: ISSO DELETA TODOS OS DADOS!**

Use apenas se:
- Está em desenvolvimento
- Não tem dados importantes
- Quer começar do zero

```bash
# Reset total
npx prisma migrate reset

# Isso vai:
# 1. Dropar o banco
# 2. Criar novamente
# 3. Aplicar todas as migrations
# 4. Rodar seed (se configurado)
```

---

## 📝 PREVENÇÃO

Para evitar duplicatas no futuro:

### 1. Sempre use upsert ao criar skills

```typescript
// ❌ ERRADO
await prisma.skill.create({
  data: { companyId, name: 'React', category: 'technical' }
});

// ✅ CORRETO
await prisma.skill.upsert({
  where: { 
    companyId_name: { companyId, name: 'React' }
  },
  create: { companyId, name: 'React', category: 'technical' },
  update: {} // não atualiza se já existir
});
```

### 2. Valide antes de criar

```typescript
const exists = await prisma.skill.findUnique({
  where: { 
    companyId_name: { companyId, name: 'React' }
  }
});

if (!exists) {
  await prisma.skill.create({...});
}
```

---

## ✅ CHECKLIST FINAL

Após resolver:

- [ ] Migration aplicada com sucesso
- [ ] Prisma Client gerado
- [ ] Prisma Studio mostra novas tabelas
- [ ] Nenhuma duplicata em skills
- [ ] Constraint `skills_companyId_name_key` criada
- [ ] Server inicia sem erros

---

## 🎯 PRÓXIMO PASSO

Depois que a migration funcionar:

1. ✅ Rodar seed de dados
   ```bash
   npx tsx prisma/seed-hrm.ts
   ```

2. ✅ Copiar services para o projeto

3. ✅ Registrar módulos no Fastify

4. ✅ Testar endpoints

---

**Se ainda tiver problemas, me manda a mensagem de erro completa!** 🚀
