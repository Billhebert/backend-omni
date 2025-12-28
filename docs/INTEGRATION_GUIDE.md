# 🔧 INTEGRAÇÃO HRM - GUIA ESPECÍFICO PARA SEU PROJETO

## 📁 Estrutura Atual Detectada

```
backend/
├── src/
│   ├── server.ts     ✅ (usa buildApp())
│   ├── app.ts        ❓ (precisamos verificar/atualizar)
│   └── modules/
│       └── knowledge/  ✅ (você já tem)
```

---

## 🎯 PASSO A PASSO

### PASSO 1: Criar Estrutura de Pastas (30 segundos)

```bash
cd backend/src/modules

# Criar pastas do HRM
mkdir -p hrm/learning
mkdir -p hrm/positions
mkdir -p ai-orchestrator
```

**Resultado esperado:**
```
backend/src/modules/
├── knowledge/          (já existe)
├── hrm/
│   ├── learning/
│   └── positions/
└── ai-orchestrator/
```

---

### PASSO 2: Copiar Arquivos dos Services (2 minutos)

```bash
# Assumindo que você baixou os arquivos em C:\Users\Bill\Downloads

# Copiar Learning Service e Routes
copy C:\Users\Bill\Downloads\learning.service.ts backend\src\modules\hrm\learning\
copy C:\Users\Bill\Downloads\learning.routes.ts backend\src\modules\hrm\learning\

# Copiar Matching Engine
copy C:\Users\Bill\Downloads\matching.service.ts backend\src\modules\hrm\positions\

# Copiar Auto-Zettel
copy C:\Users\Bill\Downloads\auto-zettel.service.ts backend\src\modules\ai-orchestrator\

# Copiar HRM Index
copy C:\Users\Bill\Downloads\hrm-index.ts backend\src\modules\hrm\index.ts
```

**Ou via VS Code:**
- Arraste os arquivos para as pastas correspondentes

**Resultado esperado:**
```
backend/src/modules/
├── hrm/
│   ├── learning/
│   │   ├── learning.service.ts    ✅
│   │   └── learning.routes.ts     ✅
│   ├── positions/
│   │   └── matching.service.ts    ✅
│   └── index.ts                   ✅
└── ai-orchestrator/
    └── auto-zettel.service.ts     ✅
```

---

### PASSO 3: Atualizar/Criar app.ts (2 minutos)

**Opção A: Se você JÁ TEM app.ts**

Abra `backend/src/app.ts` e adicione apenas estas linhas:

```typescript
// No início do arquivo (com os outros imports)
import { hrmModule } from './modules/hrm';

// No buildApp(), depois dos seus módulos existentes
export async function buildApp() {
  // ... seu código existente ...

  // Seus módulos existentes
  // await app.register(knowledgeRoutes, { prefix: '/api' });
  
  // 🆕 ADICIONE ESTA LINHA
  await app.register(hrmModule, { prefix: '/api' });

  // ... resto do código ...
}
```

**Opção B: Se você NÃO TEM app.ts**

```bash
# Copiar app.ts fornecido
copy C:\Users\Bill\Downloads\app.ts backend\src\app.ts
```

E depois ajuste para incluir seus módulos existentes (knowledge, etc).

---

### PASSO 4: Criar Tipos do Fastify (1 minuto)

```bash
# Criar pasta de tipos
mkdir backend\src\types
```

Criar arquivo `backend/src/types/fastify.d.ts`:

```typescript
// backend/src/types/fastify.d.ts
import { PrismaClient } from '@prisma/client';

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
  }
}
```

**Ou adicionar no tsconfig.json:**
```json
{
  "compilerOptions": {
    "typeRoots": ["./src/types", "./node_modules/@types"]
  }
}
```

---

### PASSO 5: Verificar Dependências (1 minuto)

```bash
cd backend

# Verificar se tem as dependências necessárias
npm list @fastify/cors
npm list @prisma/client
```

**Se não tiver, instalar:**
```bash
npm install @fastify/cors
npm install @prisma/client
```

