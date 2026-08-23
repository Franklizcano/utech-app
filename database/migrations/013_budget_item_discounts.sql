-- Descuentos por ítem de presupuesto.
BEGIN;

ALTER TABLE budget_items
  ADD COLUMN IF NOT EXISTS discount_type TEXT,
  ADD COLUMN IF NOT EXISTS discount_value DECIMAL(10, 2);

ALTER TABLE budget_items
  DROP CONSTRAINT IF EXISTS budget_items_discount_type_check,
  DROP CONSTRAINT IF EXISTS budget_items_discount_value_check,
  DROP CONSTRAINT IF EXISTS budget_items_discount_amount_check,
  DROP CONSTRAINT IF EXISTS budget_items_discount_percentage_check;

ALTER TABLE budget_items
  ADD CONSTRAINT budget_items_discount_type_check
    CHECK (discount_type IS NULL OR discount_type IN ('fixed', 'percentage')),
  ADD CONSTRAINT budget_items_discount_value_check
    CHECK (discount_value IS NULL OR discount_value >= 0),
  ADD CONSTRAINT budget_items_discount_amount_check
    CHECK (discount_type <> 'fixed' OR discount_value IS NULL OR discount_value <= amount),
  ADD CONSTRAINT budget_items_discount_percentage_check
    CHECK (discount_type <> 'percentage' OR discount_value IS NULL OR discount_value <= 100);

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
  COALESCE(SUM(
    bi.amount - CASE
      WHEN bi.discount_type = 'percentage' THEN bi.amount * COALESCE(bi.discount_value, 0) / 100
      WHEN bi.discount_type = 'fixed' THEN LEAST(bi.amount, COALESCE(bi.discount_value, 0))
      ELSE 0
    END
  ), 0)::DECIMAL AS budget_total,
  o.created_at,
  o.updated_at,
  o.device_serial
FROM orders o
LEFT JOIN users u ON o.client_id = u.id
LEFT JOIN companies c ON u.company_id = c.id
LEFT JOIN order_states os ON o.status = os.id
LEFT JOIN budget_items bi ON o.id = bi.order_id
GROUP BY o.id, u.id, c.id, os.id;

CREATE OR REPLACE FUNCTION get_order_budget_total(order_uuid UUID)
RETURNS DECIMAL AS $$
  SELECT COALESCE(SUM(
    amount - CASE
      WHEN discount_type = 'percentage' THEN amount * COALESCE(discount_value, 0) / 100
      WHEN discount_type = 'fixed' THEN LEAST(amount, COALESCE(discount_value, 0))
      ELSE 0
    END
  ), 0)::DECIMAL
  FROM budget_items
  WHERE order_id = order_uuid;
$$ LANGUAGE SQL;

COMMIT;


