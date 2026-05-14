/*
  # Create sitemap_entries table

  Stores manually curated and AI-suggested sitemap entries for the XML sitemap.
  Each entry represents a URL that should appear in the sitemap.

  1. New Tables
    - `sitemap_entries`
      - `id` (uuid, primary key)
      - `loc` (text, unique) - The URL path (e.g., /tools/ai-gift-finder)
      - `lastmod` (timestamptz) - Last modification date for the URL
      - `changefreq` (text) - How frequently the page changes (daily, weekly, monthly, yearly)
      - `priority` (numeric) - Priority of this URL relative to other URLs (0.0 to 1.0)
      - `source` (text) - Origin of the entry: 'manual', 'auto_tool_pages', 'auto_pages', 'auto_category', 'ai_suggested'
      - `source_table` (text, nullable) - Which table this was derived from (tool_pages, pages, or null for manual)
      - `source_id` (uuid, nullable) - The ID from the source table
      - `enabled` (boolean) - Whether this entry is included in the sitemap
      - `title` (text) - Human-readable label for the admin UI
      - `author_id` (uuid) - References auth.users
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `sitemap_entries` table
    - Authenticated users can CRUD their own entries
    - Public can read enabled entries (needed for sitemap generation)

  3. Important Notes
    - The `loc` column stores relative paths; the sitemap route prepends the site URL
    - The `source` column tracks how the entry was created for audit purposes
    - `enabled` allows soft-disabling entries without deleting them
*/

CREATE TABLE IF NOT EXISTS sitemap_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loc text UNIQUE NOT NULL,
  lastmod timestamptz NOT NULL DEFAULT now(),
  changefreq text NOT NULL DEFAULT 'weekly',
  priority numeric NOT NULL DEFAULT 0.5,
  source text NOT NULL DEFAULT 'manual',
  source_table text DEFAULT NULL,
  source_id uuid DEFAULT NULL,
  enabled boolean NOT NULL DEFAULT true,
  title text NOT NULL DEFAULT '',
  author_id uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE sitemap_entries ENABLE ROW LEVEL SECURITY;

-- Public can read enabled sitemap entries (required for sitemap.xml generation)
CREATE POLICY "Public can view enabled sitemap entries"
  ON sitemap_entries
  FOR SELECT
  USING (enabled = true);

-- Authenticated users can view all their own entries (including disabled)
CREATE POLICY "Authors can view own sitemap entries"
  ON sitemap_entries
  FOR SELECT
  TO authenticated
  USING (auth.uid() = author_id);

-- Authenticated users can insert their own entries
CREATE POLICY "Authors can insert own sitemap entries"
  ON sitemap_entries
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = author_id);

-- Authenticated users can update their own entries
CREATE POLICY "Authors can update own sitemap entries"
  ON sitemap_entries
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

-- Authenticated users can delete their own entries
CREATE POLICY "Authors can delete own sitemap entries"
  ON sitemap_entries
  FOR DELETE
  TO authenticated
  USING (auth.uid() = author_id);
