-- Recordatorios recurrentes configurables por orden.
-- Los tickets ocasionales no reciben avisos in-app; su consulta sigue siendo manual.
BEGIN;

CREATE TABLE IF NOT EXISTS order_reminders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
  recipient_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  interval_months SMALLINT NOT NULL DEFAULT 12 CHECK (interval_months IN (6, 12, 24)),
  message TEXT NOT NULL DEFAULT 'Te recordamos que es momento de realizar el mantenimiento de tu equipo.',
  active BOOLEAN NOT NULL DEFAULT true,
  next_reminder_at TIMESTAMP WITH TIME ZONE,
  last_sent_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_order_reminders_due
  ON order_reminders(next_reminder_at)
  WHERE active = true AND next_reminder_at IS NOT NULL;

-- Registro genérico de entregas para incorporar canales externos (por ejemplo email).
CREATE TABLE IF NOT EXISTS notification_deliveries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  channel VARCHAR(30) NOT NULL CHECK (channel IN ('in_app', 'email')),
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'skipped')),
  provider VARCHAR(80),
  provider_message_id TEXT,
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  last_error TEXT,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (notification_id, channel)
);

CREATE INDEX IF NOT EXISTS idx_notification_deliveries_pending
  ON notification_deliveries(status, created_at)
  WHERE status = 'pending';

ALTER TABLE order_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_deliveries ENABLE ROW LEVEL SECURITY;

ALTER TABLE order_history_events
  DROP CONSTRAINT IF EXISTS order_history_events_event_type_check;

ALTER TABLE order_history_events
  ADD CONSTRAINT order_history_events_event_type_check CHECK (event_type IN (
    'order_created', 'status_changed', 'assignee_changed', 'budget_assignee_changed',
    'order_details_changed', 'budget_item_added', 'budget_item_updated',
    'budget_item_deleted', 'budget_submitted', 'budget_sent', 'budget_decided',
    'order_reminder_updated'
  ));

-- Los accesos pasan por Server Actions y el service role, con autorización explícita.

COMMIT;
