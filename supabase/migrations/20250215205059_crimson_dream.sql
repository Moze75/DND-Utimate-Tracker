ALTER TABLE players
ADD COLUMN IF NOT EXISTS avatar_position jsonb DEFAULT '{"x": 0, "y": 0}'::jsonb;