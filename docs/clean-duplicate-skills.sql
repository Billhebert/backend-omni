-- clean-duplicate-skills.sql
-- Execute ANTES de rodar a migration

-- 1. Ver quais skills estão duplicadas
SELECT "companyId", name, COUNT(*) as count
FROM skills 
GROUP BY "companyId", name 
HAVING COUNT(*) > 1
ORDER BY count DESC;

-- 2. Deletar duplicatas mantendo apenas o registro mais antigo (menor createdAt)
-- Se não tiver createdAt, mantém o de menor id
DELETE FROM skills
WHERE id NOT IN (
    SELECT MIN(id)
    FROM skills
    GROUP BY "companyId", name
);

-- 3. Verificar que não há mais duplicatas
SELECT "companyId", name, COUNT(*) as count
FROM skills 
GROUP BY "companyId", name 
HAVING COUNT(*) > 1;
-- Deve retornar 0 linhas

-- 4. Agora você pode aplicar a migration
-- npx prisma migrate dev --name add_hrm_crm_erp_tables
