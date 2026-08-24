# Guía de Queries Útiles

## Operaciones Comunes en el Sistema

---

## 👥 USUARIOS (Users)

### Crear un nuevo usuario
```sql
INSERT INTO users (name, email, phone, role, active)
VALUES ('Juan Nuevo', 'juan.nuevo@tecnofix.com', '+54 11 1234-5678', 'empleado', true)
RETURNING id, email;
```

### Crear un cliente corporativo
```sql
INSERT INTO users (name, email, phone, role, active, company_id)
VALUES (
  'Contacto Empresa XYZ',
  'contacto@empresaxyz.com',
  '+54 11 8765-4321',
  'cliente',
  true,
  (SELECT id FROM companies WHERE name = 'Empresa XYZ S.A.')
)
RETURNING id, company_id;
```

### Listar todos los empleados activos
```sql
SELECT id, name, email, phone, role
FROM users
WHERE role IN ('admin', 'empleado') AND active = true
ORDER BY name ASC;
```

### Obtener información de un usuario por email
```sql
SELECT u.id, u.name, u.email, u.phone, u.role, u.active, u.company_id, c.name AS company_name
FROM users u
LEFT JOIN companies c ON c.id = u.company_id
WHERE email = 'juan.perez@mail.com';
```

### Desactivar un usuario (sin eliminar)
```sql
UPDATE users
SET active = false, updated_at = CURRENT_TIMESTAMP
WHERE id = '550e8400-e29b-41d4-a716-446655440000'
RETURNING name, active;
```

### Actualizar información de usuario
```sql
UPDATE users
SET name = 'Juan Pérez García', phone = '+54 11 9999-8888', updated_at = CURRENT_TIMESTAMP
WHERE email = 'juan.perez@mail.com'
RETURNING id, name, email;
```

### Contar usuarios por rol
```sql
SELECT role, COUNT(*) as total
FROM users
WHERE active = true
GROUP BY role
ORDER BY total DESC;
```

---

## 📦 ÓRDENES (Orders)

### Crear una nueva orden
```sql
INSERT INTO orders (
  code,
  client_id,
  client_name,
  client_phone,
  client_email,
  device_type,
  device_brand,
  device_model,
  fault,
  status,
  assigned_to
) VALUES (
  'CP-2407010001',
  (SELECT id FROM users WHERE email = 'cliente@mail.com'),
  'Cliente Nuevo',
  '+54 11 1111-2222',
  'cliente@mail.com',
  'Notebook',
  'HP',
  'Pavilion 15',
  'No carga la batería',
  'recibido',
  'Martín Gómez'
)
RETURNING code, client_name, status;
```

### Crear orden con cliente ocasional (sin registrar)
```sql
INSERT INTO orders (
  code,
  client_id,
  client_name,
  client_phone,
  client_email,
  device_type,
  device_brand,
  device_model,
  fault,
  status,
  assigned_to
) VALUES (
  'CO-240707-0004',
  NULL,  -- Sin cliente registrado
  'Roberto García',
  '+54 9 11 3333-4444',
  'roberto@example.com',
  'PC',
  'Armada',
  'Gaming Ryzen 7',
  'Se congela durante juegos',
  'recibido',
  'Sofía Ruiz'
)
RETURNING code, client_name;
```

### Obtener orden por código
```sql
SELECT id, code, client_name, client_email, device_brand, device_model, 
       fault, status, assigned_to, created_at
FROM orders
WHERE code = 'CP-2407010001';
```

### Listar todas las órdenes activas
```sql
SELECT 
  o.code,
  o.client_name,
  o.device_brand,
  o.device_model,
  os.label as status,
  o.assigned_to,
  o.created_at
FROM orders o
LEFT JOIN order_states os ON o.status = os.id
WHERE o.status != 'entregado'
ORDER BY o.created_at DESC;
```

### Obtener órdenes de un cliente específico
```sql
SELECT code, device_brand, device_model, status, assigned_to, created_at
FROM orders
WHERE client_email = 'juan.perez@mail.com'
ORDER BY created_at DESC;
```

