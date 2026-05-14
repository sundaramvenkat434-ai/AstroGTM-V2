/*
  # Allow eeat_scores for tool_pages

  ## Summary
  Drops the foreign key constraint on eeat_scores.page_id that
  previously only allowed references to the `pages` table. The column
  is now a plain uuid so it can hold IDs from `tool_pages`, since
  the E-E-A-T scoring feature is triggered from the admin dashboard
  for tool pages.

  ## Changes
  - Dropped FK constraint `eeat_scores_page_id_fkey`
  - page_id column is preserved as a NOT NULL uuid with unique index

  ## Notes
  - The unique index on page_id is preserved (one score per page).
  - RLS policies are unchanged.
*/

ALTER TABLE eeat_scores
  DROP CONSTRAINT IF EXISTS eeat_scores_page_id_fkey;
