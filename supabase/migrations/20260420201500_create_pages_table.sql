/*
  # Create Pages Table for CMS

  1. New Tables
    - `pages`
      - `id` (uuid, primary key)
      - `slug` (text, unique) - URL slug for the page
      - `title` (text) - Page title / H1
      - `meta_title` (text) - SEO meta title (falls back to title)
      - `meta_description` (text) - SEO meta description
      - `og_image` (text) - Open Graph image URL
      - `canonical_url` (text) - Canonical URL override
      - `content` (text) - HTML content of the page
      - `status` (text) - 'draft' or 'published'
      - `author_id` (uuid) - References auth.users
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      - `published_at` (timestamptz)
      - `focus_keyword` (text) - Primary SEO keyword
      - `schema_markup` (jsonb) - Structured data / JSON-LD
      - `robots` (text) - Robots meta tag value
      - `excerpt` (text) - Short summary for listings

  2. Security
    - Enable RLS on `pages` table
    - Authenticated users can CRUD their own pages
    - Public can read published pages

  3. Indexes
    - Unique index on slug
    - Index on status for filtering
    - Index on author_id for ownership queries
*/

CREATE TABLE IF NOT EXISTS pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL DEFAULT '',
  meta_title text DEFAULT '',
  meta_description text DEFAULT '',
  og_image text DEFAULT '',
  canonical_url text DEFAULT '',
  content text DEFAULT '',
  status text NOT NULL DEFAULT 'draft',
  author_id uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  published_at timestamptz,
  focus_keyword text DEFAULT '',
  schema_markup jsonb DEFAULT '{}',
  robots text DEFAULT 'index, follow',
  excerpt text DEFAULT ''
);

ALTER TABLE pages ENABLE ROW LEVEL SECURITY;

-- Public can read published pages (needed for SEO / crawlers)
CREATE POLICY "Anyone can read published pages"
  ON pages FOR SELECT
  USING (status = 'published');

-- Authenticated users can read all their own pages (including drafts)
CREATE POLICY "Authors can read own pages"
  ON pages FOR SELECT
  TO authenticated
  USING (auth.uid() = author_id);

-- Authenticated users can insert their own pages
CREATE POLICY "Authors can create pages"
  ON pages FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = author_id);

-- Authenticated users can update their own pages
CREATE POLICY "Authors can update own pages"
  ON pages FOR UPDATE
  TO authenticated
  USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

-- Authenticated users can delete their own pages
CREATE POLICY "Authors can delete own pages"
  ON pages FOR DELETE
  TO authenticated
  USING (auth.uid() = author_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pages_status ON pages(status);
CREATE INDEX IF NOT EXISTS idx_pages_author_id ON pages(author_id);
CREATE INDEX IF NOT EXISTS idx_pages_slug ON pages(slug);
