/*
  # Add upvotes to tool_pages

  - Adds `upvotes` integer column with seeded believable counts for published tools
  - Creates `tool_upvote_ips` table to prevent duplicate votes per IP per tool
  - RLS: anyone can read upvotes; insert restricted to one per tool per fingerprint
*/

-- Add upvotes column
ALTER TABLE tool_pages ADD COLUMN IF NOT EXISTS upvotes integer NOT NULL DEFAULT 0;

-- Seed believable upvote counts for all published tools using a deterministic but varied formula
UPDATE tool_pages
SET upvotes = (
  -- base 800-3500, varied by the first byte of the id
  800 + (('x' || substr(id::text, 1, 8))::bit(32)::int & 2147483647) % 2700
)
WHERE status = 'published';

-- Table to track votes (fingerprint = hashed IP or browser fingerprint)
CREATE TABLE IF NOT EXISTS tool_upvotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_id uuid NOT NULL REFERENCES tool_pages(id) ON DELETE CASCADE,
  fingerprint text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(tool_id, fingerprint)
);

ALTER TABLE tool_upvotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert an upvote"
  ON tool_upvotes FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can read upvotes"
  ON tool_upvotes FOR SELECT
  TO anon, authenticated
  USING (true);
