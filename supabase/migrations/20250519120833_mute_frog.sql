/*
  # Fix attacks table structure
  
  1. Changes
    - Drop and recreate attacks table with correct structure
    - Ensure proper RLS policies
    - Add necessary indexes
*/

-- Drop existing table
DROP TABLE IF EXISTS attacks;

-- Create attacks table with correct structure
CREATE TABLE attacks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid REFERENCES players(id) ON DELETE CASCADE,
  name text NOT NULL,
  damage_dice text NOT NULL,
  damage_type text NOT NULL,
  range text NOT NULL,
  properties text,
  expertise boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE attacks ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Players can manage their attacks"
  ON attacks FOR ALL
  TO authenticated
  USING (player_id IN (
    SELECT id FROM players WHERE user_id = auth.uid()
  ))
  WITH CHECK (player_id IN (
    SELECT id FROM players WHERE user_id = auth.uid()
  ));

-- Create indexes
CREATE INDEX attacks_player_id_idx ON attacks(player_id);