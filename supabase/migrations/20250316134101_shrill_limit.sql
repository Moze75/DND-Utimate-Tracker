/*
  # Add bardic inspiration to bard class resources
  
  1. Changes
    - Update the getDefaultClassResources function to include bardic inspiration
    - Bardic inspiration uses Charisma modifier (minimum of 1)
    - Number of uses increases with level
*/

-- Update existing bard players with bardic inspiration
UPDATE players
SET class_resources = jsonb_build_object(
  'bardic_inspiration', GREATEST(1, FLOOR((level + 5) / 6)),
  'used_bardic_inspiration', 0
)
WHERE class = 'Barde' AND (
  class_resources IS NULL OR 
  class_resources->>'bardic_inspiration' IS NULL
);