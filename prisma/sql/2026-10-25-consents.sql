-- Отдельное согласие на обработку персональных данных и подтверждение возраста при регистрации.
-- Только добавляет пустые колонки: можно выполнять до выкладки кода, старый код их не замечает.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "personalDataConsentAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "adultConfirmedAt" TIMESTAMP(3);
