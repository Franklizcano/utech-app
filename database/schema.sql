-- ============================================
-- SCHEMA: Sistema de Gestión de Reparaciones
-- Base de Datos: Supabase PostgreSQL
-- ============================================

-- Crear extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- Tabla: roles
-- Descripción: Tipos de roles disponibles en el sistema
-- ============================================
CREATE TABLE IF NOT EXISTS roles (
  id TEXT PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO roles (id, name, description) VALUES
  ('admin', 'Administrador', 'Acceso completo al sistema'),
  ('colaborador', 'Colaborador', 'Gestión de órdenes y diagnóstico'),
  ('presupuestador', 'Responsable de presupuestos', 'Gestiona presupuestos y sus aprobaciones'),
  ('cliente', 'Cliente', 'Acceso a órdenes personales y seguimiento')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- Tabla: users (Usuarios)
-- Descripción: Almacena usuarios del sistema
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  phone VARCHAR(20) NOT NULL,
  role TEXT NOT NULL REFERENCES roles(id),
  password_hash TEXT NOT NULL DEFAULT '',
  active BOOLEAN DEFAULT true,
  referral_code VARCHAR(12) NOT NULL UNIQUE DEFAULT upper(encode(gen_random_bytes(6), 'hex')),
  referred_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT users_not_self_referred CHECK (referred_by IS NULL OR referred_by <> id)
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(active);
CREATE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code);
CREATE INDEX IF NOT EXISTS idx_users_referred_by ON users(referred_by);

