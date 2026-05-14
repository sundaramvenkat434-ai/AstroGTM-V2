/*
  # Allow lighthouse_scores for tool_pages

  ## Summary
  Drops the foreign key constraint on lighthouse_scores.page_id that
  previously only allowed references to the `pages` table. The column
  is now a plain uuid so it can hold IDs from either `pages` or
  `tool_pages`, since the Lighthouse scoring feature is used from
  the tool-page creation flow.

  ## Changes
  - Dropped FK constraint `lighthouse_scores_page_id_fkey`
  - page_id column is preserved as a NOT NULL uuid (no data change)

  ## Notes
  - The unique index on (page_id, strategy) is preserved.
  - The existing index on page_id is preserved.
  - RLS policies are unchanged.
*/

ALTER TABLE lighthouse_scores
  DROP CONSTRAINT IF EXISTS lighthouse_scores_page_id_fkey;
