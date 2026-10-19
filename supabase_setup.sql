-- ========================================================
-- CEH v13 CyberLab — Supabase Cloud Database Setup Script
-- ========================================================
-- This script sets up the full cloud backend for:
-- 1. Shared Real-Time CTF Leaderboard across all student devices
-- 2. Cloud User Accounts & Progress Persistence (Username, Password, Scores, Solved Tasks)
--
-- HOW TO RUN:
-- 1. Log in to your Supabase Dashboard: https://supabase.com/dashboard
-- 2. Open your project (or create a new free project)
-- 3. Click "SQL Editor" in the left sidebar
-- 4. Click "New Query", paste this entire script, and click "Run" (Ctrl+Enter)
-- ========================================================

-- 1. Create Leaderboard Table (Public Scoreboard)
CREATE TABLE IF NOT EXISTS public.leaderboard (
    username TEXT PRIMARY KEY,
    score INTEGER DEFAULT 0 NOT NULL,
    solved_count INTEGER DEFAULT 0 NOT NULL,
    last_active TEXT DEFAULT 'Just now',
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index for instant sorting on leaderboard queries
CREATE INDEX IF NOT EXISTS idx_leaderboard_score_solved 
    ON public.leaderboard (score DESC, solved_count DESC);

-- 2. Create Lab Users Table (Credentials & Solved Lab Progress)
CREATE TABLE IF NOT EXISTS public.lab_users (
    username TEXT PRIMARY KEY,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'student' NOT NULL,
    score INTEGER DEFAULT 0 NOT NULL,
    solved JSONB DEFAULT '[]'::jsonb NOT NULL,
    concept_solved JSONB DEFAULT '[]'::jsonb NOT NULL,
    penalties JSONB DEFAULT '{}'::jsonb NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index on username for fast login lookups
CREATE INDEX IF NOT EXISTS idx_lab_users_username 
    ON public.lab_users (username);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.leaderboard ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_users ENABLE ROW LEVEL SECURITY;

-- 4. Leaderboard Security Policies (Public Read & Upsert)
DROP POLICY IF EXISTS "Allow public read leaderboard" ON public.leaderboard;
CREATE POLICY "Allow public read leaderboard" ON public.leaderboard
    FOR SELECT 
    USING (true);

DROP POLICY IF EXISTS "Allow public insert leaderboard" ON public.leaderboard;
CREATE POLICY "Allow public insert leaderboard" ON public.leaderboard
    FOR INSERT 
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update leaderboard" ON public.leaderboard;
CREATE POLICY "Allow public update leaderboard" ON public.leaderboard
    FOR UPDATE 
    USING (true) 
    WITH CHECK (true);

-- 5. Lab Users Security Policies (Sign Up, Sign In, Progress Sync)
DROP POLICY IF EXISTS "Allow public select lab_users" ON public.lab_users;
CREATE POLICY "Allow public select lab_users" ON public.lab_users
    FOR SELECT 
    USING (true);

DROP POLICY IF EXISTS "Allow public insert lab_users" ON public.lab_users;
CREATE POLICY "Allow public insert lab_users" ON public.lab_users
    FOR INSERT 
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update lab_users" ON public.lab_users;
CREATE POLICY "Allow public update lab_users" ON public.lab_users
    FOR UPDATE 
    USING (true) 
    WITH CHECK (true);

-- 6. Grant Access to Anon and Authenticated Roles
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON TABLE public.leaderboard TO anon, authenticated;
GRANT ALL ON TABLE public.lab_users TO anon, authenticated;

-- Confirm Setup Success
SELECT 'Supabase CEH v13 CyberLab Database successfully configured!' AS status;