### Cambiar estado de una orden
```sql
UPDATE orders
SET status = 'en_reparacion', updated_at = CURRENT_TIMESTAMP
WHERE code = 'CP-2407010001'
RETURNING code, status;
```

### Asignar orden a diferente empleado
```sql
UPDATE orders
SET assigned_to = 'Sofía Ruiz', updated_at = CURRENT_TIMESTAMP
WHERE code = 'CP-2407010001'
RETURNING code, assigned_to;
```

### Órdenes por empleado
```sql
SELECT 
  assigned_to,
  COUNT(*) as total_orders,
  COUNT(CASE WHEN status = 'entregado' THEN 1 END) as completed,
  COUNT(CASE WHEN status != 'entregado' THEN 1 END) as pending
FROM orders
GROUP BY assigned_to
ORDER BY total_orders DESC;
```

### Órdenes por estado
```sql
SELECT 
  os.label as estado,
  COUNT(o.id) as cantidad,
  ROUND(COUNT(o.id)::numeric / (SELECT COUNT(*) FROM orders) * 100, 1) as porcentaje
FROM orders o
LEFT JOIN order_states os ON o.status = os.id
GROUP BY os.id, os.label, os.position
ORDER BY os.position ASC;
```

---

## 💰 PRESUPUESTOS (Budget Items)

### Agregar item de presupuesto
```sql
INSERT INTO budget_items (order_id, description, amount, discount_type, discount_value)
VALUES (
  (SELECT id FROM orders WHERE code = 'CP-2407010001'),
  'Reemplazo de batería',
  15000,
  'percentage',
  10
)
RETURNING id, description, amount, discount_type, discount_value;
```

### Ver presupuesto de una orden
```sql
SELECT 
  description,
  amount,
  discount_type,
  discount_value,
  amount - CASE
    WHEN discount_type = 'percentage' THEN amount * COALESCE(discount_value, 0) / 100
    WHEN discount_type = 'fixed' THEN LEAST(amount, COALESCE(discount_value, 0))
    ELSE 0
  END AS total_final
FROM budget_items bi
JOIN orders o ON bi.order_id = o.id
WHERE o.code = 'CP-2407010001'
ORDER BY bi.created_at ASC;
```

### Total de presupuesto por orden
```sql
SELECT 
  o.code,
  o.client_name,
  o.device_brand,
  get_order_budget_total(o.id) as total
FROM orders o
WHERE o.status != 'entregado'
ORDER BY get_order_budget_total(o.id) DESC;
```

### Órdenes por rango de presupuesto
```sql
SELECT 
  code,
  client_name,
  device_brand,
  get_order_budget_total(id) as presupuesto
FROM orders
WHERE get_order_budget_total(id) BETWEEN 20000 AND 50000
ORDER BY get_order_budget_total(id) DESC;
```

### Eliminar item de presupuesto
```sql
DELETE FROM budget_items
WHERE id = '550e8400-e29b-41d4-a716-446655440000'
RETURNING order_id, description;
```

### Total de ingresos estimados (órdenes pendientes)
```sql
SELECT 
  COALESCE(SUM(get_order_budget_total(id)), 0) as ingresos_estimados
FROM orders
WHERE status != 'entregado';
```

---

## 📅 LÍNEA DE TIEMPO (Timeline Events)

### Agregar evento a la línea de tiempo
```sql
INSERT INTO timeline_events (order_id, status, note, event_date)
VALUES (
  (SELECT id FROM orders WHERE code = 'CP-2407010001'),
  'en_reparacion',
  'Se inicia reparación del módulo HDMI',
  CURRENT_TIMESTAMP
)
RETURNING status, note, event_date;
```

### Ver línea de tiempo completa de una orden
```sql
SELECT 
  os.label as estado,
  te.note as nota,
  te.event_date,
  EXTRACT(DAY FROM CURRENT_TIMESTAMP - te.event_date) as hace_dias
FROM timeline_events te
LEFT JOIN order_states os ON te.status = os.id
WHERE te.order_id = (SELECT id FROM orders WHERE code = 'CP-2407010001')
ORDER BY te.event_date ASC;
```

