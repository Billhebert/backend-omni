# 🚀 SETUP COMPLETO - OMNI PLATFORM BACKEND

## 📦 CONTEÚDO DO PACOTE

Você recebeu a estrutura completa do backend com:

- ✅ **23 novas tabelas** no schema do Prisma
- ✅ **Learning Management System** completo
- ✅ **Matching Engine** (funcionário → vaga)
- ✅ **Auto-Zettel Service** (geração automática de knowledge)
- ✅ **Documentação** completa
- ✅ **Scripts** de seed prontos

---

## 🎯 INSTALAÇÃO PASSO A PASSO

### PASSO 1: Backup do Banco Atual (2 minutos)

**IMPORTANTE:** Faça backup antes de qualquer coisa!

```bash
# Windows - Abrir PowerShell como Admin
pg_dump -U postgres -d omni_db > backup_antes_hrm.sql

# OU se precisar especificar host/porta
pg_dump -U postgres -h localhost -p 5432 -d omni_db > backup_antes_hrm.sql
```

✅ **Confirmação:** Arquivo `backup_antes_hrm.sql` criado

---

### PASSO 2: Copiar Arquivos (3 minutos)

**Onde extrair o ZIP:**

```
C:\Users\Bill\Downloads\OMNI\
```

**Depois de extrair, você terá:**

```
C:\Users\Bill\Downloads\OMNI\
└── backend-complete\
    ├── src\
    ├── prisma\
    ├── docs\
    └── ...
```

**Opção A: Substituir tudo (RECOMENDADO para evitar conflitos)**

```powershell
# Renomear pasta antiga
Rename-Item "C:\Users\Bill\Downloads\OMNI\backend" "backend-OLD"

# Renomear nova pasta
Rename-Item "C:\Users\Bill\Downloads\OMNI\backend-complete" "backend"
```

**Opção B: Mesclar manualmente (se você tem código customizado)**

Copie apenas as pastas novas:
- `backend-complete/src/modules/hrm` → `backend/src/modules/hrm`
- `backend-complete/src/modules/ai-orchestrator` → `backend/src/modules/ai-orchestrator`
- `backend-complete/src/types` → `backend/src/types`
- `backend-complete/prisma/schema.prisma` → `backend/prisma/schema.prisma`

---

### PASSO 3: Instalar Dependências (2 minutos)

```bash
cd C:\Users\Bill\Downloads\OMNI\backend

# Instalar dependências
npm install

# OU se preferir pnpm
pnpm install
```

✅ **Confirmação:** `node_modules` criado sem erros

---

### PASSO 4: Configurar .env (1 minuto)

```bash
# Copiar exemplo
copy .env.example .env

# Editar .env com seus dados
notepad .env
```

**Exemplo de .env:**
```env
DATABASE_URL="postgresql://postgres:sua_senha@localhost:5432/omni_db"
PORT=3001
NODE_ENV=development
```

✅ **Confirmação:** Arquivo `.env` criado e configurado

---

### PASSO 5: Limpar Duplicatas (5 minutos)

**Problema:** Skills duplicadas no banco impedem a migration.

**Solução Recomendada - Via Prisma Studio:**

```bash
npx prisma studio
```

