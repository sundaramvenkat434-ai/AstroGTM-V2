/*
  # Remove deprecated admin_settings rows

  ## Summary
  Cleans up three admin_settings rows that belonged to features no longer
  used by the application frontend.

  ## Removed Rows
  - `seo_format_prompt` — was used by the `format-seo` edge function,
    which is no longer called from any page in the app.
  - `pagespeed_api_key` — was used by the `run-lighthouse` edge function,
    which is no longer called from any page in the app.
  - `site_url` — was not referenced by any code in the codebase.

  ## Notes
  - Only removes rows; no schema changes.
  - The `format-seo`, `run-lighthouse`, and `extract-url` edge functions
    still exist but are unused by the frontend.
*/

DELETE FROM admin_settings
WHERE key IN ('seo_format_prompt', 'pagespeed_api_key', 'site_url');
