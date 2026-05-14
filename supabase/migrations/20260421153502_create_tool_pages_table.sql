/*
  # Create tool_pages table

  Stores AI-generated structured tool page data for live publishing.

  1. New Tables
    - `tool_pages`
      - `id` (uuid, primary key)
      - `slug` (text, unique) - URL-safe identifier for the tool page
      - `name` (text) - Tool/product name
      - `tagline` (text) - Short value proposition
      - `description` (text) - Brief 1-2 sentence description
      - `long_description` (text) - Detailed about section
      - `category` (text) - One of: seo, analytics, developer, marketing, security, design, infrastructure
      - `tags` (jsonb) - Array of keyword tags
      - `badge` (text, nullable) - One of: new, popular, free, or null
      - `rating` (numeric) - Rating value 0-5
      - `rating_count` (text) - Display string for review count
      - `users` (text) - Display string for user count
      - `features` (jsonb) - Array of {title, description} objects
      - `use_cases` (jsonb) - Array of use case strings
      - `pricing` (jsonb) - Array of {plan, price, features, highlighted} objects
      - `faqs` (jsonb) - Array of {q, a} objects
      - `stats` (jsonb) - Array of {label, value} objects
      - `meta_title` (text) - SEO meta title
      - `meta_description` (text) - SEO meta description
      - `focus_keyword` (text) - Primary SEO keyword
      - `status` (text) - draft or published
      - `author_id` (uuid) - References auth.users
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      - `published_at` (timestamptz, nullable)

  2. Security
    - Enable RLS on `tool_pages` table
    - Authenticated users can CRUD their own tool pages
    - Anyone can read published tool pages
*/

CREATE TABLE IF NOT EXISTS tool_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL DEFAULT '',
  tagline text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  long_description text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'developer',
  tags jsonb NOT NULL DEFAULT '[]'::jsonb,
  badge text DEFAULT NULL,
  rating numeric NOT NULL DEFAULT 4.5,
  rating_count text NOT NULL DEFAULT '0',
  users text NOT NULL DEFAULT '0',
  features jsonb NOT NULL DEFAULT '[]'::jsonb,
  use_cases jsonb NOT NULL DEFAULT '[]'::jsonb,
  pricing jsonb NOT NULL DEFAULT '[]'::jsonb,
  faqs jsonb NOT NULL DEFAULT '[]'::jsonb,
  stats jsonb NOT NULL DEFAULT '[]'::jsonb,
  meta_title text NOT NULL DEFAULT '',
  meta_description text NOT NULL DEFAULT '',
  focus_keyword text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'draft',
  author_id uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz DEFAULT NULL
);

ALTER TABLE tool_pages ENABLE ROW LEVEL SECURITY;

-- Anyone can view published tool pages
CREATE POLICY "Public can view published tool pages"
  ON tool_pages
  FOR SELECT
  USING (status = 'published');

-- Authenticated users can view their own draft tool pages
CREATE POLICY "Authors can view own tool pages"
  ON tool_pages
  FOR SELECT
  TO authenticated
  USING (auth.uid() = author_id);

-- Authenticated users can insert their own tool pages
CREATE POLICY "Authors can insert own tool pages"
  ON tool_pages
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = author_id);

-- Authenticated users can update their own tool pages
CREATE POLICY "Authors can update own tool pages"
  ON tool_pages
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

-- Authenticated users can delete their own tool pages
CREATE POLICY "Authors can delete own tool pages"
  ON tool_pages
  FOR DELETE
  TO authenticated
  USING (auth.uid() = author_id);