-- Empresas: administración independiente de clientes corporativos.
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL UNIQUE,
  logo TEXT,
  user_limit INTEGER NOT NULL DEFAULT 1 CHECK (user_limit >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_users_company_id ON users(company_id);

-- ============================================
-- Tabla: order_states (Estados de Órdenes)
-- Descripción: Define los estados del flujo de reparación
-- ============================================
CREATE TABLE IF NOT EXISTS order_states (
  id TEXT PRIMARY KEY,
  label VARCHAR(100) NOT NULL,
  color VARCHAR(7) NOT NULL, -- Código hex de color
  position INTEGER NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE order_states
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE order_states
  DROP CONSTRAINT IF EXISTS order_states_position_key;

CREATE UNIQUE INDEX IF NOT EXISTS idx_order_states_active_position_unique
  ON order_states (position)
  WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_order_states_active
  ON order_states (is_active);

INSERT INTO order_states (id, label, color, position) VALUES
  ('recibido', 'Recibido', '#8b5cf6', 0),
  ('en_diagnostico', 'En diagnóstico', '#06b6d4', 1),
  ('esperando_repuestos', 'Esperando repuestos', '#f59e0b', 2),
  ('en_reparacion', 'En reparación', '#3b82f6', 3),
  ('listo', 'Listo para retirar', '#10b981', 4),
  ('entregado', 'Entregado', '#6366f1', 9),
  ('pendiente_presupuesto', 'Pendiente de presupuesto', '#f97316', 5),
  ('presupuesto_enviado', 'Presupuesto enviado', '#eab308', 6),
  ('presupuesto_aprobado', 'Presupuesto aprobado', '#22c55e', 7),
  ('presupuesto_rechazado', 'Presupuesto rechazado', '#ef4444', 8)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- Tabla: orders (Órdenes de Reparación)
-- Descripción: Almacena las órdenes de reparación
-- ============================================
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(32) NOT NULL UNIQUE,
  -- Información del cliente
  client_id UUID REFERENCES users(id) ON DELETE SET NULL, -- NULL para clientes ocasionales
  client_name VARCHAR(255) NOT NULL,
  client_phone VARCHAR(20) NOT NULL,
  client_email VARCHAR(255) NOT NULL,
  -- Información del equipo
  device_type VARCHAR(50) NOT NULL, -- PC, Notebook, PlayStation, Xbox, Nintendo, Otro
  device_brand VARCHAR(100) NOT NULL,
  device_model VARCHAR(100) NOT NULL,
  device_serial VARCHAR(255), -- Serial del equipo; puede no estar disponible
  fault TEXT NOT NULL, -- Descripción del daño/problema
  -- Gestión de la orden
  status TEXT NOT NULL REFERENCES order_states(id),
  assigned_to VARCHAR(255), -- Nombre del empleado asignado; NULL hasta que un colaborador tome la orden
  budget_assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  budget_decision TEXT CHECK (budget_decision IS NULL OR budget_decision IN ('aprobado', 'rechazado')),
  budget_decision_note TEXT,
  budget_submitted_at TIMESTAMP WITH TIME ZONE,
  budget_decided_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_orders_code ON orders(code);
CREATE INDEX IF NOT EXISTS idx_orders_client_id ON orders(client_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_assigned_to ON orders(assigned_to);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_device_serial ON orders(device_serial);
CREATE INDEX IF NOT EXISTS idx_orders_unassigned ON orders(created_at DESC) WHERE assigned_to IS NULL;

CREATE TABLE IF NOT EXISTS order_code_counter (
  id BOOLEAN PRIMARY KEY DEFAULT true CHECK (id),
  current_value BIGINT NOT NULL DEFAULT 0 CHECK (current_value >= 0)
);

INSERT INTO order_code_counter (id, current_value)
VALUES (true, 0)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- Tabla: budget_items (Presupuesto)
-- Descripción: Items de costo en una orden
-- ============================================
CREATE TABLE IF NOT EXISTS budget_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  description VARCHAR(255) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  discount_type TEXT CHECK (discount_type IS NULL OR discount_type IN ('fixed', 'percentage')),
  discount_value DECIMAL(10, 2) CHECK (discount_value IS NULL OR discount_value >= 0),
  CONSTRAINT budget_items_discount_amount_check CHECK (discount_type <> 'fixed' OR discount_value IS NULL OR discount_value <= amount),
  CONSTRAINT budget_items_discount_percentage_check CHECK (discount_type <> 'percentage' OR discount_value IS NULL OR discount_value <= 100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_budget_items_order_id ON budget_items(order_id);

-- ============================================
-- Tabla: timeline_events (Eventos de Línea de Tiempo)
-- Descripción: Registro de cambios de estado de una orden
-- ============================================
CREATE TABLE IF NOT EXISTS timeline_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status TEXT NOT NULL REFERENCES order_states(id),
  note TEXT, -- Nota adicional del cambio de estado
  event_date TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_timeline_events_order_id ON timeline_events(order_id);
CREATE INDEX IF NOT EXISTS idx_timeline_events_status ON timeline_events(status);

-- ============================================
-- Tabla: notifications (Notificaciones)
-- Descripción: Notificaciones enviadas a clientes sobre sus órdenes
-- ============================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  notification_date TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notifications_order_id ON notifications(order_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);

-- ============================================
-- Tabla: general_announcements (Avisos generales)
-- ============================================
CREATE TABLE IF NOT EXISTS general_announcements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  audience VARCHAR(40) NOT NULL CHECK (audience IN ('personal', 'admin', 'colaborador', 'cliente_particular', 'cliente_corporativo')),
  priority VARCHAR(20) NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal', 'importante')),
  active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_general_announcements_active ON general_announcements(active, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_general_announcements_audience ON general_announcements(audience);

CREATE TABLE IF NOT EXISTS general_announcement_reads (
  announcement_id UUID NOT NULL REFERENCES general_announcements(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  read_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (announcement_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_general_announcement_reads_user ON general_announcement_reads(user_id);

-- ============================================
-- Vistas útiles
-- ============================================

-- Vista: Órdenes con información resumida del cliente y presupuesto total
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
  os.label as status_label,
  os.color as status_color,
  o.assigned_to,
  COALESCE(SUM(
    bi.amount - CASE
      WHEN bi.discount_type = 'percentage' THEN bi.amount * COALESCE(bi.discount_value, 0) / 100
      WHEN bi.discount_type = 'fixed' THEN LEAST(bi.amount, COALESCE(bi.discount_value, 0))
      ELSE 0
    END
  ), 0)::DECIMAL as budget_total,
  o.created_at,
  o.updated_at,
  o.device_serial
FROM orders o
LEFT JOIN users u ON o.client_id = u.id
LEFT JOIN companies c ON u.company_id = c.id
LEFT JOIN order_states os ON o.status = os.id
LEFT JOIN budget_items bi ON o.id = bi.order_id
GROUP BY o.id, u.id, c.id, os.id;

-- Vista: Últimas notificaciones de cada orden
CREATE OR REPLACE VIEW v_latest_notifications AS
SELECT DISTINCT ON (order_id)
  order_id,
  message,
  read,
  notification_date
FROM notifications
ORDER BY order_id, notification_date DESC;

-- ============================================
-- Funciones útiles
-- ============================================

-- Función: Obtener total de presupuesto de una orden
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

-- Función: Obtener estadísticas de órdenes
CREATE OR REPLACE FUNCTION get_order_statistics()
RETURNS TABLE(
  total_orders BIGINT,
  completed_orders BIGINT,
  pending_orders BIGINT,
  average_budget DECIMAL
) AS $$
  SELECT 
    COUNT(o.id)::BIGINT as total_orders,
    COUNT(CASE WHEN o.status = 'entregado' THEN 1 END)::BIGINT as completed_orders,
    COUNT(CASE WHEN o.status != 'entregado' THEN 1 END)::BIGINT as pending_orders,
    COALESCE(AVG(get_order_budget_total(o.id)), 0)::DECIMAL as average_budget
  FROM orders o;
$$ LANGUAGE SQL;

-- ============================================
-- Row Level Security (RLS) - Seguridad
-- ============================================

-- Habilitar RLS en las tablas
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE timeline_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE general_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE general_announcement_reads ENABLE ROW LEVEL SECURITY;

-- Políticas de acceso básicas (modificar según tus necesidades de autenticación)
-- Nota: Estas son ejemplos. Ajusta según tu sistema de autenticación real.

-- Users: Solo admin puede ver todos los usuarios
CREATE POLICY "admin_view_all_users" ON users
  FOR SELECT USING (
    auth.jwt() ->> 'role' = 'admin'
  );

-- Orders: Los clientes solo ven sus propias órdenes
CREATE POLICY "clients_view_own_orders" ON orders
  FOR SELECT USING (
    client_id = (SELECT id FROM users WHERE id = auth.uid())
  );

-- Employees y Admin pueden ver todas las órdenes
CREATE POLICY "employees_view_all_orders" ON orders
  FOR SELECT USING (
    auth.jwt() ->> 'role' IN ('admin', 'colaborador')
  );

-- ============================================
-- Datos de ejemplo (Opcional)
-- ============================================

-- Insertar usuarios de ejemplo
INSERT INTO users (name, email, phone, role, active, created_at) VALUES
  ('Lucía Fernández', 'lucia@tecnofix.com', '+54 11 2222-8888', 'admin', true, NOW() - INTERVAL '120 days'),
  ('Martín Gómez', 'martin@tecnofix.com', '+54 11 3333-4444', 'colaborador', true, NOW() - INTERVAL '90 days'),
  ('Sofía Ruiz', 'sofia@tecnofix.com', '+54 11 4444-5555', 'colaborador', true, NOW() - INTERVAL '45 days'),
  ('Diego Páez', 'diego@tecnofix.com', '+54 11 5555-6666', 'colaborador', false, NOW() - INTERVAL '20 days'),
  ('Juan Pérez', 'juan.perez@mail.com', '+54 11 5555-1234', 'cliente', true, NOW() - INTERVAL '6 days'),
  ('María López', 'maria.lopez@mail.com', '+54 11 4444-9876', 'cliente', true, NOW() - INTERVAL '4 days'),
  ('Carlos Díaz', 'carlos.diaz@mail.com', '+54 11 3333-2211', 'cliente', true, NOW() - INTERVAL '1 day')
ON CONFLICT (email) DO NOTHING;

-- Insertar órdenes de ejemplo
INSERT INTO orders (code, client_id, client_name, client_phone, client_email, device_type, device_brand, device_model, fault, status, assigned_to) 
SELECT 
  'CP-240701-0001',
  (SELECT id FROM users WHERE email = 'juan.perez@mail.com'),
  'Juan Pérez',
  '+54 11 5555-1234',
  'juan.perez@mail.com',
  'PlayStation',
  'Sony',
  'PS5 Slim',
  'No da imagen por HDMI, se escucha el ventilador pero la TV no detecta señal.',
  'esperando_repuestos',
  'Martín Gómez'
WHERE NOT EXISTS (SELECT 1 FROM orders WHERE code = 'CP-240701-0001');

INSERT INTO orders (code, client_id, client_name, client_phone, client_email, device_type, device_brand, device_model, fault, status, assigned_to)
SELECT
  'CP-240703-0002',
  (SELECT id FROM users WHERE email = 'maria.lopez@mail.com'),
  'María López',
  '+54 11 4444-9876',
  'maria.lopez@mail.com',
  'Notebook',
  'Lenovo',
  'IdeaPad 3',
  'Se apaga sola al rato de encender. Posible sobrecalentamiento.',
  'listo',
  'Sofía Ruiz'
WHERE NOT EXISTS (SELECT 1 FROM orders WHERE code = 'CP-240703-0002');

INSERT INTO orders (code, client_id, client_name, client_phone, client_email, device_type, device_brand, device_model, fault, status, assigned_to)
SELECT
  'CP-240706-0003',
  (SELECT id FROM users WHERE email = 'carlos.diaz@mail.com'),
  'Carlos Díaz',
  '+54 11 3333-2211',
  'carlos.diaz@mail.com',
  'PC',
  'Armada',
  'Gamer Ryzen 5',
  'No enciende. No hay luces ni ventiladores al apretar el botón.',
  'en_diagnostico',
  'Martín Gómez'
WHERE NOT EXISTS (SELECT 1 FROM orders WHERE code = 'CP-240706-0003');

-- Insertar items de presupuesto
INSERT INTO budget_items (order_id, description, amount)
SELECT id, 'Cambio de módulo HDMI PS5', 28000
FROM orders WHERE code = 'CP-240701-0001'
ON CONFLICT DO NOTHING;

INSERT INTO budget_items (order_id, description, amount)
SELECT id, 'Mano de obra (microsoldadura)', 22000
FROM orders WHERE code = 'CP-240701-0001'
ON CONFLICT DO NOTHING;

INSERT INTO budget_items (order_id, description, amount)
SELECT id, 'Limpieza y pasta térmica', 6000
FROM orders WHERE code = 'CP-240701-0001'
ON CONFLICT DO NOTHING;

INSERT INTO budget_items (order_id, description, amount)
SELECT id, 'Cambio de pasta térmica', 9000
FROM orders WHERE code = 'CP-240703-0002'
ON CONFLICT DO NOTHING;

INSERT INTO budget_items (order_id, description, amount)
SELECT id, 'Limpieza interna de disipador', 7000
FROM orders WHERE code = 'CP-240703-0002'
ON CONFLICT DO NOTHING;

INSERT INTO budget_items (order_id, description, amount)
SELECT id, 'Mano de obra', 12000
FROM orders WHERE code = 'CP-240703-0002'
ON CONFLICT DO NOTHING;

-- Insertar eventos de línea de tiempo
INSERT INTO timeline_events (order_id, status, note, event_date)
SELECT id, 'recibido', 'Equipo ingresado en mostrador.', NOW() - INTERVAL '6 days'
FROM orders WHERE code = 'CP-240701-0001'
ON CONFLICT DO NOTHING;

INSERT INTO timeline_events (order_id, status, note, event_date)
SELECT id, 'en_diagnostico', 'Se confirma puerto HDMI dañado.', NOW() - INTERVAL '5 days'
FROM orders WHERE code = 'CP-240701-0001'
ON CONFLICT DO NOTHING;

INSERT INTO timeline_events (order_id, status, note, event_date)
SELECT id, 'esperando_repuestos', 'Se encarga módulo HDMI original.', NOW() - INTERVAL '3 days'
FROM orders WHERE code = 'CP-240701-0001'
ON CONFLICT DO NOTHING;

-- Insertar notificaciones
INSERT INTO notifications (order_id, message, read, notification_date)
SELECT id, 'Tu PS5 fue recibida. Te avisaremos con el diagnóstico.', true, NOW() - INTERVAL '6 days'
FROM orders WHERE code = 'CP-240701-0001'
ON CONFLICT DO NOTHING;

INSERT INTO notifications (order_id, message, read, notification_date)
SELECT id, 'Presupuesto cargado. Total estimado disponible en tu portal.', true, NOW() - INTERVAL '5 days'
FROM orders WHERE code = 'CP-240701-0001'
ON CONFLICT DO NOTHING;

INSERT INTO notifications (order_id, message, read, notification_date)
SELECT id, 'Estamos esperando el repuesto (módulo HDMI).', false, NOW() - INTERVAL '3 days'
FROM orders WHERE code = 'CP-240701-0001'
ON CONFLICT DO NOTHING;

INSERT INTO notifications (order_id, message, read, notification_date)
SELECT id, 'Tu notebook está lista para retirar.', false, NOW() - INTERVAL '1 day'
FROM orders WHERE code = 'CP-240703-0002'
ON CONFLICT DO NOTHING;

INSERT INTO notifications (order_id, message, read, notification_date)
SELECT id, 'Recibimos tu PC, estamos haciendo el diagnóstico.', false, NOW() - INTERVAL '1 day'
FROM orders WHERE code = 'CP-240706-0003'
ON CONFLICT DO NOTHING;

UPDATE order_code_counter SET current_value = (SELECT COUNT(*) FROM orders) WHERE id = true;

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
  INSERT INTO order_code_counter (id, current_value) VALUES (true, 0) ON CONFLICT (id) DO NOTHING;
  SELECT current_value INTO v_counter FROM order_code_counter WHERE id = true FOR UPDATE;
  v_counter := v_counter + 1;
  IF p_client_id IS NULL THEN
    v_prefix := 'CO';
  ELSIF EXISTS (SELECT 1 FROM users WHERE id = p_client_id AND company_id IS NOT NULL) THEN
    v_prefix := 'CC';
  ELSE
    v_prefix := 'CP';
  END IF;
  v_code := v_prefix || '-' || to_char(v_created_at AT TIME ZONE 'America/Argentina/Buenos_Aires', 'YYMMDD') || lpad(v_counter::text, 4, '0');
  UPDATE order_code_counter SET current_value = v_counter WHERE id = true;
  RETURN QUERY
  INSERT INTO orders (code, client_id, client_name, client_phone, client_email, device_type, device_brand, device_model, device_serial, fault, status, assigned_to, created_at, updated_at)
  VALUES (v_code, p_client_id, p_client_name, p_client_phone, p_client_email, p_device_type, p_device_brand, p_device_model, p_device_serial, p_fault, p_status, p_assigned_to, v_created_at, v_created_at)
  RETURNING *;
END;
$$;

CREATE OR REPLACE FUNCTION search_occasional_tickets(p_query TEXT)
RETURNS TABLE(code VARCHAR, status TEXT)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT o.code, o.status FROM orders o
  WHERE o.client_id IS NULL
    AND upper(regexp_replace(o.code, '[-[:space:]]', '', 'g')) LIKE '%' || upper(regexp_replace(trim(p_query), '[-[:space:]]', '', 'g')) || '%'
  ORDER BY o.created_at DESC
  LIMIT 50;
$$;
