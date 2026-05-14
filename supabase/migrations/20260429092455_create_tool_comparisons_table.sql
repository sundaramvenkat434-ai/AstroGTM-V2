/*
  # Create tool_comparisons table

  Stores AI-generated head-to-head comparison pages between exactly two tools.

  1. New Tables
    - `tool_comparisons`
      - `id` (uuid, primary key)
      - `slug` (text, unique per category) — e.g. "semrush-vs-ahrefs"
      - `name` (text) — display title, e.g. "SEMrush vs Ahrefs: Which Is Best?"
      - `tagline` (text) — one-line description
      - `category` (text) — tool category
      - `tool_ids` (jsonb) — array of exactly 2 tool page IDs
      - `intro` (text) — opening paragraph
      - `outro` (text) — closing/recommendation paragraph
      - `verdict` (text) — overall winner summary
      - `sections` (jsonb) — structured comparison sections [{title, dimension, tool_a_value, tool_b_value, winner_id, notes}]
      - `feature_matrix` (jsonb) — feature-by-feature table [{feature, tool_a, tool_b, winner_id}]
      - `tool_a_entry` (jsonb) — deep analysis for tool A {tool_id, score, pros, cons, pricing_summary, best_for, verdict}
      - `tool_b_entry` (jsonb) — deep analysis for tool B
      - `use_case_winners` (jsonb) — [{use_case, winner_id, reason}]
      - `faqs` (jsonb) — [{q, a}]
      - `meta_title` (text)
      - `meta_description` (text)
      - `focus_keyword` (text)
      - `status` (text) — draft | published
      - `noindex` (boolean)
      - `author_id` (uuid)
      - `created_at`, `updated_at`, `published_at` (timestamptz)

  2. Constraints
    - `(category, slug)` unique constraint

  3. Security
    - RLS enabled
    - Public can read published entries
    - Authenticated users (admins) can insert, update, delete

  4. Notes
    - Exactly 2 tools per comparison (enforced at application layer)
    - feature_matrix and sections provide the structured comparison data
    - use_case_winners replaces best_for_segments from top_x pattern
*/

CREATE TABLE IF NOT EXISTS tool_comparisons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL,
  name text NOT NULL DEFAULT '',
  tagline text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT '',
  tool_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  intro text NOT NULL DEFAULT '',
  outro text NOT NULL DEFAULT '',
  verdict text NOT NULL DEFAULT '',
  sections jsonb NOT NULL DEFAULT '[]'::jsonb,
  feature_matrix jsonb NOT NULL DEFAULT '[]'::jsonb,
  tool_a_entry jsonb NOT NULL DEFAULT '{}'::jsonb,
  tool_b_entry jsonb NOT NULL DEFAULT '{}'::jsonb,
  use_case_winners jsonb NOT NULL DEFAULT '[]'::jsonb,
  faqs jsonb NOT NULL DEFAULT '[]'::jsonb,
  meta_title text NOT NULL DEFAULT '',
  meta_description text NOT NULL DEFAULT '',
  focus_keyword text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'draft',
  noindex boolean NOT NULL DEFAULT false,
  author_id uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz,
  UNIQUE (category, slug)
);

ALTER TABLE tool_comparisons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read published comparisons"
  ON tool_comparisons
  FOR SELECT
  USING (status = 'published' AND noindex = false);

CREATE POLICY "Authenticated users can read all comparisons"
  ON tool_comparisons
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert comparisons"
  ON tool_comparisons
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Authenticated users can update comparisons"
  ON tool_comparisons
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Authenticated users can delete comparisons"
  ON tool_comparisons
  FOR DELETE
  TO authenticated
  USING (auth.uid() = author_id);

CREATE INDEX IF NOT EXISTS tool_comparisons_category_idx ON tool_comparisons (category);
CREATE INDEX IF NOT EXISTS tool_comparisons_status_idx ON tool_comparisons (status);
CREATE INDEX IF NOT EXISTS tool_comparisons_updated_at_idx ON tool_comparisons (updated_at DESC);
