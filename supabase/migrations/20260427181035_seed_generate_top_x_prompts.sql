/*
  # Seed generate-top-x prompts

  1. New rows in admin_settings
    - `top_x_slug_system_prompt` — system prompt for slug/metadata generation mode
    - `top_x_slug_user_prompt` — user prompt template for slug mode
    - `top_x_content_system_prompt` — system prompt for full content generation mode
    - `top_x_content_user_prompt` — user prompt template for full content mode

  2. Notes
    - These prompts are read by the generate-top-x edge function
    - If a row is missing the function falls back to its hardcoded defaults
    - Values use INSERT ... ON CONFLICT DO NOTHING so re-running is safe
*/

INSERT INTO admin_settings (key, value) VALUES
(
  'top_x_slug_system_prompt',
  'You generate SEO-friendly metadata for "Top X" comparison pages. Output ONLY valid JSON, no markdown.'
),
(
  'top_x_content_system_prompt',
  'You are a senior technical writer creating high-quality "Top X" comparison pages for a developer tools directory. You write in a clear, authoritative, helpful style. Output ONLY valid JSON, no markdown fences.'
)
ON CONFLICT (key) DO NOTHING;
