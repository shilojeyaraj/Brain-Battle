-- Migration: Fix player_stats trigger to create stats if missing
-- This ensures the trigger doesn't silently fail when stats don't exist
-- Date: 2025-01-XX

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS update_stats_after_game ON game_results;
DROP FUNCTION IF EXISTS update_player_stats_after_game();

-- Updated function that creates stats if missing
CREATE OR REPLACE FUNCTION update_player_stats_after_game()
RETURNS TRIGGER AS $$ 
DECLARE
    stats_exists BOOLEAN;
BEGIN
    -- Check if player_stats row exists
    SELECT EXISTS(SELECT 1 FROM player_stats WHERE user_id = NEW.user_id) INTO stats_exists;
    
    IF NOT stats_exists THEN
        -- Create default stats row if it doesn't exist
        INSERT INTO player_stats (
            user_id,
            level,
            xp,
            total_games,
            total_wins,
            total_losses,
            win_streak,
            best_streak,
            total_questions_answered,
            correct_answers,
            accuracy,
            average_response_time,
            favorite_subject,
            daily_streak,
            longest_streak,
            last_activity_date,
            trial_quiz_diagrams_remaining,
            quiz_diagrams_this_month,
            has_used_trial_quiz_diagrams,
            created_at,
            updated_at
        ) VALUES (
            NEW.user_id,
            FLOOR(NEW.xp_earned / 1000) + 1,
            NEW.xp_earned,
            1, -- total_games
            CASE WHEN NEW.rank = 1 THEN 1 ELSE 0 END, -- total_wins
            CASE WHEN NEW.rank > 1 THEN 1 ELSE 0 END, -- total_losses
            CASE WHEN NEW.rank = 1 THEN 1 ELSE 0 END, -- win_streak
            CASE WHEN NEW.rank = 1 THEN 1 ELSE 0 END, -- best_streak
            NEW.questions_answered, -- total_questions_answered
            NEW.correct_answers, -- correct_answers
            CASE 
                WHEN NEW.questions_answered > 0 
                THEN (NEW.correct_answers::DECIMAL / NEW.questions_answered) * 100
                ELSE 0 
            END, -- accuracy
            30, -- average_response_time (default)
            NULL, -- favorite_subject
            0, -- daily_streak
            0, -- longest_streak
            NULL, -- last_activity_date
            3, -- trial_quiz_diagrams_remaining (free trial)
            0, -- quiz_diagrams_this_month
            false, -- has_used_trial_quiz_diagrams
            NOW(), -- created_at
            NOW() -- updated_at
        );
    ELSE
        -- Update existing stats row
        UPDATE player_stats 
        SET 
            total_games = total_games + 1,
            total_wins = total_wins + CASE WHEN NEW.rank = 1 THEN 1 ELSE 0 END,
            total_losses = total_losses + CASE WHEN NEW.rank > 1 THEN 1 ELSE 0 END,
            win_streak = CASE 
                WHEN NEW.rank = 1 THEN win_streak + 1 
                ELSE 0 
            END,
            best_streak = GREATEST(best_streak, 
                CASE WHEN NEW.rank = 1 THEN win_streak + 1 ELSE 0 END),
            total_questions_answered = total_questions_answered + NEW.questions_answered,
            correct_answers = correct_answers + NEW.correct_answers,
            accuracy = CASE 
                WHEN total_questions_answered + NEW.questions_answered > 0 
                THEN (correct_answers + NEW.correct_answers)::DECIMAL / (total_questions_answered + NEW.questions_answered) * 100
                ELSE 0 
            END,
            xp = xp + NEW.xp_earned,
            level = FLOOR((xp + NEW.xp_earned) / 1000) + 1,
            updated_at = NOW()
        WHERE user_id = NEW.user_id;
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Recreate trigger
CREATE TRIGGER update_stats_after_game 
AFTER INSERT ON game_results 
FOR EACH ROW 
EXECUTE FUNCTION update_player_stats_after_game();

-- Add comment
COMMENT ON FUNCTION update_player_stats_after_game() IS 
'Updates player_stats after game completion. Creates stats row if missing, updates if exists. This ensures stats are always updated even for new users.';

