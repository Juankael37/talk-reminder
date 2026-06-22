ALTER TABLE reminder_logs
  ADD COLUMN IF NOT EXISTS status TEXT
    CHECK (status IN ('success', 'failed', 'skipped')),
  ADD COLUMN IF NOT EXISTS error_message TEXT,
  ADD COLUMN IF NOT EXISTS channel TEXT,
  ADD COLUMN IF NOT EXISTS recipient TEXT,
  ADD COLUMN IF NOT EXISTS kind TEXT,
  ADD COLUMN IF NOT EXISTS organizer_notified_at TIMESTAMPTZ;

UPDATE reminder_logs
  SET status = 'success', kind = 'legacy'
  WHERE status IS NULL;

ALTER TABLE reminder_logs
  ALTER COLUMN status SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_reminder_logs_rule_id
  ON reminder_logs (rule_id);

CREATE INDEX IF NOT EXISTS idx_reminder_logs_created_at
  ON reminder_logs (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_reminder_logs_status
  ON reminder_logs (status)
  WHERE status = 'failed';

DROP POLICY IF EXISTS "Users can view own reminder_logs" ON reminder_logs;
CREATE POLICY "Users can view own reminder_logs"
  ON reminder_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM reminder_rules rr
      JOIN talks t ON t.id = rr.talk_id
      WHERE rr.id = reminder_logs.rule_id
        AND t.user_id = auth.uid()
    )
  );