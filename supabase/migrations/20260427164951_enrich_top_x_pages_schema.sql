/*
  # Enrich top_x_pages schema for rich comparison layout

  Adds/renames fields to support:
  - Per-tool rich entries (pros, cons, pricing, best_for, score)
  - Comparison table rows
  - FAQs
  - Best-for sections
  - Page-level name/tagline/outro

  1. Changes to top_x_pages
    - Add `name` (text) — page title (mirrors old `title`)
    - Add `tagline` (text) — subtitle
    - Add `outro` (text) — conclusion paragraph (mirrors old `conclusion`)
    - Add `faqs` (jsonb) — array of {q, a}
    - Add `best_for` (jsonb) — array of {segment, label, tool_id, reason}
    - Rename `entries` already exists; ensure `comparison_table` already exists
    - Keep legacy columns intact (title, conclusion, topic) for compatibility
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'top_x_pages' AND column_name = 'name'
  ) THEN
    ALTER TABLE top_x_pages ADD COLUMN name text NOT NULL DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'top_x_pages' AND column_name = 'tagline'
  ) THEN
    ALTER TABLE top_x_pages ADD COLUMN tagline text NOT NULL DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'top_x_pages' AND column_name = 'outro'
  ) THEN
    ALTER TABLE top_x_pages ADD COLUMN outro text NOT NULL DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'top_x_pages' AND column_name = 'faqs'
  ) THEN
    ALTER TABLE top_x_pages ADD COLUMN faqs jsonb NOT NULL DEFAULT '[]'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'top_x_pages' AND column_name = 'best_for'
  ) THEN
    ALTER TABLE top_x_pages ADD COLUMN best_for jsonb NOT NULL DEFAULT '[]'::jsonb;
  END IF;
END $$;
