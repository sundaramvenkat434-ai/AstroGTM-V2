/*
  # Create admin_settings table

  ## Summary
  Stores key-value configuration for the admin panel, currently used to hold
  the editable SEO formatting prompt that is sent to the OpenRouter LLM.

  ## New Tables
  - `admin_settings`
    - `id` (uuid, primary key)
    - `key` (text, unique) - Setting identifier, e.g. "seo_format_prompt"
    - `value` (text) - The setting value
    - `updated_at` (timestamptz) - Last update timestamp
    - `updated_by` (uuid, nullable) - References auth.users(id)

  ## Seed Data
  - Default row for `seo_format_prompt` with a production-ready SEO prompt

  ## Security
  - RLS enabled
  - Authenticated users can read all settings
  - Authenticated users can update settings
  - No public (unauthenticated) read access
*/

CREATE TABLE IF NOT EXISTS admin_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text NOT NULL DEFAULT '',
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read settings"
  ON admin_settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can update settings"
  ON admin_settings FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can insert settings"
  ON admin_settings FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Seed default SEO format prompt
INSERT INTO admin_settings (key, value)
VALUES (
  'seo_format_prompt',
  'You are an expert SEO content strategist and copywriter. Your task is to transform raw extracted website content into a fully optimized SEO page.

Given the extracted content below, produce a JSON response with these exact fields:
- "title": A compelling, keyword-rich H1 page title (under 70 characters)
- "meta_title": An optimized meta title for search engines (50-60 characters)
- "meta_description": A persuasive meta description that drives clicks (120-160 characters)
- "focus_keyword": The single most important target keyword phrase
- "excerpt": A short 1-2 sentence summary of the page (under 200 characters)
- "content": Full SEO-optimized HTML page body using proper heading hierarchy (h2, h3), keyword-rich paragraphs, and well-structured sections. Include a compelling introduction, several informational sections with descriptive headings, and a clear call-to-action at the end. Use <ul> or <ol> lists where appropriate. Aim for 600-900 words of high-quality content.

Return ONLY valid JSON. No markdown code fences, no explanation, just the JSON object.'
)
ON CONFLICT (key) DO NOTHING;
