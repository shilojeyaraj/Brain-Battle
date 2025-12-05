-- Add study_notes column to game_rooms table for multiplayer room notes
-- This allows notes to be shared with all room members via real-time sync

ALTER TABLE public.game_rooms
ADD COLUMN IF NOT EXISTS study_notes JSONB;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_game_rooms_study_notes ON public.game_rooms USING gin(study_notes);

-- Add comment
COMMENT ON COLUMN public.game_rooms.study_notes IS 'AI-generated study notes for the room, shared with all members';

