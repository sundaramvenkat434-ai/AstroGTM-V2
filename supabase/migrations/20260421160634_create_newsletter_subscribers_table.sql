/*
  # Create newsletter_subscribers table

  Stores email subscribers who want weekly tool updates in their selected category with coupon codes.

  1. New Tables
    - `newsletter_subscribers`
      - `id` (uuid, primary key)
      - `email` (text, unique) - Subscriber email address
      - `category` (text) - Preferred tool category for updates
      - `subscribed_at` (timestamptz) - When they subscribed
      - `confirmed` (boolean) - Whether they confirmed their subscription
      - `unsubscribed` (boolean) - Whether they have unsubscribed

  2. Security
    - Enable RLS on `newsletter_subscribers`
    - Allow anonymous inserts (public subscribe form)
    - Authenticated users can read all subscribers (admin use)
*/

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  category text NOT NULL DEFAULT 'all',
  subscribed_at timestamptz NOT NULL DEFAULT now(),
  confirmed boolean NOT NULL DEFAULT false,
  unsubscribed boolean NOT NULL DEFAULT false
);

ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;

-- Anyone can subscribe (insert only, no reading others' data)
CREATE POLICY "Anyone can subscribe"
  ON newsletter_subscribers
  FOR INSERT
  WITH CHECK (true);

-- Authenticated users (admins) can view subscribers
CREATE POLICY "Authenticated users can view subscribers"
  ON newsletter_subscribers
  FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

-- Authenticated users can update subscriber records
CREATE POLICY "Authenticated users can update subscribers"
  ON newsletter_subscribers
  FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);
