/*
  # Create robots_txt table

  Stores the robots.txt content managed via admin UI.

  1. New Tables
    - `robots_txt`
      - `id` (uuid, primary key)
      - `content` (text) — full robots.txt content
      - `updated_at` (timestamptz)
      - `updated_by` (uuid) — admin user who last saved

  2. Security
    - RLS enabled
    - Public can read (needed to serve /robots.txt dynamically)
    - Authenticated users can insert and update

  3. Notes
    - Only one row will ever exist (upserted by a fixed key)
    - A `singleton_key` unique column enforces the single-row constraint
*/

CREATE TABLE IF NOT EXISTS robots_txt (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  singleton_key text UNIQUE NOT NULL DEFAULT 'default',
  content text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

ALTER TABLE robots_txt ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read robots_txt"
  ON robots_txt
  FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert robots_txt"
  ON robots_txt
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update robots_txt"
  ON robots_txt
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);
