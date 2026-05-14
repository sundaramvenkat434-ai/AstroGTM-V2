/*
  # Add noindex column to tool_pages

  ## Summary
  Adds a `noindex` boolean column to the `tool_pages` table, allowing
  admins to toggle whether a page should be indexed by search engines.

  ## Modified Tables
  - `tool_pages`
    - `noindex` (boolean, default false) - When true, the page's meta
      robots tag will include "noindex" to prevent search engine indexing.

  ## Notes
  - Defaults to false so all existing pages remain indexed.
  - Uses IF NOT EXISTS guard for idempotency.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tool_pages' AND column_name = 'noindex'
  ) THEN
    ALTER TABLE tool_pages ADD COLUMN noindex boolean NOT NULL DEFAULT false;
  END IF;
END $$;
