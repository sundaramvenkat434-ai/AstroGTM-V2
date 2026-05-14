/*
  # Restore pagespeed_api_key setting

  ## Summary
  Re-adds the `pagespeed_api_key` row to admin_settings, which was
  previously removed but is needed by the `run-lighthouse` edge function.

  ## Restored Rows
  - `pagespeed_api_key` — Google PageSpeed Insights API key used by
    the `run-lighthouse` edge function for Lighthouse scoring.

  ## Notes
  - Uses ON CONFLICT DO NOTHING to preserve any existing value.
*/

INSERT INTO admin_settings (key, value)
VALUES ('pagespeed_api_key', '')
ON CONFLICT (key) DO NOTHING;
