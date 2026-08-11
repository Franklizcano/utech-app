-- ============================================
-- SCHEMA: Sistema de Gestión de Reparaciones
-- Base de Datos: Supabase PostgreSQL
-- ============================================

-- Crear extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(active);

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
  position INTEGER NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO order_states (id, label, color, position) VALUES
  ('recibido', 'Recibido', '#8b5cf6', 0),
  ('en_diagnostico', 'En diagnóstico', '#06b6d4', 1),
  ('esperando_repuestos', 'Esperando repuestos', '#f59e0b', 2),
  ('en_reparacion', 'En reparación', '#3b82f6', 3),
  ('listo', 'Listo para retirar', '#10b981', 4),
  ('entregado', 'Entregado', '#6366f1', 5)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- Tabla: orders (Órdenes de Reparación)
-- Descripción: Almacena las órdenes de reparación
-- ============================================
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(20) NOT NULL UNIQUE,
  -- Información del cliente
  client_id UUID REFERENCES users(id) ON DELETE SET NULL, -- NULL para clientes ocasionales
  client_name VARCHAR(255) NOT NULL,
  client_phone VARCHAR(20) NOT NULL,
  client_email VARCHAR(255) NOT NULL,
  -- Información del equipo
  device_type VARCHAR(50) NOT NULL, -- PC, Notebook, PlayStation, Xbox, Nintendo, Otro
  device_brand VARCHAR(100) NOT NULL,
  device_model VARCHAR(100) NOT NULL,
  fault TEXT NOT NULL, -- Descripción del daño/problema
  -- Gestión de la orden
  status TEXT NOT NULL REFERENCES order_states(id),
  assigned_to VARCHAR(255) NOT NULL, -- Nombre del empleado asignado
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_orders_code ON orders(code);
CREATE INDEX IF NOT EXISTS idx_orders_client_id ON orders(client_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_assigned_to ON orders(assigned_to);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);

-- ============================================
-- Tabla: budget_items (Presupuesto)
-- Descripción: Items de costo en una orden
-- ============================================
CREATE TABLE IF NOT EXISTS budget_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  description VARCHAR(255) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
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
  COALESCE(SUM(bi.amount), 0)::DECIMAL as budget_total,
  o.created_at,
  o.updated_at
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
  SELECT COALESCE(SUM(amount), 0)::DECIMAL 
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
  'TF-1024',
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
WHERE NOT EXISTS (SELECT 1 FROM orders WHERE code = 'TF-1024');

INSERT INTO orders (code, client_id, client_name, client_phone, client_email, device_type, device_brand, device_model, fault, status, assigned_to)
SELECT
  'TF-1025',
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
WHERE NOT EXISTS (SELECT 1 FROM orders WHERE code = 'TF-1025');

INSERT INTO orders (code, client_id, client_name, client_phone, client_email, device_type, device_brand, device_model, fault, status, assigned_to)
SELECT
  'TF-1026',
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
WHERE NOT EXISTS (SELECT 1 FROM orders WHERE code = 'TF-1026');

-- Insertar items de presupuesto
INSERT INTO budget_items (order_id, description, amount)
SELECT id, 'Cambio de módulo HDMI PS5', 28000
FROM orders WHERE code = 'TF-1024'
ON CONFLICT DO NOTHING;

INSERT INTO budget_items (order_id, description, amount)
SELECT id, 'Mano de obra (microsoldadura)', 22000
FROM orders WHERE code = 'TF-1024'
ON CONFLICT DO NOTHING;

INSERT INTO budget_items (order_id, description, amount)
SELECT id, 'Limpieza y pasta térmica', 6000
FROM orders WHERE code = 'TF-1024'
ON CONFLICT DO NOTHING;

INSERT INTO budget_items (order_id, description, amount)
SELECT id, 'Cambio de pasta térmica', 9000
FROM orders WHERE code = 'TF-1025'
ON CONFLICT DO NOTHING;

INSERT INTO budget_items (order_id, description, amount)
SELECT id, 'Limpieza interna de disipador', 7000
FROM orders WHERE code = 'TF-1025'
ON CONFLICT DO NOTHING;

INSERT INTO budget_items (order_id, description, amount)
SELECT id, 'Mano de obra', 12000
FROM orders WHERE code = 'TF-1025'
ON CONFLICT DO NOTHING;

-- Insertar eventos de línea de tiempo
INSERT INTO timeline_events (order_id, status, note, event_date)
SELECT id, 'recibido', 'Equipo ingresado en mostrador.', NOW() - INTERVAL '6 days'
FROM orders WHERE code = 'TF-1024'
ON CONFLICT DO NOTHING;

INSERT INTO timeline_events (order_id, status, note, event_date)
SELECT id, 'en_diagnostico', 'Se confirma puerto HDMI dañado.', NOW() - INTERVAL '5 days'
FROM orders WHERE code = 'TF-1024'
ON CONFLICT DO NOTHING;

INSERT INTO timeline_events (order_id, status, note, event_date)
SELECT id, 'esperando_repuestos', 'Se encarga módulo HDMI original.', NOW() - INTERVAL '3 days'
FROM orders WHERE code = 'TF-1024'
ON CONFLICT DO NOTHING;

-- Insertar notificaciones
INSERT INTO notifications (order_id, message, read, notification_date)
SELECT id, 'Tu PS5 fue recibida. Te avisaremos con el diagnóstico.', true, NOW() - INTERVAL '6 days'
FROM orders WHERE code = 'TF-1024'
ON CONFLICT DO NOTHING;

INSERT INTO notifications (order_id, message, read, notification_date)
SELECT id, 'Presupuesto cargado. Total estimado disponible en tu portal.', true, NOW() - INTERVAL '5 days'
FROM orders WHERE code = 'TF-1024'
ON CONFLICT DO NOTHING;

INSERT INTO notifications (order_id, message, read, notification_date)
SELECT id, 'Estamos esperando el repuesto (módulo HDMI).', false, NOW() - INTERVAL '3 days'
FROM orders WHERE code = 'TF-1024'
ON CONFLICT DO NOTHING;

INSERT INTO notifications (order_id, message, read, notification_date)
SELECT id, 'Tu notebook está lista para retirar.', false, NOW() - INTERVAL '1 day'
FROM orders WHERE code = 'TF-1025'
ON CONFLICT DO NOTHING;

INSERT INTO notifications (order_id, message, read, notification_date)
SELECT id, 'Recibimos tu PC, estamos haciendo el diagnóstico.', false, NOW() - INTERVAL '1 day'
FROM orders WHERE code = 'TF-1026'
ON CONFLICT DO NOTHING;
