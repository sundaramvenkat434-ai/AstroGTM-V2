/*
  # Add E-E-A-T and enrichment fields to tool_pages

  Adds all fields needed for E-E-A-T signals, rich content, and SEO enrichment:

  ## New columns
  - pros (jsonb) — array of string pros
  - cons (jsonb) — array of string cons
  - what_we_learned (jsonb) — { use_case, bullets[] }
  - honest_take (jsonb) — array of string bullets
  - logo_url (text) — URL to tool logo image
  - logo_alt (text) — alt text for logo
  - screenshots (jsonb) — array of { url, alt }
  - official_website (text) — official tool URL
  - founder_name (text)
  - founder_linkedin (text)
  - latest_news (jsonb) — array of { title, url }
  - published_date (timestamptz)
  - updated_date (timestamptz)
*/

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tool_pages' AND column_name = 'pros') THEN
    ALTER TABLE tool_pages ADD COLUMN pros jsonb DEFAULT '[]'::jsonb;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tool_pages' AND column_name = 'cons') THEN
    ALTER TABLE tool_pages ADD COLUMN cons jsonb DEFAULT '[]'::jsonb;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tool_pages' AND column_name = 'what_we_learned') THEN
    ALTER TABLE tool_pages ADD COLUMN what_we_learned jsonb DEFAULT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tool_pages' AND column_name = 'honest_take') THEN
    ALTER TABLE tool_pages ADD COLUMN honest_take jsonb DEFAULT '[]'::jsonb;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tool_pages' AND column_name = 'logo_url') THEN
    ALTER TABLE tool_pages ADD COLUMN logo_url text DEFAULT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tool_pages' AND column_name = 'logo_alt') THEN
    ALTER TABLE tool_pages ADD COLUMN logo_alt text DEFAULT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tool_pages' AND column_name = 'screenshots') THEN
    ALTER TABLE tool_pages ADD COLUMN screenshots jsonb DEFAULT '[]'::jsonb;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tool_pages' AND column_name = 'official_website') THEN
    ALTER TABLE tool_pages ADD COLUMN official_website text DEFAULT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tool_pages' AND column_name = 'founder_name') THEN
    ALTER TABLE tool_pages ADD COLUMN founder_name text DEFAULT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tool_pages' AND column_name = 'founder_linkedin') THEN
    ALTER TABLE tool_pages ADD COLUMN founder_linkedin text DEFAULT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tool_pages' AND column_name = 'latest_news') THEN
    ALTER TABLE tool_pages ADD COLUMN latest_news jsonb DEFAULT '[]'::jsonb;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tool_pages' AND column_name = 'published_date') THEN
    ALTER TABLE tool_pages ADD COLUMN published_date timestamptz DEFAULT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tool_pages' AND column_name = 'updated_date') THEN
    ALTER TABLE tool_pages ADD COLUMN updated_date timestamptz DEFAULT NULL;
  END IF;
END $$;
