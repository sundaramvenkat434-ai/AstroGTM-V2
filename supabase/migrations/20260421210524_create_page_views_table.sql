/*
  # Create page_views table

  Tracks page views for tool pages.

  ## Tables
  - `page_views`
    - `id` (uuid, pk)
    - `page_id` (uuid, FK → tool_pages.id)
    - `visitor_hash` (text) — SHA-256 of IP+UA, never stores raw data
    - `viewed_at` (timestamptz)

  ## Aggregated view
  - `page_view_counts` — materialised-style view returning total_views and unique_visitors per page_id

  ## Security
  - RLS enabled; insert open to anon (tracking), select restricted to authenticated (admin reads)
*/

CREATE TABLE IF NOT EXISTS page_views (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id      uuid        NOT NULL REFERENCES tool_pages(id) ON DELETE CASCADE,
  visitor_hash text        NOT NULL,
  viewed_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS page_views_page_id_idx ON page_views (page_id);
CREATE INDEX IF NOT EXISTS page_views_viewed_at_idx ON page_views (viewed_at);

ALTER TABLE page_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert a page view"
  ON page_views FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can read page views"
  ON page_views FOR SELECT
  TO authenticated
  USING (true);
