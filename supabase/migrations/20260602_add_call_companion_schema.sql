-- Migration: 20260602_add_call_companion_schema
-- Mobile Call Companion — schema foundation (Step 2).
-- ADDITIVE ONLY: new table + nullable columns + indexes.
-- No data changes, no status changes, no triggers, no external calls.

-- 1. call_sessions — live link desktop<->mobile + light list-order snapshot.
--    One active session per agent (UNIQUE agent_id). active_call_id is
--    regenerated each time a customer is pushed (wrong-customer guard).
CREATE TABLE IF NOT EXISTS call_sessions (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id            uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  active_customer_id  uuid        REFERENCES customers(id) ON DELETE SET NULL,
  active_call_id      uuid,
  state               text        NOT NULL DEFAULT 'idle'
                        CHECK (state IN ('idle', 'dialing', 'wrap_up', 'ended')),
  lead_order          uuid[]      NOT NULL DEFAULT '{}',
  lead_index          integer     NOT NULL DEFAULT -1,
  mobile_last_seen_at timestamptz,
  version             integer     NOT NULL DEFAULT 0,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (agent_id)
);

-- Send full old-row values on realtime UPDATE/DELETE events.
ALTER TABLE call_sessions REPLICA IDENTITY FULL;

CREATE INDEX IF NOT EXISTS idx_call_sessions_agent_id
  ON call_sessions(agent_id);
CREATE INDEX IF NOT EXISTS idx_call_sessions_active_customer_id
  ON call_sessions(active_customer_id);

-- Strict per-agent RLS: an agent may only see/modify their own session row.
ALTER TABLE call_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents can read own call session"
  ON call_sessions FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = agent_id);

CREATE POLICY "Agents can insert own call session"
  ON call_sessions FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = agent_id);

CREATE POLICY "Agents can update own call session"
  ON call_sessions FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = agent_id)
  WITH CHECK ((SELECT auth.uid()) = agent_id);

CREATE POLICY "Agents can delete own call session"
  ON call_sessions FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = agent_id);

-- 2. customers — denormalized last-call summary (drives Next Lead cooldown later).
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS last_call_at     timestamptz,
  ADD COLUMN IF NOT EXISTS last_call_result text
    CHECK (last_call_result IS NULL OR last_call_result IN
      ('interested', 'call_back', 'no_answer', 'not_interested'));

-- 3. customer_interactions — structured call outcome + idempotency key.
--    (Add Note will reuse the same call interaction later, not a separate row.)
ALTER TABLE customer_interactions
  ADD COLUMN IF NOT EXISTS call_outcome text
    CHECK (call_outcome IS NULL OR call_outcome IN
      ('interested', 'call_back', 'no_answer', 'not_interested')),
  ADD COLUMN IF NOT EXISTS request_id uuid;

-- Idempotency: at most one outcome per (agent, request_id). NULLs unconstrained.
CREATE UNIQUE INDEX IF NOT EXISTS uq_customer_interactions_created_by_request_id
  ON customer_interactions(created_by, request_id)
  WHERE request_id IS NOT NULL;
