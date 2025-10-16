-- BrainBattle Database Setup Script
-- Run this script in your Supabase SQL Editor

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
CREATE TYPE game_status AS ENUM ('waiting', 'active', 'completed', 'cancelled');
CREATE TYPE question_type AS ENUM ('multiple_choice', 'true_false', 'fill_blank');
CREATE TYPE difficulty_level AS ENUM ('easy', 'medium', 'hard');

-- 1. USERS TABLE (Authentication & Basic Info)
CREATE TABLE IF NOT EXISTS users (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE
);

-- 2. PLAYER STATS TABLE
CREATE TABLE IF NOT EXISTS player_stats (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    level INTEGER DEFAULT 1,
    xp INTEGER DEFAULT 0,
    total_wins INTEGER DEFAULT 0,
    total_losses INTEGER DEFAULT 0,
    total_games INTEGER DEFAULT 0,
    win_streak INTEGER DEFAULT 0,
    best_streak INTEGER DEFAULT 0,
    total_questions_answered INTEGER DEFAULT 0,
    correct_answers INTEGER DEFAULT 0,
    accuracy DECIMAL(5,2) DEFAULT 0.00,
    average_response_time DECIMAL(8,2) DEFAULT 0.00, -- in seconds
    favorite_subject VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. GAME ROOMS TABLE
CREATE TABLE IF NOT EXISTS game_rooms (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    room_code VARCHAR(10) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    host_id UUID REFERENCES users(id) ON DELETE CASCADE,
    subject VARCHAR(100),
    difficulty difficulty_level DEFAULT 'medium',
    max_players INTEGER DEFAULT 4,
    current_players INTEGER DEFAULT 1,
    status game_status DEFAULT 'waiting',
    is_private BOOLEAN DEFAULT TRUE,
    password_hash VARCHAR(255), -- For private rooms
    time_limit INTEGER DEFAULT 30, -- seconds per question
    total_questions INTEGER DEFAULT 10,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    ended_at TIMESTAMP WITH TIME ZONE
);

-- 4. ROOM MEMBERS TABLE
CREATE TABLE IF NOT EXISTS room_members (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    room_id UUID REFERENCES game_rooms(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_ready BOOLEAN DEFAULT FALSE,
    UNIQUE(room_id, user_id)
);

-- 5. DOCUMENTS TABLE (Uploaded study materials)
CREATE TABLE IF NOT EXISTS documents (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    room_id UUID REFERENCES game_rooms(id) ON DELETE CASCADE,
    uploaded_by UUID REFERENCES users(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    file_size INTEGER NOT NULL,
    file_url TEXT NOT NULL,
    content_text TEXT, -- Extracted text content
    subject VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. QUIZ SESSIONS TABLE
CREATE TABLE IF NOT EXISTS quiz_sessions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    room_id UUID REFERENCES game_rooms(id) ON DELETE CASCADE,
    session_name VARCHAR(100),
    total_questions INTEGER NOT NULL,
    current_question INTEGER DEFAULT 0,
    time_limit INTEGER DEFAULT 30,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ended_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE
);

-- 7. QUESTIONS TABLE
CREATE TABLE IF NOT EXISTS questions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    session_id UUID REFERENCES quiz_sessions(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    question_type question_type NOT NULL,
    correct_answer TEXT NOT NULL,
    options JSONB, -- For multiple choice questions
    explanation TEXT,
    difficulty difficulty_level DEFAULT 'medium',
    points INTEGER DEFAULT 10,
    time_limit INTEGER DEFAULT 30,
    order_index INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. PLAYER ANSWERS TABLE
CREATE TABLE IF NOT EXISTS player_answers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    room_id UUID REFERENCES game_rooms(id) ON DELETE CASCADE,
    answer_text TEXT,
    is_correct BOOLEAN,
    response_time DECIMAL(8,2), -- in seconds
    points_earned INTEGER DEFAULT 0,
    answered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. GAME RESULTS TABLE
CREATE TABLE IF NOT EXISTS game_results (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    room_id UUID REFERENCES game_rooms(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    session_id UUID REFERENCES quiz_sessions(id) ON DELETE CASCADE,
    final_score INTEGER DEFAULT 0,
    questions_answered INTEGER DEFAULT 0,
    correct_answers INTEGER DEFAULT 0,
    total_time DECIMAL(8,2) DEFAULT 0.00,
    rank INTEGER,
    xp_earned INTEGER DEFAULT 0,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. LEADERBOARD TABLE (for caching/performance)
CREATE TABLE IF NOT EXISTS leaderboard (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    username VARCHAR(50) NOT NULL,
    level INTEGER NOT NULL,
    xp INTEGER NOT NULL,
    wins INTEGER NOT NULL,
    rank INTEGER,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_player_stats_user_id ON player_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_game_rooms_code ON game_rooms(room_code);
CREATE INDEX IF NOT EXISTS idx_game_rooms_host ON game_rooms(host_id);
CREATE INDEX IF NOT EXISTS idx_room_members_room ON room_members(room_id);
CREATE INDEX IF NOT EXISTS idx_room_members_user ON room_members(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_room ON documents(room_id);
CREATE INDEX IF NOT EXISTS idx_questions_session ON questions(session_id);
CREATE INDEX IF NOT EXISTS idx_player_answers_question ON player_answers(question_id);
CREATE INDEX IF NOT EXISTS idx_player_answers_user ON player_answers(user_id);
CREATE INDEX IF NOT EXISTS idx_game_results_room ON game_results(room_id);
CREATE INDEX IF NOT EXISTS idx_game_results_user ON game_results(user_id);
CREATE INDEX IF NOT EXISTS idx_leaderboard_xp ON leaderboard(xp DESC);

-- Create functions for automatic updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_player_stats_updated_at BEFORE UPDATE ON player_stats
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_game_rooms_updated_at BEFORE UPDATE ON game_rooms
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update player stats after game completion
CREATE OR REPLACE FUNCTION update_player_stats_after_game()
RETURNS TRIGGER AS $$
BEGIN
    -- Update player stats
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
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to update stats after game completion
CREATE TRIGGER update_stats_after_game AFTER INSERT ON game_results
    FOR EACH ROW EXECUTE FUNCTION update_player_stats_after_game();

-- Function to generate unique room codes
CREATE OR REPLACE FUNCTION generate_room_code()
RETURNS TEXT AS $$
DECLARE
    code TEXT;
    exists BOOLEAN;
BEGIN
    LOOP
        code := UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6));
        SELECT EXISTS(SELECT 1 FROM game_rooms WHERE room_code = code) INTO exists;
        IF NOT exists THEN
            EXIT;
        END IF;
    END LOOP;
    RETURN code;
END;
$$ language 'plpgsql';

-- Function to create a new game room
CREATE OR REPLACE FUNCTION create_game_room(
    p_name VARCHAR(100),
    p_host_id UUID,
    p_subject VARCHAR(100) DEFAULT NULL,
    p_difficulty difficulty_level DEFAULT 'medium',
    p_max_players INTEGER DEFAULT 4,
    p_is_private BOOLEAN DEFAULT TRUE,
    p_password VARCHAR(255) DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    room_id UUID;
    room_code TEXT;
BEGIN
    -- Generate unique room code
    room_code := generate_room_code();
    
    -- Create the room
    INSERT INTO game_rooms (name, room_code, host_id, subject, difficulty, max_players, is_private, password_hash)
    VALUES (p_name, room_code, p_host_id, p_subject, p_difficulty, p_max_players, p_is_private, p_password)
    RETURNING id INTO room_id;
    
    -- Add host as first member
    INSERT INTO room_members (room_id, user_id, is_ready)
    VALUES (room_id, p_host_id, TRUE);
    
    RETURN room_id;
END;
$$ language 'plpgsql';

-- Insert sample data (optional - remove if not needed)
INSERT INTO users (username, email, password_hash) VALUES 
('admin', 'admin@brainbattle.com', '$2a$10$example_hash_here'),
('testuser', 'test@brainbattle.com', '$2a$10$example_hash_here')
ON CONFLICT (email) DO NOTHING;

-- Create initial player stats for sample users
INSERT INTO player_stats (user_id, level, xp, total_wins, total_losses)
SELECT id, 1, 0, 0, 0 FROM users WHERE username IN ('admin', 'testuser')
ON CONFLICT (user_id) DO NOTHING;

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboard ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (basic - you may want to customize these)
CREATE POLICY "Users can view their own data" ON users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own data" ON users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view their own stats" ON player_stats
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view public game rooms" ON game_rooms
    FOR SELECT USING (NOT is_private OR auth.uid() = host_id);

CREATE POLICY "Users can create game rooms" ON game_rooms
    FOR INSERT WITH CHECK (auth.uid() = host_id);

CREATE POLICY "Users can view rooms they're members of" ON room_members
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can join rooms" ON room_members
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
