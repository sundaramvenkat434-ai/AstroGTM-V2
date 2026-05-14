/*
  # Add increment_upvotes RPC function
  Used by the upvote-tool edge function to atomically increment the upvotes counter.
*/
CREATE OR REPLACE FUNCTION increment_upvotes(p_tool_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE v_count integer;
BEGIN
  UPDATE tool_pages SET upvotes = upvotes + 1 WHERE id = p_tool_id RETURNING upvotes INTO v_count;
  RETURN v_count;
END;
$$;
