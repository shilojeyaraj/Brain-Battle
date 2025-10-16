-- Fix RLS policies for custom authentication
-- Run this script in your Supabase SQL Editor

-- First, disable RLS temporarily to fix the policies
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE player_stats DISABLE ROW LEVEL SECURITY;
ALTER TABLE game_rooms DISABLE ROW LEVEL SECURITY;
ALTER TABLE room_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE documents DISABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE questions DISABLE ROW LEVEL SECURITY;
ALTER TABLE player_answers DISABLE ROW LEVEL SECURITY;
ALTER TABLE game_results DISABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboard DISABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own data" ON users;
DROP POLICY IF EXISTS "Users can update their own data" ON users;
DROP POLICY IF EXISTS "Users can view their own stats" ON player_stats;
DROP POLICY IF EXISTS "Users can view public game rooms" ON game_rooms;
DROP POLICY IF EXISTS "Users can create game rooms" ON game_rooms;
DROP POLICY IF EXISTS "Users can view rooms they're members of" ON room_members;
DROP POLICY IF EXISTS "Users can join rooms" ON room_members;

-- Re-enable RLS
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

-- Create new RLS policies that work with custom authentication
-- For now, we'll allow all operations for authenticated users
-- You can make these more restrictive later if needed

-- Users table policies
CREATE POLICY "Allow all operations on users" ON users
    FOR ALL USING (true);

-- Player stats table policies  
CREATE POLICY "Allow all operations on player_stats" ON player_stats
    FOR ALL USING (true);

-- Game rooms table policies
CREATE POLICY "Allow all operations on game_rooms" ON game_rooms
    FOR ALL USING (true);

-- Room members table policies
CREATE POLICY "Allow all operations on room_members" ON room_members
    FOR ALL USING (true);

-- Documents table policies
CREATE POLICY "Allow all operations on documents" ON documents
    FOR ALL USING (true);

-- Quiz sessions table policies
CREATE POLICY "Allow all operations on quiz_sessions" ON quiz_sessions
    FOR ALL USING (true);

-- Questions table policies
CREATE POLICY "Allow all operations on questions" ON questions
    FOR ALL USING (true);

-- Player answers table policies
CREATE POLICY "Allow all operations on player_answers" ON player_answers
    FOR ALL USING (true);

-- Game results table policies
CREATE POLICY "Allow all operations on game_results" ON game_results
    FOR ALL USING (true);

-- Leaderboard table policies
CREATE POLICY "Allow all operations on leaderboard" ON leaderboard
    FOR ALL USING (true);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
