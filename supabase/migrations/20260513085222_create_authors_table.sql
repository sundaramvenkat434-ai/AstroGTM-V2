/*
  # Create Authors Table

  1. New Tables
    - `authors` — editorial reviewer/author profiles
      - `id` (uuid, primary key)
      - `slug` (text, unique) — URL-safe identifier for /author/[slug]
      - `name` (text)
      - `title` (text) — e.g. "Lead Reviewer, SEO & Content"
      - `bio` (text) — 2-3 paragraph bio
      - `avatar_initials` (text) — e.g. "VS" for avatar fallback
      - `avatar_color` (text) — tailwind bg class or hex
      - `linkedin_url` (text, nullable)
      - `twitter_url` (text, nullable)
      - `categories` (jsonb) — array of category slugs this author covers
      - `stats` (jsonb) — e.g. [{value: "6+", label: "Years in AI & SaaS"}]
      - `is_active` (boolean)
      - `sort_order` (integer)
      - `created_at`, `updated_at` (timestamptz)

  2. Security
    - Enable RLS
    - Public SELECT for active authors
    - Admin UPDATE/INSERT/DELETE (anon key can read, service role manages)

  3. Seed
    - 5 sample authors covering: SEO & Content, Lead Generation, Sales Outreach, Social Media, GTM / General
*/

CREATE TABLE IF NOT EXISTS authors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL DEFAULT '',
  title text NOT NULL DEFAULT '',
  bio text NOT NULL DEFAULT '',
  avatar_initials text NOT NULL DEFAULT '',
  avatar_color text NOT NULL DEFAULT '#0369a1',
  linkedin_url text,
  twitter_url text,
  categories jsonb NOT NULL DEFAULT '[]'::jsonb,
  stats jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE authors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active authors"
  ON authors FOR SELECT
  USING (is_active = true);

CREATE POLICY "Service role can insert authors"
  ON authors FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can update authors"
  ON authors FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can delete authors"
  ON authors FOR DELETE
  TO service_role
  USING (true);

-- Anon read (for public-facing pages reading from supabase-js client)
CREATE POLICY "Anon can read active authors"
  ON authors FOR SELECT
  TO anon
  USING (is_active = true);

-- Seed: 5 editorial authors
INSERT INTO authors (slug, name, title, bio, avatar_initials, avatar_color, linkedin_url, categories, stats, sort_order) VALUES

('venkat-sundaram',
 'Venkat Sundaram',
 'Lead Reviewer — SEO & Content Tools',
 'Venkat Sundaram is the lead editor at AstroGTM. He has spent 6+ years working at the intersection of AI, SaaS product development, and go-to-market strategy — building, shipping, and evaluating software tools across multiple high-growth startups. His reviews focus on real-world performance over benchmark theatre. Every tool is tested against practical use cases, not vendor-supplied demos. Venkat''s background in GTM means he evaluates tools not just on features, but on whether they actually move the needle for the teams using them.',
 'VS', '#0369a1',
 'https://linkedin.com/in/srvenkat94',
 '["seo-content", "lead-generation"]'::jsonb,
 '[{"value":"6+","label":"Years in AI & SaaS"},{"value":"200+","label":"Tools reviewed"},{"value":"40k+","label":"Monthly readers"}]'::jsonb,
 1),

('priya-mehta',
 'Priya Mehta',
 'Senior Reviewer — Lead Generation & Outbound',
 'Priya Mehta is a B2B demand generation specialist with 8 years of experience running outbound campaigns for SaaS companies from seed to Series C. She has personally managed over $2M in paid acquisition and tested hundreds of lead generation and prospecting tools. At AstroGTM she covers lead generation, prospecting platforms, and intent data tools. Her reviews cut through vendor noise to focus on what actually converts pipeline into revenue.',
 'PM', '#0d9488',
 'https://linkedin.com/in/priyamehta',
 '["lead-generation", "sales-outreach"]'::jsonb,
 '[{"value":"8+","label":"Years in B2B growth"},{"value":"150+","label":"Tools reviewed"},{"value":"$2M+","label":"Ad spend managed"}]'::jsonb,
 2),

('alex-rivera',
 'Alex Rivera',
 'Reviewer — Sales Outreach & CRM Tools',
 'Alex Rivera has spent 7 years in revenue operations and sales enablement, working with GTM teams at fast-growing SaaS companies across North America and Europe. He specialises in sales engagement platforms, sequencing tools, and CRM integrations. Alex evaluates tools through the lens of an AE and sales ops lead — he cares about deliverability, ease of personalisation, and how fast a rep can get a qualified sequence live. At AstroGTM he covers the full sales stack.',
 'AR', '#d97706',
 'https://linkedin.com/in/alexrivera-gtm',
 '["sales-outreach"]'::jsonb,
 '[{"value":"7+","label":"Years in RevOps"},{"value":"120+","label":"Tools reviewed"},{"value":"3x","label":"Revenue growth delivered"}]'::jsonb,
 3),

('sarah-chen',
 'Sarah Chen',
 'Reviewer — Social Media & Brand Tools',
 'Sarah Chen is a former head of social at two DTC brands and a content strategist with a decade of experience growing audiences across LinkedIn, Instagram, and X. She has managed social presences for brands from 10k to 2M followers and tested virtually every scheduling, analytics, and content creation tool on the market. At AstroGTM she covers social media management, creator tools, and AI-powered content platforms. Her reviews focus on real creator workflows, not ideal-state demos.',
 'SC', '#7c3aed',
 'https://linkedin.com/in/sarahchen-social',
 '["social-media"]'::jsonb,
 '[{"value":"10+","label":"Years in social media"},{"value":"100+","label":"Tools reviewed"},{"value":"2M+","label":"Followers grown"}]'::jsonb,
 4),

('marcus-okafor',
 'Marcus Okafor',
 'Contributor — GTM Strategy & Analytics',
 'Marcus Okafor is a GTM consultant and former VP of Marketing at two venture-backed startups. He has advised 40+ companies on go-to-market strategy, attribution, and analytics stack selection. His work sits at the intersection of data, messaging, and distribution — he is equally comfortable in a spreadsheet and a brand brief. At AstroGTM he contributes reviews of analytics, attribution, and cross-channel marketing tools, with a focus on what helps smaller teams punch above their weight.',
 'MO', '#059669',
 'https://linkedin.com/in/marcusokafor',
 '["lead-generation", "seo-content", "social-media"]'::jsonb,
 '[{"value":"12+","label":"Years in GTM"},{"value":"40+","label":"Companies advised"},{"value":"80+","label":"Tools reviewed"}]'::jsonb,
 5);
