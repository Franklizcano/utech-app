-- Simplifica la pertenencia corporativa: company_id NULL significa usuario independiente.
-- Esta migración debe ejecutarse después de 003_companies_and_corporate_users.sql.

BEGIN;

-- La vista existente todavía depende de las columnas corporativas antiguas de users.
DROP VIEW IF EXISTS v_orders_summary;

INSERT INTO companies (name, logo)
SELECT company_name, MAX(company_logo)
FROM users
WHERE company_name IS NOT NULL AND TRIM(company_name) <> ''
GROUP BY company_name
ON CONFLICT (name) DO UPDATE
SET logo = COALESCE(companies.logo, EXCLUDED.logo);

UPDATE users u
SET company_id = c.id
FROM companies c
WHERE u.company_id IS NULL
  AND u.company_name = c.name;

ALTER TABLE users
  DROP COLUMN IF EXISTS is_corporate,
  DROP COLUMN IF EXISTS company_name,
  DROP COLUMN IF EXISTS company_logo;

CREATE VIEW v_orders_summary AS
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
  o.updated_at
FROM orders o
LEFT JOIN users u ON o.client_id = u.id
LEFT JOIN companies c ON u.company_id = c.id
LEFT JOIN order_states os ON o.status = os.id
LEFT JOIN budget_items bi ON o.id = bi.order_id
GROUP BY o.id, u.id, c.id, os.id;

COMMIT;



