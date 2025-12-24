-- Add anonymous access policies for public questionnaire and quote pages
-- This allows using anon key instead of service role key (more secure)

-- Questionnaires: Allow anonymous to read by public_token
CREATE POLICY "Allow anonymous to read questionnaires by token" ON questionnaires
  FOR SELECT TO anon
  USING (public_token IS NOT NULL);

-- Questionnaires: Allow anonymous to update status (for marking as opened)
CREATE POLICY "Allow anonymous to update questionnaire status" ON questionnaires
  FOR UPDATE TO anon
  USING (public_token IS NOT NULL)
  WITH CHECK (public_token IS NOT NULL);

-- Questionnaire responses: Allow anonymous to insert responses
CREATE POLICY "Allow anonymous to insert questionnaire responses" ON questionnaire_responses
  FOR INSERT TO anon
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM questionnaires
      WHERE questionnaires.id = questionnaire_responses.questionnaire_id
      AND questionnaires.public_token IS NOT NULL
    )
  );

-- Questionnaire responses: Allow anonymous to read their responses
CREATE POLICY "Allow anonymous to read questionnaire responses" ON questionnaire_responses
  FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1 FROM questionnaires
      WHERE questionnaires.id = questionnaire_responses.questionnaire_id
      AND questionnaires.public_token IS NOT NULL
    )
  );

-- Customers: Allow anonymous to read limited customer info via questionnaire
CREATE POLICY "Allow anonymous to read customer via questionnaire" ON customers
  FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1 FROM questionnaires
      WHERE questionnaires.customer_id = customers.id
      AND questionnaires.public_token IS NOT NULL
    )
    OR
    EXISTS (
      SELECT 1 FROM quotes
      WHERE quotes.customer_id = customers.id
      AND quotes.public_token IS NOT NULL
    )
  );
