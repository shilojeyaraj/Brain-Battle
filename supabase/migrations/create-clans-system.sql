-- Clans/Classrooms System for Pro Accounts
-- Allows teachers and groups to create private clans for tracking stats and hosting sessions

-- Create clans table
CREATE TABLE IF NOT EXISTS public.clans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    code VARCHAR(8) UNIQUE NOT NULL, -- 8-character join code
    owner_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    is_private BOOLEAN DEFAULT true,
    max_members INTEGER DEFAULT 50,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT clans_name_length CHECK (char_length(name) >= 3 AND char_length(name) <= 100),
    CONSTRAINT clans_code_format CHECK (code ~ '^[A-Z0-9]{8}$'),
    CONSTRAINT clans_max_members CHECK (max_members > 0 AND max_members <= 100)
);

-- Create clan_members table (many-to-many relationship)
CREATE TABLE IF NOT EXISTS public.clan_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clan_id UUID NOT NULL REFERENCES public.clans(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(clan_id, user_id) -- Prevent duplicate memberships
);

-- Create clan_sessions table (for clan-wide quiz sessions)
CREATE TABLE IF NOT EXISTS public.clan_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clan_id UUID NOT NULL REFERENCES public.clans(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES public.quiz_sessions(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(session_id) -- One session can only belong to one clan
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_clans_owner_id ON public.clans(owner_id);
CREATE INDEX IF NOT EXISTS idx_clans_code ON public.clans(code);
CREATE INDEX IF NOT EXISTS idx_clan_members_clan_id ON public.clan_members(clan_id);
CREATE INDEX IF NOT EXISTS idx_clan_members_user_id ON public.clan_members(user_id);
CREATE INDEX IF NOT EXISTS idx_clan_sessions_clan_id ON public.clan_sessions(clan_id);
CREATE INDEX IF NOT EXISTS idx_clan_sessions_session_id ON public.clan_sessions(session_id);

-- Function to generate unique clan code
CREATE OR REPLACE FUNCTION generate_clan_code()
RETURNS VARCHAR(8) AS $$
DECLARE
    new_code VARCHAR(8);
    code_exists BOOLEAN;
BEGIN
    LOOP
        -- Generate 8-character alphanumeric code (uppercase)
        new_code := UPPER(
            SUBSTRING(
                MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT),
                1, 8
            )
        );
        
        -- Check if code already exists
        SELECT EXISTS(SELECT 1 FROM public.clans WHERE code = new_code) INTO code_exists;
        
        -- Exit loop if code is unique
        EXIT WHEN NOT code_exists;
    END LOOP;
    
    RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_clan_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
-- Drop existing trigger first (safe to run multiple times)
DROP TRIGGER IF EXISTS trigger_update_clan_updated_at ON public.clans;
CREATE TRIGGER trigger_update_clan_updated_at
    BEFORE UPDATE ON public.clans
    FOR EACH ROW
    EXECUTE FUNCTION update_clan_updated_at();

-- Function to check if user is clan member
CREATE OR REPLACE FUNCTION is_clan_member(p_clan_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS(
        SELECT 1 FROM public.clan_members
        WHERE clan_id = p_clan_id AND user_id = p_user_id
    );
END;
$$ LANGUAGE plpgsql;

-- Function to check if user is clan owner or admin
CREATE OR REPLACE FUNCTION is_clan_admin(p_clan_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS(
        SELECT 1 FROM public.clan_members
        WHERE clan_id = p_clan_id 
        AND user_id = p_user_id
        AND role IN ('owner', 'admin')
    );
END;
$$ LANGUAGE plpgsql;

-- Function to get clan member count
CREATE OR REPLACE FUNCTION get_clan_member_count(p_clan_id UUID)
RETURNS INTEGER AS $$
DECLARE
    member_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO member_count
    FROM public.clan_members
    WHERE clan_id = p_clan_id;
    
    RETURN member_count;
END;
$$ LANGUAGE plpgsql;

-- Enable Row Level Security
ALTER TABLE public.clans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clan_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clan_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for clans table
-- Drop existing policies first (safe to run multiple times)
DROP POLICY IF EXISTS "clans_select" ON public.clans;
DROP POLICY IF EXISTS "clans_insert" ON public.clans;
DROP POLICY IF EXISTS "clans_update" ON public.clans;
DROP POLICY IF EXISTS "clans_delete" ON public.clans;

-- Users can view clans they are members of or public clans
CREATE POLICY "clans_select"
    ON public.clans FOR SELECT
    USING (
        is_private = false 
        OR owner_id = auth.uid()::UUID
        OR EXISTS(
            SELECT 1 FROM public.clan_members
            WHERE clan_id = clans.id AND user_id = auth.uid()::UUID
        )
    );

-- Users can create clans (will be restricted to Pro in application logic)
CREATE POLICY "clans_insert"
    ON public.clans FOR INSERT
    WITH CHECK (owner_id = auth.uid()::UUID);

-- Only owners can update their clans
CREATE POLICY "clans_update"
    ON public.clans FOR UPDATE
    USING (owner_id = auth.uid()::UUID)
    WITH CHECK (owner_id = auth.uid()::UUID);

-- Only owners can delete their clans
CREATE POLICY "clans_delete"
    ON public.clans FOR DELETE
    USING (owner_id = auth.uid()::UUID);

-- RLS Policies for clan_members table
-- Drop existing policies first (safe to run multiple times)
DROP POLICY IF EXISTS "clan_members_select" ON public.clan_members;
DROP POLICY IF EXISTS "clan_members_insert" ON public.clan_members;
DROP POLICY IF EXISTS "clan_members_delete" ON public.clan_members;

-- Users can view members of clans they belong to
CREATE POLICY "clan_members_select"
    ON public.clan_members FOR SELECT
    USING (
        EXISTS(
            SELECT 1 FROM public.clan_members cm2
            WHERE cm2.clan_id = clan_members.clan_id
            AND cm2.user_id = auth.uid()::UUID
        )
    );

-- Users can join clans (will be restricted in application logic)
CREATE POLICY "clan_members_insert"
    ON public.clan_members FOR INSERT
    WITH CHECK (user_id = auth.uid()::UUID);

-- Users can leave clans or owners/admins can remove members
CREATE POLICY "clan_members_delete"
    ON public.clan_members FOR DELETE
    USING (
        user_id = auth.uid()::UUID
        OR EXISTS(
            SELECT 1 FROM public.clans
            WHERE id = clan_members.clan_id
            AND owner_id = auth.uid()::UUID
        )
        OR EXISTS(
            SELECT 1 FROM public.clan_members cm2
            WHERE cm2.clan_id = clan_members.clan_id
            AND cm2.user_id = auth.uid()::UUID
            AND cm2.role IN ('owner', 'admin')
        )
    );

-- RLS Policies for clan_sessions table
-- Drop existing policies first (safe to run multiple times)
DROP POLICY IF EXISTS "clan_sessions_select" ON public.clan_sessions;
DROP POLICY IF EXISTS "clan_sessions_insert" ON public.clan_sessions;

-- Users can view sessions of clans they belong to
CREATE POLICY "clan_sessions_select"
    ON public.clan_sessions FOR SELECT
    USING (
        EXISTS(
            SELECT 1 FROM public.clan_members
            WHERE clan_id = clan_sessions.clan_id
            AND user_id = auth.uid()::UUID
        )
    );

-- Clan admins can create clan sessions
CREATE POLICY "clan_sessions_insert"
    ON public.clan_sessions FOR INSERT
    WITH CHECK (
        created_by = auth.uid()::UUID
        AND EXISTS(
            SELECT 1 FROM public.clan_members
            WHERE clan_id = clan_sessions.clan_id
            AND user_id = auth.uid()::UUID
            AND role IN ('owner', 'admin')
        )
    );

-- Comments for documentation
COMMENT ON TABLE public.clans IS 'Clans/Classrooms for Pro accounts - allows groups to track stats and host private sessions';
COMMENT ON TABLE public.clan_members IS 'Many-to-many relationship between users and clans';
COMMENT ON TABLE public.clan_sessions IS 'Links quiz sessions to clans for clan-wide battles';
COMMENT ON COLUMN public.clans.code IS '8-character alphanumeric join code (e.g., ABC123XY)';
COMMENT ON COLUMN public.clan_members.role IS 'Member role: owner (creator), admin (can manage), or member';

