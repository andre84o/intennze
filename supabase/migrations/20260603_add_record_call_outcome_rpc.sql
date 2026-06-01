-- Migration: 20260603_add_record_call_outcome_rpc
-- Mobile Call Companion — atomic outcome engine (Step 3).
-- Records a call outcome in ONE transaction: a single call interaction
-- (Add Note merged into the same row), the customers last-call summary +
-- status mapping, an optional Call Back reminder, and moves the session to
-- wrap_up. Idempotent on (created_by, request_id). No Meta calls.

CREATE OR REPLACE FUNCTION record_call_outcome(
  p_session_id     uuid,
  p_customer_id    uuid,
  p_active_call_id uuid,
  p_outcome        text,
  p_request_id     uuid,
  p_note           text DEFAULT NULL
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

  -- Call Back -> follow_up reminder tomorrow 09:00 Europe/Stockholm.
  IF p_outcome = 'call_back' THEN
    INSERT INTO reminders (customer_id, title, reminder_date, reminder_time, type, created_by)
    VALUES (
      p_customer_id,
      'Ring upp ' || COALESCE(NULLIF(btrim(v_customer.first_name), ''), 'kund'),
      ((now() AT TIME ZONE 'Europe/Stockholm')::date + 1),
      '09:00',
      'follow_up',
      v_agent
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

REVOKE ALL ON FUNCTION record_call_outcome(uuid, uuid, uuid, text, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION record_call_outcome(uuid, uuid, uuid, text, uuid, text) TO authenticated;
