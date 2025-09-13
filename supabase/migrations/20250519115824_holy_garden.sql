/*
  # Add expertise to attacks
  
  1. Changes
    - Add expertise boolean column to attacks table
    - Default value is false
*/

ALTER TABLE attacks
ADD COLUMN expertise boolean DEFAULT false;