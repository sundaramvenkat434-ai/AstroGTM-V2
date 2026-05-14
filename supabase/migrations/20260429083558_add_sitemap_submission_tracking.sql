/*
  # Add Sitemap Submission Tracking

  Enhances sitemap management with:

  1. New Tables
    - `sitemap_submissions` — log of each time sitemap was submitted/regenerated
      - `id` (uuid, primary key)
      - `submitted_at` (timestamptz) — when the submission happened
      - `total_urls` (int) — total URLs included in that submission
      - `index_allowed` (int) — URLs with robots index allowed
      - `noindex_count` (int) — URLs that correspond to noindex pages
      - `submitted_by` (uuid) — admin user
      - `notes` (text) — optional notes

  2. Schema Changes
    - Add `noindex` boolean to `sitemap_entries` — flag to surface noindex status in admin
    - Add `page_type` text to `sitemap_entries` — homepage/category/tool/content/custom

  3. Security
    - RLS enabled on sitemap_submissions
    - Only authenticated users can insert/read
*/

-- Add page_type and noindex columns to sitemap_entries
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sitemap_entries' AND column_name = 'page_type'
  ) THEN
    ALTER TABLE sitemap_entries ADD COLUMN page_type text NOT NULL DEFAULT 'custom';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sitemap_entries' AND column_name = 'noindex'
  ) THEN
    ALTER TABLE sitemap_entries ADD COLUMN noindex boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- Create sitemap_submissions log table
CREATE TABLE IF NOT EXISTS sitemap_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submitted_at timestamptz NOT NULL DEFAULT now(),
  total_urls integer NOT NULL DEFAULT 0,
  index_allowed integer NOT NULL DEFAULT 0,
  noindex_count integer NOT NULL DEFAULT 0,
  submitted_by uuid REFERENCES auth.users(id),
  notes text NOT NULL DEFAULT ''
);

ALTER TABLE sitemap_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can insert submissions"
  ON sitemap_submissions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = submitted_by);

CREATE POLICY "Authenticated users can view submissions"
  ON sitemap_submissions
  FOR SELECT
  TO authenticated
  USING (true);