---

### PASSO 6: Testar (2 minutos)

```bash
# Iniciar servidor
npm run dev

# Ou
npm start
```

**Deve aparecer:**
```
✅ HRM Module registered
🚀 OMNI Platform Backend rodando!
```

**Testar endpoint:**
```bash
# Em outro terminal
curl http://localhost:3001/api/hrm/learning-paths
```

Se retornar `[]` (array vazio) ou lista de paths → **FUNCIONOU!** ✅

---

## 🧪 VALIDAÇÃO COMPLETA

### Teste 1: Health Check
```bash
curl http://localhost:3001/health
```
**Esperado:** `{"status":"ok",...}`

### Teste 2: Learning Paths (sem auth)
```bash
curl http://localhost:3001/api/hrm/learning-paths
```
**Esperado:** `{"error":"..."}` (erro de autenticação) ou `[]`

### Teste 3: Swagger (se tiver)
```bash
# Abrir no navegador
http://localhost:3001/docs
```

---

## 🔧 TROUBLESHOOTING

### Erro: "Cannot find module './modules/hrm'"

**Solução:**
```bash
# Verificar se criou o index.ts
ls backend/src/modules/hrm/index.ts

# Se não existir, copiar
copy C:\Users\Bill\Downloads\hrm-index.ts backend\src\modules\hrm\index.ts
```

---

### Erro: "Property 'prisma' does not exist"

**Solução:**
```typescript
// Adicionar em app.ts (logo após criar o app)
app.decorate('prisma', prisma);
```

---

### Erro: "Module not found: @fastify/cors"

**Solução:**
```bash
npm install @fastify/cors
```

---

### Erro ao importar learning.routes

**Solução:**
Verificar se o caminho está correto em `hrm/index.ts`:
```typescript
import { learningRoutes } from './learning/learning.routes';
// Deve ser relativo: ./learning/...
```

---

## 📊 CHECKLIST FINAL

Antes de considerar pronto:

- [ ] Pastas criadas (`hrm/learning`, `hrm/positions`, `ai-orchestrator`)
- [ ] Arquivos copiados (5 arquivos: 2 learning, 1 matching, 1 auto-zettel, 1 index)
- [ ] `app.ts` atualizado com import do hrmModule
- [ ] Tipos do Fastify criados (`types/fastify.d.ts`)
- [ ] Servidor inicia sem erros
- [ ] Log mostra "✅ HRM Module registered"
- [ ] Endpoint `/api/hrm/learning-paths` responde (mesmo que vazio)
- [ ] Migration do banco aplicada com sucesso

---

## 🎯 ESTRUTURA FINAL ESPERADA

```
backend/
├── src/
│   ├── server.ts                     ✅
│   ├── app.ts                        ✅ (atualizado)
│   ├── types/
│   │   └── fastify.d.ts             ✅ (novo)
│   └── modules/
│       ├── knowledge/                ✅ (já existia)
│       ├── hrm/
│       │   ├── index.ts             ✅ (novo)
│       │   ├── learning/
│       │   │   ├── learning.service.ts  ✅ (novo)
│       │   │   └── learning.routes.ts   ✅ (novo)
│       │   └── positions/
│       │       └── matching.service.ts  ✅ (novo)
│       └── ai-orchestrator/
│           └── auto-zettel.service.ts   ✅ (novo)
└── prisma/
    ├── schema.prisma                ✅ (atualizado)
    └── seed-hrm.ts                  ✅ (novo)
```

---

## 🚀 PRÓXIMOS PASSOS

Depois que tudo estiver funcionando:

1. ✅ Rodar seed de dados
   ```bash
   npx tsx prisma/seed-hrm.ts
   ```

2. ✅ Testar criação de learning path via API

3. ✅ Implementar autenticação nos endpoints (se ainda não tiver)

4. ✅ Adicionar testes

5. ✅ Documentar com Swagger

---

**Tempo total estimado:** ~10 minutos

**Qualquer erro, me manda a mensagem que eu ajudo!** 🚀