### Tiempo promedio entre estados
```sql
SELECT 
  EXTRACT(DAY FROM AVG(LEAD(event_date) OVER (ORDER BY event_date) - event_date)) as dias_promedio
FROM timeline_events
WHERE order_id = (SELECT id FROM orders WHERE code = 'CP-2407010001');
```

---

## 🔔 NOTIFICACIONES (Notifications)

### Enviar notificación a cliente
```sql
INSERT INTO notifications (order_id, message, read, notification_date)
VALUES (
  (SELECT id FROM orders WHERE code = 'CP-2407010001'),
  'Tu orden está lista para retirar',
  false,
  CURRENT_TIMESTAMP
)
RETURNING id, message, notification_date;
```

### Ver notificaciones de una orden
```sql
SELECT 
  message,
  read,
  notification_date,
  CASE WHEN read THEN 'Leída' ELSE 'No leída' END as estado
FROM notifications
WHERE order_id = (SELECT id FROM orders WHERE code = 'CP-2407010001')
ORDER BY notification_date DESC;
```

### Contar notificaciones no leídas por cliente
```sql
SELECT 
  o.client_name,
  o.client_email,
  COUNT(n.id) as notificaciones_sin_leer
FROM notifications n
JOIN orders o ON n.order_id = o.id
WHERE n.read = false
GROUP BY o.client_name, o.client_email
HAVING COUNT(n.id) > 0
ORDER BY COUNT(n.id) DESC;
```

### Marcar notificación como leída
```sql
UPDATE notifications
SET read = true
WHERE order_id = (SELECT id FROM orders WHERE code = 'CP-2407010001')
AND read = false
RETURNING COUNT(*) as notificaciones_marcadas;
```

### Última notificación de cada orden
```sql
SELECT 
  o.code,
  o.client_name,
  n.message,
  n.read,
  n.notification_date
FROM v_latest_notifications vn
JOIN notifications n ON vn.order_id = n.order_id AND vn.notification_date = n.notification_date
JOIN orders o ON n.order_id = o.id
ORDER BY n.notification_date DESC;
```

---

## 📊 REPORTES Y ANÁLISIS

### Órdenes completadas en los últimos 30 días
```sql
SELECT 
  code,
  client_name,
  device_brand,
  device_model,
  get_order_budget_total(id) as presupuesto,
  created_at,
  updated_at
FROM orders
WHERE status = 'entregado'
AND created_at >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY updated_at DESC;
```

### Órdenes con presupuesto aprobado (sin iniciar reparación)
```sql
SELECT 
  o.code,
  o.client_name,
  o.device_brand,
  get_order_budget_total(o.id) as presupuesto,
  o.status,
  EXTRACT(DAY FROM CURRENT_TIMESTAMP - o.created_at) as dias_espera
FROM orders o
LEFT JOIN budget_items bi ON o.id = bi.order_id
WHERE o.status = 'esperando_repuestos'
AND get_order_budget_total(o.id) > 0
ORDER BY o.created_at ASC;
```

### Estadísticas generales
```sql
SELECT * FROM get_order_statistics();
```

### Productividad del equipo
```sql
SELECT 
  assigned_to,
  COUNT(*) as total_ordenes,
  COUNT(CASE WHEN status = 'entregado' THEN 1 END) as entregadas,
  ROUND(100.0 * COUNT(CASE WHEN status = 'entregado' THEN 1 END) / COUNT(*), 1) as tasa_completacion,
  ROUND(AVG(get_order_budget_total(id))::numeric, 0) as presupuesto_promedio
FROM orders
WHERE assigned_to IS NOT NULL
GROUP BY assigned_to
ORDER BY COUNT(CASE WHEN status = 'entregado' THEN 1 END) DESC;
```

### Órdenes sin asignar
```sql
SELECT 
  code,
  client_name,
  device_brand,
  status,
  EXTRACT(DAY FROM CURRENT_TIMESTAMP - created_at) as dias_sin_asignar
FROM orders
WHERE assigned_to IS NULL OR assigned_to = ''
ORDER BY created_at ASC;
```

