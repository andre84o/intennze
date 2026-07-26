-- Migration: 20260604_update_record_call_outcome_rpc
-- Mobile Call Companion — updated outcome engine.
-- Changes vs. 20260603:
--   * call_back   -> reminder uses the USER-supplied date/time (required), not
--                    a hardcoded tomorrow 09:00.
--   * no_answer   -> auto-creates a reminder for the NEXT day 09:00
--                    (Europe/Stockholm), de-duplicated so repeated no-answers
--                    do not pile up identical reminders. The customer returns
--                    via the reminder logic, not directly in the list.
--   * interested  -> status moves lead->contacted (leaves Lead Calling) and an
--                    OPTIONAL reminder is created when a date/time is supplied.
--   * not_interested -> churned (unchanged).
-- Add Note is still merged into the same single call interaction. No Meta.
-- Reminder date is received as YYYYMMDD and time as HHMM (already validated by
-- the API); both are validated again here as defense-in-depth.

CREATE OR REPLACE FUNCTION record_call_outcome(
  p_session_id     uuid,
  p_customer_id    uuid,
  p_active_call_id uuid,
  p_outcome        text,
  p_request_id     uuid,
  p_note           text DEFAULT NULL,
  p_reminder_date  text DEFAULT NULL,   -- YYYYMMDD (call_back required, interested optional)
  p_reminder_time  text DEFAULT NULL    -- HHMM
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_agent          uuid := (SELECT auth.uid());
  v_session        call_sessions%ROWTYPE;
  v_customer       customers%ROWTYPE;
  v_existing_id    uuid;
  v_interaction_id uuid;
  v_reminder_id    uuid;
  v_desc           text;
  v_new_status     text;
  v_rdate          date;
  v_rtime          text;
  v_tomorrow       date;
BEGIN
  IF v_agent IS NULL THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = 'PT401';
  END IF;

  IF p_request_id IS NULL THEN
    RAISE EXCEPTION 'missing_request_id' USING ERRCODE = 'PT400';
  END IF;

  IF p_outcome NOT IN ('interested', 'call_back', 'no_answer', 'not_interested') THEN
    RAISE EXCEPTION 'invalid_outcome' USING ERRCODE = 'PT400';
  END IF;

  -- Reminder date/time rules per outcome (defense-in-depth; API validates too).
  IF p_outcome = 'call_back' AND (p_reminder_date IS NULL OR p_reminder_time IS NULL) THEN
    RAISE EXCEPTION 'missing_callback_datetime' USING ERRCODE = 'PT400';
  END IF;
  IF p_outcome IN ('no_answer', 'not_interested')
     AND (p_reminder_date IS NOT NULL OR p_reminder_time IS NOT NULL) THEN
    RAISE EXCEPTION 'reminder_not_allowed' USING ERRCODE = 'PT400';
  END IF;
  IF p_outcome = 'interested'
     AND ((p_reminder_date IS NULL) <> (p_reminder_time IS NULL)) THEN
    RAISE EXCEPTION 'incomplete_reminder' USING ERRCODE = 'PT400';
  END IF;
  IF p_reminder_date IS NOT NULL AND p_reminder_date !~ '^\d{8}$' THEN
    RAISE EXCEPTION 'invalid_reminder_date' USING ERRCODE = 'PT400';
  END IF;
  IF p_reminder_time IS NOT NULL AND p_reminder_time !~ '^\d{4}$' THEN
    RAISE EXCEPTION 'invalid_reminder_time' USING ERRCODE = 'PT400';
  END IF;

  -- Idempotency: an outcome already recorded for this (agent, request_id)?
  SELECT id INTO v_existing_id
  FROM customer_interactions
  WHERE created_by = v_agent AND request_id = p_request_id
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    RETURN jsonb_build_object('status', 'duplicate', 'interaction_id', v_existing_id, 'idempotent', true);
  END IF;

  -- Load + lock session; verify ownership and wrong-customer guard.
  SELECT * INTO v_session FROM call_sessions WHERE id = p_session_id FOR UPDATE;
  IF NOT FOUND OR v_session.agent_id <> v_agent THEN
    RAISE EXCEPTION 'session_not_found' USING ERRCODE = 'PT409';
  END IF;

  IF v_session.active_call_id IS DISTINCT FROM p_active_call_id
     OR v_session.active_customer_id IS DISTINCT FROM p_customer_id THEN
    RAISE EXCEPTION 'stale_session' USING ERRCODE = 'PT409';
  END IF;

  -- Load + lock customer.
  SELECT * INTO v_customer FROM customers WHERE id = p_customer_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'customer_not_found' USING ERRCODE = 'PT409';
  END IF;

  -- Human-readable log line; Add Note is merged into this same interaction.
  v_desc := CASE p_outcome
    WHEN 'interested'     THEN 'Samtal: Intresserad'
    WHEN 'call_back'      THEN 'Samtal: Ring tillbaka'
    WHEN 'no_answer'      THEN 'Samtal: Inget svar'
    WHEN 'not_interested' THEN 'Samtal: Ej intresserad'
  END;
  IF p_note IS NOT NULL AND length(btrim(p_note)) > 0 THEN
    v_desc := v_desc || E'\n' || btrim(p_note);
  END IF;

  -- Single call interaction (idempotency enforced by the unique index too).
  BEGIN
    INSERT INTO customer_interactions (customer_id, type, description, call_outcome, request_id, created_by)
    VALUES (p_customer_id, 'call', v_desc, p_outcome, p_request_id, v_agent)
    RETURNING id INTO v_interaction_id;
  EXCEPTION WHEN unique_violation THEN
    SELECT id INTO v_existing_id
    FROM customer_interactions
    WHERE created_by = v_agent AND request_id = p_request_id
    LIMIT 1;
    RETURN jsonb_build_object('status', 'duplicate', 'interaction_id', v_existing_id, 'idempotent', true);
  END;

  -- Status mapping (guarded; never downgrades a customer).
  v_new_status := v_customer.status;
  IF p_outcome = 'interested' AND v_customer.status IN ('lead', 'contacted') THEN
    v_new_status := 'contacted';
  ELSIF p_outcome = 'not_interested' AND v_customer.status <> 'customer' THEN
    v_new_status := 'churned';
  END IF;

  UPDATE customers
  SET last_call_at = now(),
      last_call_result = p_outcome,
      status = v_new_status
  WHERE id = p_customer_id;

  -- Reminders -------------------------------------------------------------
  IF p_outcome = 'call_back' THEN
    -- User-chosen date/time.
    v_rdate := to_date(p_reminder_date, 'YYYYMMDD');
    v_rtime := left(p_reminder_time, 2) || ':' || right(p_reminder_time, 2);
    INSERT INTO reminders (customer_id, title, reminder_date, reminder_time, type, created_by)
    VALUES (
      p_customer_id,
      'Ring upp ' || COALESCE(NULLIF(btrim(v_customer.first_name), ''), 'kund'),
      v_rdate, v_rtime, 'follow_up', v_agent
    )
    RETURNING id INTO v_reminder_id;

  ELSIF p_outcome = 'no_answer' THEN
    -- Auto: next day 09:00 Europe/Stockholm, de-duplicated.
    v_tomorrow := (now() AT TIME ZONE 'Europe/Stockholm')::date + 1;
    INSERT INTO reminders (customer_id, title, reminder_date, reminder_time, type, created_by)
    SELECT
      p_customer_id,
      'Ring upp ' || COALESCE(NULLIF(btrim(v_customer.first_name), ''), 'kund'),
      v_tomorrow, '09:00', 'follow_up', v_agent
    WHERE NOT EXISTS (
      SELECT 1 FROM reminders
      WHERE customer_id = p_customer_id
        AND is_completed = false
        AND reminder_date = v_tomorrow
        AND type = 'follow_up'
    )
    RETURNING id INTO v_reminder_id;

  ELSIF p_outcome = 'interested' AND p_reminder_date IS NOT NULL THEN
    -- Optional reminder.
    v_rdate := to_date(p_reminder_date, 'YYYYMMDD');
    v_rtime := left(p_reminder_time, 2) || ':' || right(p_reminder_time, 2);
    INSERT INTO reminders (customer_id, title, reminder_date, reminder_time, type, created_by)
    VALUES (
      p_customer_id,
      'Ring upp ' || COALESCE(NULLIF(btrim(v_customer.first_name), ''), 'kund'),
      v_rdate, v_rtime, 'follow_up', v_agent
    )
    RETURNING id INTO v_reminder_id;
  END IF;

  UPDATE call_sessions SET state = 'wrap_up', updated_at = now() WHERE id = p_session_id;

  RETURN jsonb_build_object(
    'status', 'ok',
    'interaction_id', v_interaction_id,
    'reminder_id', v_reminder_id,
    'new_status', v_new_status
  );
END;
$$;

-- Drop the previous 6-arg signature so only the 8-arg version remains.
DROP FUNCTION IF EXISTS record_call_outcome(uuid, uuid, uuid, text, uuid, text);

REVOKE ALL ON FUNCTION record_call_outcome(uuid, uuid, uuid, text, uuid, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION record_call_outcome(uuid, uuid, uuid, text, uuid, text, text, text) TO authenticated;
