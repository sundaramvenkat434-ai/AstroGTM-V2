/*
  # Add website_url and claim fields to tool_pages; create listing_claims table

  1. New columns on tool_pages: website_url, website_clicks, is_claimed, claimed_founded_by,
     claimed_founder_names, claimed_founder_linkedin, claimed_about_bio
  2. New table: listing_claims — public claim submissions, admin review
  3. RPC: increment_website_clicks
*/

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tool_pages' AND column_name='website_url') THEN
    ALTER TABLE tool_pages ADD COLUMN website_url text DEFAULT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tool_pages' AND column_name='website_clicks') THEN
    ALTER TABLE tool_pages ADD COLUMN website_clicks integer DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tool_pages' AND column_name='is_claimed') THEN
    ALTER TABLE tool_pages ADD COLUMN is_claimed boolean DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tool_pages' AND column_name='claimed_founded_by') THEN
    ALTER TABLE tool_pages ADD COLUMN claimed_founded_by text DEFAULT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tool_pages' AND column_name='claimed_founder_names') THEN
    ALTER TABLE tool_pages ADD COLUMN claimed_founder_names text DEFAULT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tool_pages' AND column_name='claimed_founder_linkedin') THEN
    ALTER TABLE tool_pages ADD COLUMN claimed_founder_linkedin text DEFAULT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tool_pages' AND column_name='claimed_about_bio') THEN
    ALTER TABLE tool_pages ADD COLUMN claimed_about_bio text DEFAULT NULL;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS listing_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_id uuid NOT NULL REFERENCES tool_pages(id) ON DELETE CASCADE,
  tool_name text NOT NULL DEFAULT '',
  name text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  linkedin text DEFAULT NULL,
  website text DEFAULT NULL,
  status text NOT NULL DEFAULT 'pending',
  submitted_at timestamptz DEFAULT now(),
  reviewed_at timestamptz DEFAULT NULL
);

ALTER TABLE listing_claims ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='listing_claims' AND policyname='Public can submit claims') THEN
    CREATE POLICY "Public can submit claims" ON listing_claims FOR INSERT TO anon, authenticated WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='listing_claims' AND policyname='Authenticated can view claims') THEN
    CREATE POLICY "Authenticated can view claims" ON listing_claims FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='listing_claims' AND policyname='Authenticated can update claims') THEN
    CREATE POLICY "Authenticated can update claims" ON listing_claims FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='listing_claims' AND policyname='Authenticated can delete claims') THEN
    CREATE POLICY "Authenticated can delete claims" ON listing_claims FOR DELETE TO authenticated USING (true);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION increment_website_clicks(tool_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE tool_pages SET website_clicks = COALESCE(website_clicks, 0) + 1 WHERE id = tool_id;
$$;
