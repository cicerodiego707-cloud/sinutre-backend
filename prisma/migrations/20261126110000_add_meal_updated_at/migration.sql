-- Adiciona a coluna de última atualização
ALTER TABLE "meals"
ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Preserva a data original das refeições existentes
UPDATE "meals"
SET "updated_at" = "created_at";