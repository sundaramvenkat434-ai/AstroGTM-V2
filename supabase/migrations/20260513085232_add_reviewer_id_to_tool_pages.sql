/*
  # Add reviewer_id to tool_pages

  Links each tool page to an author profile from the `authors` table.
  This is separate from `author_id` which references auth.users.
  reviewer_id references the editorial author who wrote/reviewed the tool page.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tool_pages' AND column_name = 'reviewer_id'
  ) THEN
    ALTER TABLE tool_pages ADD COLUMN reviewer_id uuid REFERENCES authors(id);
  END IF;
END $$;
