/*
  # Add attacks table
  
  1. New Table
    - `attacks`: Stores character attacks
      - Basic info (name, type, range)
      - Modifiers and damage
      - Additional effects
  
  2. Security
    - RLS enabled
    - Players can manage their own attacks
*/

-- Create attacks table
CREATE TABLE attacks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid REFERENCES players(id) ON DELETE CASCADE,
  name text NOT NULL,
  attack_bonus integer NOT NULL,
  damage_dice text NOT NULL,
  damage_type text NOT NULL,
  range text NOT NULL,
  properties text,
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