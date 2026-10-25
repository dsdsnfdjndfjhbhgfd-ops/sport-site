-- Коллекции товаров вместо поля Product.season.
-- Шаг 1 выполняется до выкладки нового кода: он только добавляет таблицы, старый код их не замечает.
-- Шаг 2 — после выкладки, когда сайт уже не читает Product.season.

-- ===== Шаг 1 =====
begin;

CREATE TABLE "Collection" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Collection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CollectionItem" (
    "collectionId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "CollectionItem_pkey" PRIMARY KEY ("collectionId","productId")
);

CREATE UNIQUE INDEX "Collection_slug_key" ON "Collection"("slug");
CREATE INDEX "CollectionItem_productId_idx" ON "CollectionItem"("productId");
ALTER TABLE "CollectionItem" ADD CONSTRAINT "CollectionItem_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CollectionItem" ADD CONSTRAINT "CollectionItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- как у остальных таблиц: владелец — роль сайта, публичный API Supabase доступа не имеет
ALTER TABLE "Collection" OWNER TO prisma;
ALTER TABLE "CollectionItem" OWNER TO prisma;
ALTER TABLE "Collection" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CollectionItem" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "Collection", "CollectionItem" FROM anon, authenticated;

-- каждый заполненный сезон становится коллекцией, в том же порядке, что на старой странице
WITH seasons AS (
  SELECT season AS name, row_number() OVER (ORDER BY season DESC) - 1 AS position
  FROM "Product" WHERE season IS NOT NULL GROUP BY season
), slugs AS (
  SELECT name, position,
    trim(both '-' from regexp_replace(
      translate(
        replace(replace(replace(replace(replace(replace(replace(replace(lower(name),
          'щ', 'sch'), 'ш', 'sh'), 'ч', 'ch'), 'ж', 'zh'), 'ц', 'ts'), 'ю', 'yu'), 'я', 'ya'), 'х', 'h'),
        'абвгдеёзийклмнопрстуфыэъь', 'abvgdeeziyklmnoprstufye'),
      '[^a-z0-9]+', '-', 'g')) AS slug
  FROM seasons
)
INSERT INTO "Collection" (id, slug, name, position)
SELECT 'season-' || md5(name), slug, name, position FROM slugs;

INSERT INTO "CollectionItem" ("collectionId", "productId", position)
SELECT 'season-' || md5(p.season), p.id, row_number() OVER (PARTITION BY p.season ORDER BY p."createdAt", p.id) - 1
FROM "Product" p WHERE p.season IS NOT NULL;

commit;

-- ===== Шаг 2 (после выкладки) =====
-- ALTER TABLE "Product" DROP COLUMN "season";
