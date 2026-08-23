-- Agrega el número de serie del equipo a las órdenes.
-- Es opcional porque puede no estar visible o disponible al ingresar el equipo.

BEGIN;

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS device_serial VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_orders_device_serial
  ON orders(device_serial);

CREATE OR REPLACE VIEW v_orders_summary AS
SELECT
  o.id,
  o.code,
  o.client_name,
  o.client_email,
  o.client_phone,
  c.name AS company_name,
  c.logo AS company_logo,
  o.device_type,
  o.device_brand,
  o.device_model,
  o.status,
  os.label AS status_label,
  os.color AS status_color,
  o.assigned_to,
  COALESCE(SUM(bi.amount), 0)::DECIMAL AS budget_total,
  o.created_at,
  o.updated_at,
  o.device_serial
FROM orders o
LEFT JOIN users u ON o.client_id = u.id
LEFT JOIN companies c ON u.company_id = c.id
LEFT JOIN order_states os ON o.status = os.id
LEFT JOIN budget_items bi ON o.id = bi.order_id
GROUP BY o.id, u.id, c.id, os.id;

COMMIT;
