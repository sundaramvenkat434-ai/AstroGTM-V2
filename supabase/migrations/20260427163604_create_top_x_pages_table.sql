/*
  # Create top_x_pages table

  Stores AI-generated "Top X" comparison/list pages that live at the same
  /category/{category}/{slug} route as tool pages.

  1. New Tables
    - `top_x_pages`
      - `id` (uuid, primary key)
      - `slug` (text, not globally unique — unique per category instead)
      - `name` (text) - Page title, e.g. "Best SEO Tools for Beginners"
      - `tagline` (text) - Short subtitle
      - `category` (text) - One of the 7 supported categories
      - `tool_ids` (jsonb) - Ordered array of tool_pages UUIDs (3–10 items)
      - `intro` (text) - Opening paragraph before the tool list
      - `outro` (text) - Closing/conclusion paragraph
      - `faqs` (jsonb) - Array of {q, a} objects
      - `meta_title` (text)
      - `meta_description` (text)
      - `focus_keyword` (text)
      - `noindex` (boolean, default false)
      - `status` (text) - draft or published
      - `author_id` (uuid)
      - `created_at`, `updated_at`, `published_at`

  2. Constraints
    - Unique slug per category (enforced via unique index)
    - Slug cannot collide with tool_pages slugs in the same category
      (enforced at application level via check before insert)

  3. Security
    - RLS enabled
    - Public can read published rows
    - Authors can CRUD their own rows
*/

CREATE TABLE IF NOT EXISTS top_x_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL,
  name text NOT NULL DEFAULT '',
  tagline text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'developer',
  tool_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  intro text NOT NULL DEFAULT '',
  outro text NOT NULL DEFAULT '',
  faqs jsonb NOT NULL DEFAULT '[]'::jsonb,
  meta_title text NOT NULL DEFAULT '',
  meta_description text NOT NULL DEFAULT '',
  focus_keyword text NOT NULL DEFAULT '',
  noindex boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'draft',
  author_id uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz DEFAULT NULL
);

-- Slug must be unique within a category
CREATE UNIQUE INDEX IF NOT EXISTS top_x_pages_category_slug_key
  ON top_x_pages (category, slug);

ALTER TABLE top_x_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view published top x pages"
  ON top_x_pages
  FOR SELECT
  USING (status = 'published');

CREATE POLICY "Authors can view own top x pages"
  ON top_x_pages
  FOR SELECT
  TO authenticated
  USING (auth.uid() = author_id);

CREATE POLICY "Authors can insert own top x pages"
  ON top_x_pages
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Authors can update own top x pages"
  ON top_x_pages
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Authors can delete own top x pages"
  ON top_x_pages
  FOR DELETE
  TO authenticated
  USING (auth.uid() = author_id);
