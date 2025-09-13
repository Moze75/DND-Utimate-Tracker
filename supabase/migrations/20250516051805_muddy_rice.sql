/*
  # Add session scheduling
  
  1. New Table
    - `game_sessions`: Stores upcoming game session dates
      - `id` (uuid, primary key)
      - `date` (timestamptz)
      - `created_at` (timestamptz)
      - `created_by` (uuid, references auth.users)
  
  2. Security
    - RLS enabled
    - All authenticated users can read
    - Only GMs can create/delete
*/

CREATE TABLE game_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date timestamptz NOT NULL,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;

-- Everyone can see sessions
CREATE POLICY "Sessions are visible to all authenticated users"
  ON game_sessions FOR SELECT
  TO authenticated
  USING (true);

-- Only GMs can manage sessions
CREATE POLICY "GMs can manage sessions"
  ON game_sessions FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM players
    WHERE user_id = auth.uid()
    AND is_gm = true
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM players
    WHERE user_id = auth.uid()
    AND is_gm = true
  ));