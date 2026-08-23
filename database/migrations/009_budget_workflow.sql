-- Flujo de diagnóstico, presupuesto y aprobación del cliente.
BEGIN;

INSERT INTO roles (id, name, description)
VALUES ('presupuestador', 'Responsable de presupuestos', 'Gestiona presupuestos y sus aprobaciones')
ON CONFLICT (id) DO NOTHING;

UPDATE order_states SET position = 9 WHERE id = 'entregado';

INSERT INTO order_states (id, label, color, position) VALUES
  ('pendiente_presupuesto', 'Pendiente de presupuesto', '#f97316', 5),
  ('presupuesto_enviado', 'Presupuesto enviado', '#eab308', 6),
  ('presupuesto_aprobado', 'Presupuesto aprobado', '#22c55e', 7),
  ('presupuesto_rechazado', 'Presupuesto rechazado', '#ef4444', 8)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS budget_assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS budget_decision TEXT CHECK (budget_decision IS NULL OR budget_decision IN ('aprobado', 'rechazado')),
  ADD COLUMN IF NOT EXISTS budget_decision_note TEXT,
  ADD COLUMN IF NOT EXISTS budget_submitted_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS budget_decided_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_orders_budget_queue ON orders(status, budget_assigned_to)
  WHERE status IN ('pendiente_presupuesto', 'presupuesto_enviado');

COMMIT;


