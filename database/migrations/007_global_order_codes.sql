-- Códigos globales: PREFIJO-YYMMDDCONTADOR.
-- La migración conserva el orden cronológico y no depende del UUID como desempate.
BEGIN;

DROP VIEW IF EXISTS v_orders_summary;

ALTER TABLE orders ALTER COLUMN code TYPE VARCHAR(32);

CREATE TABLE IF NOT EXISTS order_code_counter (
  id BOOLEAN PRIMARY KEY DEFAULT true CHECK (id),
  current_value BIGINT NOT NULL CHECK (current_value >= 0)
);

WITH numbered_orders AS (
  SELECT
    o.id,
    o.created_at,
    o.client_id,
    ROW_NUMBER() OVER (ORDER BY o.created_at) AS counter_value
  FROM orders o
), classified_orders AS (
  SELECT
    n.id,
    n.created_at,
    n.counter_value,
    CASE
      WHEN n.client_id IS NULL THEN 'CO'
      WHEN u.company_id IS NOT NULL THEN 'CC'
      ELSE 'CP'
    END AS prefix
  FROM numbered_orders n
  LEFT JOIN users u ON u.id = n.client_id
)
UPDATE orders o
SET code = c.prefix || '-' ||
  to_char(c.created_at AT TIME ZONE 'America/Argentina/Buenos_Aires', 'YYMMDD') ||
  lpad(c.counter_value::text, 4, '0')
FROM classified_orders c
WHERE o.id = c.id;

INSERT INTO order_code_counter (id, current_value)
VALUES (true, (SELECT COUNT(*) FROM orders))
ON CONFLICT (id) DO UPDATE SET current_value = EXCLUDED.current_value;

CREATE OR REPLACE FUNCTION create_order_with_code(
  p_client_id UUID,
  p_client_name VARCHAR,
  p_client_phone VARCHAR,
  p_client_email VARCHAR,
  p_device_type VARCHAR,
  p_device_brand VARCHAR,
  p_device_model VARCHAR,
  p_device_serial VARCHAR,
  p_fault TEXT,
  p_status TEXT,
  p_assigned_to VARCHAR
)
RETURNS SETOF orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_counter BIGINT;
  v_prefix TEXT;
  v_created_at TIMESTAMPTZ := CURRENT_TIMESTAMP;
  v_code TEXT;
BEGIN
  INSERT INTO order_code_counter (id, current_value)
  VALUES (true, 0)
  ON CONFLICT (id) DO NOTHING;

  SELECT current_value INTO v_counter
  FROM order_code_counter
  WHERE id = true
  FOR UPDATE;

  v_counter := v_counter + 1;

  IF p_client_id IS NULL THEN
    v_prefix := 'CO';
  ELSIF EXISTS (SELECT 1 FROM users WHERE id = p_client_id AND company_id IS NOT NULL) THEN
    v_prefix := 'CC';
  ELSE
    v_prefix := 'CP';
  END IF;

  v_code := v_prefix || '-' ||
    to_char(v_created_at AT TIME ZONE 'America/Argentina/Buenos_Aires', 'YYMMDD') ||
    lpad(v_counter::text, 4, '0');

  UPDATE order_code_counter SET current_value = v_counter WHERE id = true;

  RETURN QUERY
  INSERT INTO orders (
    code, client_id, client_name, client_phone, client_email,
    device_type, device_brand, device_model, device_serial, fault,
    status, assigned_to, created_at, updated_at
  ) VALUES (
    v_code, p_client_id, p_client_name, p_client_phone, p_client_email,
    p_device_type, p_device_brand, p_device_model, p_device_serial, p_fault,
    p_status, p_assigned_to, v_created_at, v_created_at
  )
  RETURNING *;
END;
$$;

CREATE OR REPLACE FUNCTION search_occasional_tickets(p_query TEXT)
RETURNS TABLE(code VARCHAR, status TEXT)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT o.code, o.status
  FROM orders o
  WHERE o.client_id IS NULL
    AND upper(regexp_replace(o.code, '[-[:space:]]', '', 'g')) LIKE
      '%' || upper(regexp_replace(trim(p_query), '[-[:space:]]', '', 'g')) || '%'
  ORDER BY o.created_at DESC
  LIMIT 50;
$$;

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