No navegador (http://localhost:5555):
1. Clique em `skills`
2. Ordene por `name`
3. Encontre duplicatas (ex: "React" aparece 2x)
4. **Delete as duplicatas** - mantenha apenas 1 de cada
5. Salve

**Alternativa - Via SQL:**

```bash
# Conectar no PostgreSQL
psql -U postgres -d omni_db

# Executar limpeza
DELETE FROM skills
WHERE id NOT IN (
    SELECT MIN(id)
    FROM skills
    GROUP BY "companyId", name
);

# Verificar (deve retornar 0)
SELECT COUNT(*) FROM (
    SELECT "companyId", name
    FROM skills 
    GROUP BY "companyId", name 
    HAVING COUNT(*) > 1
) duplicates;

# Sair
\q
```

✅ **Confirmação:** Sem duplicatas em skills

---

### PASSO 6: Aplicar Migration (2 minutos)

```bash
cd backend

# Aplicar migration
npx prisma migrate dev --name add_hrm_crm_erp_modules
```

**Deve aparecer:**
```
✔ Migration applied successfully
✔ Generated Prisma Client
```

Se der erro de duplicatas, volte ao Passo 5.

✅ **Confirmação:** Migration aplicada sem erros

---

### PASSO 7: Gerar Prisma Client (30 segundos)

```bash
npx prisma generate
```

✅ **Confirmação:** "Generated Prisma Client" aparece

---

### PASSO 8: Seed de Dados (1 minuto)

```bash
# Rodar seed
npx tsx prisma/seed-hrm.ts
```

**Deve aparecer:**
```
✅ Company: ...
✅ 11 skills criadas
✅ Learning paths criados
✅ Job positions criados
✅ Settings criados
✨ Seed completo!
```

✅ **Confirmação:** Dados criados com sucesso

---

### PASSO 9: Testar Backend (1 minuto)

```bash
# Iniciar servidor
npm run dev
```

**Deve aparecer:**
```
✅ HRM Module registered
🚀 OMNI Platform Backend rodando!
📍 URL: http://localhost:3001
```

**Em outro terminal, testar:**
```bash
# Health check
curl http://localhost:3001/health

# Learning paths
curl http://localhost:3001/api/hrm/learning-paths
```

✅ **Confirmação:** API respondendo

---

## ✅ CHECKLIST FINAL

Antes de considerar pronto:

- [ ] Backup do banco feito
- [ ] Arquivos copiados para `backend/`
- [ ] `npm install` sem erros
- [ ] `.env` configurado
- [ ] Skills duplicadas removidas
- [ ] Migration aplicada com sucesso
- [ ] Prisma Client gerado
- [ ] Seed executado
- [ ] Servidor inicia sem erros
- [ ] Endpoints respondem

---

## 🎯 PRÓXIMOS PASSOS

Agora que tudo está funcionando:

### 1. Explorar no Prisma Studio

```bash
npx prisma studio
```

Veja as novas tabelas:
- `learning_paths` (3 registros)
- `skills` (11 registros)
- `job_positions` (1 registro)
- `company_settings` (1 registro)

### 2. Testar Endpoints

Use **Thunder Client** (VS Code) ou **Postman**:

**GET** `http://localhost:3001/api/hrm/learning-paths`
**GET** `http://localhost:3001/api/hrm/my-enrollments`

### 3. Ler Documentação

```
backend/docs/
├── README_BACKEND.md          - Visão geral completa
├── MIGRATION_GUIDE.md         - Detalhes da migration
├── INTEGRATION_GUIDE.md       - Como integrar
└── FIX_MIGRATION_ERROR.md     - Troubleshooting
```

---

## 🆘 TROUBLESHOOTING

### Erro: "Migration failed - duplicate key"

→ Volte ao **Passo 5** e limpe duplicatas

### Erro: "Cannot find module '@prisma/client'"

```bash
npm install @prisma/client
npx prisma generate
```

### Erro: "Port 3001 already in use"

```bash
# Matar processo na porta 3001
# Windows:
netstat -ano | findstr :3001
taskkill /PID [numero] /F

# Ou mudar porta no .env
PORT=3002
```

### Erro: "Connection refused"

Verifique se PostgreSQL está rodando:
```bash
# Windows - Services
services.msc
# Procure "postgresql" e inicie
```

---

## 📞 SUPORTE

- **Problemas com migration?** → Ver `docs/FIX_MIGRATION_ERROR.md`
- **Dúvidas de integração?** → Ver `docs/INTEGRATION_GUIDE.md`
- **Visão geral?** → Ver `docs/README_BACKEND.md`

---

## 🎉 SUCESSO!

Se chegou aqui sem erros, você tem:

✅ Backend HRM/CRM/ERP funcionando
✅ 23 novas tabelas no banco
✅ Learning Management System operacional
✅ Matching Engine pronto
✅ Auto-Zettel configurado

**Próximo passo:** Implementar frontend! 🚀