### Ingresos por tipo de equipo
```sql
SELECT 
  device_type,
  COUNT(*) as cantidad,
  COALESCE(SUM(get_order_budget_total(id)), 0) as ingresos_totales,
  ROUND(AVG(get_order_budget_total(id))::numeric, 0) as presupuesto_promedio
FROM orders
WHERE status = 'entregado'
GROUP BY device_type
ORDER BY ingresos_totales DESC;
```

---

## 🔐 ADMINISTRACIÓN Y MANTENIMIENTO

### Buscar cliente por email o teléfono
```sql
SELECT u.id, u.name, u.email, u.phone, u.role, u.company_id, c.name AS company_name
FROM users u
LEFT JOIN companies c ON c.id = u.company_id
WHERE email ILIKE '%juan%' OR phone ILIKE '%5555%'
LIMIT 10;
```

### Ver orden más antigua sin completar
```sql
SELECT 
  code,
  client_name,
  device_brand,
  status,
  EXTRACT(DAY FROM CURRENT_TIMESTAMP - created_at) as dias_pendiente
FROM orders
WHERE status != 'entregado'
ORDER BY created_at ASC
LIMIT 1;
```

### Duplicados potenciales (clientes con mismo email)
```sql
SELECT 
  email,
  COUNT(*) as cantidad,
  STRING_AGG(name, ', ') as nombres
FROM users
GROUP BY email
HAVING COUNT(*) > 1;
```

### Orden más reciente
```sql
SELECT code, client_name, device_brand, status, created_at
FROM orders
ORDER BY created_at DESC
LIMIT 1;
```

### Órdenes sin presupuesto definido
```sql
SELECT 
  code,
  client_name,
  status,
  EXTRACT(DAY FROM CURRENT_TIMESTAMP - created_at) as dias
FROM orders
WHERE get_order_budget_total(id) = 0
ORDER BY created_at ASC;
```

---

## 💡 TIPS Y TRUCOS

### 1. Obtener ID de orden rápidamente por código:
```sql
SELECT id FROM orders WHERE code = 'CP-2407010001';
```

### 2. Verificar integridad referencial:
```sql
SELECT o.code, o.client_id, u.name
FROM orders o
LEFT JOIN users u ON o.client_id = u.id
WHERE o.client_id IS NOT NULL AND u.id IS NULL;
```

### 3. Crear vista personalizada para dashboard:
```sql
CREATE OR REPLACE VIEW v_dashboard_summary AS
SELECT 
  (SELECT COUNT(*) FROM orders WHERE status != 'entregado') as ordenes_activas,
  (SELECT COUNT(*) FROM users WHERE active = true AND role = 'empleado') as empleados_activos,
  (SELECT get_order_statistics()).total_orders as total_ordenes,
  (SELECT get_order_statistics()).average_budget as presupuesto_promedio;
```

### 4. Exportar datos a CSV:
```sql
COPY (
  SELECT code, client_name, device_brand, status, created_at
  FROM orders
  WHERE status = 'entregado'
) TO STDOUT WITH CSV HEADER;
```

---

## ⚠️ OPERACIONES PELIGROSAS (Usar con cuidado)

### Eliminar orden completa (y todos sus datos asociados)
```sql
DELETE FROM orders
WHERE code = 'CP-240701-0001'
RETURNING code, client_name;
-- Automáticamente elimina: budget_items, timeline_events, notifications
```

### Limpiar todas las notificaciones no leídas antiguas
```sql
DELETE FROM notifications
WHERE read = false
AND notification_date < CURRENT_DATE - INTERVAL '90 days'
RETURNING COUNT(*) as eliminadas;
```

### Reset de datos de prueba (¡CUIDADO!)
```sql
DELETE FROM orders;
DELETE FROM users WHERE role = 'cliente';
-- Los contador de códigos puede quedarse desfasado
```

---

## 📚 Recursos Adicionales

- Documentación completa: Ver `SCHEMA_DOCUMENTATION.md`
- Schema SQL: Ver `schema.sql`
- Más información sobre PostgreSQL: https://www.postgresql.org/docs/
- Documentación Supabase: https://supabase.com/docs
