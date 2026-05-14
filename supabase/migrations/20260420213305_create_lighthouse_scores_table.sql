/*
  # Create lighthouse_scores table

  1. New Tables
    - `lighthouse_scores`
      - `id` (uuid, primary key)
      - `page_id` (uuid, FK to pages, cascade delete)
      - `strategy` (text: 'mobile' | 'desktop')
      - `performance` (integer, 0-100)
      - `accessibility` (integer, 0-100)
      - `best_practices` (integer, 0-100)
      - `seo` (integer, 0-100)
      - `raw_report` (jsonb, full Lighthouse categories + key audits)
      - `fetched_at` (timestamptz)

  2. Indexes
    - Unique index on (page_id, strategy) — one latest result per page per strategy
    - Index on page_id for fast lookups

  3. Security
    - Enable RLS
    - Only authenticated users can read lighthouse scores
    - Only authenticated users can insert/update (via service role from edge function,
      but also allow authenticated admin users directly)
*/

CREATE TABLE IF NOT EXISTS lighthouse_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id uuid NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  strategy text NOT NULL DEFAULT 'mobile' CHECK (strategy IN ('mobile', 'desktop')),
  performance integer,
  accessibility integer,
  best_practices integer,
  seo integer,
  raw_report jsonb,
  fetched_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS lighthouse_scores_page_strategy_idx
  ON lighthouse_scores (page_id, strategy);

CREATE INDEX IF NOT EXISTS lighthouse_scores_page_id_idx
  ON lighthouse_scores (page_id);

ALTER TABLE lighthouse_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read lighthouse scores"
  ON lighthouse_scores FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert lighthouse scores"
  ON lighthouse_scores FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update lighthouse scores"
  ON lighthouse_scores FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);
