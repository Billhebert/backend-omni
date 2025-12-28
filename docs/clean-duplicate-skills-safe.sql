-- clean-duplicate-skills-safe.sql
-- Versão SEGURA que preserva relações com employee_skills

BEGIN;

-- 1. Criar tabela temporária com skills que devem ser mantidas
CREATE TEMP TABLE skills_to_keep AS
SELECT MIN(id) as id, "companyId", name
FROM skills
GROUP BY "companyId", name;

-- 2. Ver quais skills serão deletadas
SELECT s.id, s."companyId", s.name, s.category
FROM skills s
WHERE s.id NOT IN (SELECT id FROM skills_to_keep)
ORDER BY s."companyId", s.name;

-- 3. Atualizar employee_skills que referenciam skills duplicadas
-- para apontar para a skill que será mantida
UPDATE employee_skills es
SET "skillId" = (
    SELECT stk.id 
    FROM skills_to_keep stk
    JOIN skills s ON s.id = es."skillId"
    WHERE stk."companyId" = s."companyId" 
      AND stk.name = s.name
)
WHERE es."skillId" NOT IN (SELECT id FROM skills_to_keep);

-- 4. Deletar skills duplicadas
DELETE FROM skills
WHERE id NOT IN (SELECT id FROM skills_to_keep);

-- 5. Verificar resultado
SELECT 
    'Total skills mantidas' as info,
    COUNT(*) as count
FROM skills
UNION ALL
SELECT 
    'Duplicatas encontradas' as info,
    COUNT(*) as count
FROM (
    SELECT "companyId", name, COUNT(*) as cnt
    FROM skills 
    GROUP BY "companyId", name 
    HAVING COUNT(*) > 1
) duplicates;

-- Se tudo estiver OK, faça:
COMMIT;

-- Se algo estiver errado:
-- ROLLBACK;
