-- ==============================================================================
-- TraceHarvest: Agricultural Traceability Control Center for Nigeria
-- Migration: 001_create_agents_and_audit_log.sql
-- Description: Self-registration & admin approval workflow for field agents
-- Engine: PostgreSQL 14+ / Supabase compatible
-- ==============================================================================

-- 1. Create Enumerated Type for Agent Lifecycle Status
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'agent_status_type') THEN
        CREATE TYPE agent_status_type AS ENUM ('pending', 'approved', 'rejected', 'suspended');
    END IF;
END$$;

-- 2. Create Enumerated Type for Audit Actions
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'agent_audit_action_type') THEN
        CREATE TYPE agent_audit_action_type AS ENUM ('self_register', 'approve', 'reject', 'suspend', 'reinstate', 'profile_update');
    END IF;
END$$;

-- 3. Create Agents Table
CREATE TABLE IF NOT EXISTS agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id TEXT NOT NULL,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    phone TEXT NOT NULL UNIQUE,
    association TEXT NOT NULL,
    location TEXT NOT NULL,
    status agent_status_type NOT NULL DEFAULT 'pending',
    rejection_reason TEXT NULL,
    reviewed_by TEXT NULL,
    reviewed_at TIMESTAMPTZ NULL,
    password_hash TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraint: Nigerian phone format validation (+234 or standard 11-digit local)
    CONSTRAINT check_phone_format CHECK (
        phone ~ '^\+234[0-9]{10}$' OR phone ~ '^0[789][01][0-9]{8}$'
    ),
    -- Constraint: Email format validation
    CONSTRAINT check_email_format CHECK (
        email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
    ),
    -- Constraint: If status is rejected, rejection_reason MUST be provided
    CONSTRAINT check_rejection_reason_if_rejected CHECK (
        (status = 'rejected' AND rejection_reason IS NOT NULL AND length(trim(rejection_reason)) > 0)
        OR (status != 'rejected')
    )
);

-- 4. Create Indexes for High-Velocity Queries & Uniqueness
CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);
CREATE INDEX IF NOT EXISTS idx_agents_email ON agents(email);
CREATE INDEX IF NOT EXISTS idx_agents_phone ON agents(phone);
CREATE INDEX IF NOT EXISTS idx_agents_association ON agents(association);
CREATE INDEX IF NOT EXISTS idx_agents_location ON agents(location);
CREATE INDEX IF NOT EXISTS idx_agents_created_at ON agents(created_at DESC);

-- 5. Create Audit Log Table
CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id TEXT NOT NULL,
    actor_name TEXT NULL,
    action agent_audit_action_type NOT NULL,
    target_agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for querying audit history by agent and timestamp
CREATE INDEX IF NOT EXISTS idx_audit_log_target_agent ON audit_log(target_agent_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);

-- 6. Trigger: Automatically Update `updated_at` Timestamp on Modification
CREATE OR REPLACE FUNCTION set_agents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_agents_updated_at ON agents;
CREATE TRIGGER trigger_set_agents_updated_at
BEFORE UPDATE ON agents
FOR EACH ROW
EXECUTE FUNCTION set_agents_updated_at();

-- 7. Trigger: Automatically Record Audit Log on Status Changes
CREATE OR REPLACE FUNCTION record_agent_status_audit_log()
RETURNS TRIGGER AS $$
DECLARE
    v_action agent_audit_action_type;
    v_actor TEXT;
BEGIN
    IF (TG_OP = 'INSERT') THEN
        INSERT INTO audit_log (actor_id, actor_name, action, target_agent_id, details)
        VALUES (
            COALESCE(NEW.auth_user_id, 'system'),
            NEW.full_name,
            'self_register',
            NEW.id,
            jsonb_build_object(
                'status', NEW.status,
                'email', NEW.email,
                'association', NEW.association,
                'location', NEW.location
            )
        );
        RETURN NEW;
    ELSIF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) THEN
        IF (NEW.status = 'approved') THEN
            v_action := 'approve';
        ELSIF (NEW.status = 'rejected') THEN
            v_action := 'reject';
        ELSIF (NEW.status = 'suspended') THEN
            v_action := 'suspend';
        ELSIF (NEW.status = 'approved' AND OLD.status IN ('suspended', 'rejected')) THEN
            v_action := 'reinstate';
        ELSE
            v_action := 'profile_update';
        END IF;

        v_actor := COALESCE(NEW.reviewed_by, current_setting('request.jwt.claim.sub', true), 'admin');

        INSERT INTO audit_log (actor_id, actor_name, action, target_agent_id, details)
        VALUES (
            v_actor,
            v_actor,
            v_action,
            NEW.id,
            jsonb_build_object(
                'from_status', OLD.status,
                'to_status', NEW.status,
                'rejection_reason', NEW.rejection_reason,
                'reviewed_by', NEW.reviewed_by,
                'reviewed_at', NEW.reviewed_at
            )
        );
        RETURN NEW;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_record_agent_audit ON agents;
CREATE TRIGGER trigger_record_agent_audit
AFTER INSERT OR UPDATE ON agents
FOR EACH ROW
EXECUTE FUNCTION record_agent_status_audit_log();

-- ==============================================================================
-- 8. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Helper function: Check if authenticated user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (
        current_setting('request.jwt.claim.role', true) IN ('admin', 'super_admin', 'compliance_officer')
        OR current_setting('request.jwt.claim.email', true) = 'admin@traceharvest.ng'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Policy 1: Agents can read only their own profile row
DROP POLICY IF EXISTS "Agents read own row" ON agents;
CREATE POLICY "Agents read own row" ON agents
    FOR SELECT
    USING (
        auth_user_id = current_setting('request.jwt.claim.sub', true)
        OR is_admin()
    );

-- Policy 2: Public/Self sign-up forces status = 'pending'
DROP POLICY IF EXISTS "Agent self registration" ON agents;
CREATE POLICY "Agent self registration" ON agents
    FOR INSERT
    WITH CHECK (
        status = 'pending'
        AND rejection_reason IS NULL
        AND reviewed_by IS NULL
        AND reviewed_at IS NULL
    );

-- Policy 3: Agents can update non-status fields on their own profile
DROP POLICY IF EXISTS "Agents update own non-status fields" ON agents;
CREATE POLICY "Agents update own non-status fields" ON agents
    FOR UPDATE
    USING (
        auth_user_id = current_setting('request.jwt.claim.sub', true)
        OR is_admin()
    )
    WITH CHECK (
        -- If not admin, status and review columns cannot be changed
        (
            NOT is_admin()
            AND status = OLD.status
            AND rejection_reason IS NOT DISTINCT FROM OLD.rejection_reason
            AND reviewed_by IS NOT DISTINCT FROM OLD.reviewed_by
            AND reviewed_at IS NOT DISTINCT FROM OLD.reviewed_at
        )
        OR is_admin()
    );

-- Policy 4: Admins full control over agents table
DROP POLICY IF EXISTS "Admins manage all agents" ON agents;
CREATE POLICY "Admins manage all agents" ON agents
    FOR ALL
    USING (is_admin());

-- Policy 5: Audit log is append-only by system / triggers, read-only by admins
DROP POLICY IF EXISTS "Admins view audit log" ON audit_log;
CREATE POLICY "Admins view audit log" ON audit_log
    FOR SELECT
    USING (is_admin());

DROP POLICY IF EXISTS "System writes audit log" ON audit_log;
CREATE POLICY "System writes audit log" ON audit_log
    FOR INSERT
    WITH CHECK (true);
