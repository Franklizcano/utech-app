# 📋 SQL Snippets - Copy & Paste Ready

## Queries Listas para Copiar y Pegar

---

## ⚡ QUERIES ESENCIALES

### 1. Ver todas las órdenes activas
```sql
SELECT 
  code, client_name, device_brand, device_model, status, assigned_to, created_at
FROM orders
WHERE status != 'entregado'
ORDER BY created_at DESC;
```

### 2. Buscar orden por código
```sql
SELECT * FROM orders WHERE code = 'TF-1024';
```

### 3. Ver órdenes de un cliente
```sql
SELECT * FROM orders 
WHERE client_email = 'juan.perez@mail.com'
ORDER BY created_at DESC;
```

### 4. Contar órdenes por estado
```sql
SELECT 
  os.label as estado,
  COUNT(o.id) as cantidad
FROM orders o
LEFT JOIN order_states os ON o.status = os.id
GROUP BY os.id, os.label
ORDER BY COUNT(o.id) DESC;
```

### 5. Ver presupuesto total de orden
```sql
SELECT 
  code,
  client_name,
  get_order_budget_total(id) as presupuesto_total
FROM orders 
WHERE code = 'TF-1024';
```

### 6. Ver items de presupuesto
```sql
SELECT 
  description,
  amount
FROM budget_items
WHERE order_id = (SELECT id FROM orders WHERE code = 'TF-1024')
ORDER BY created_at;
```

### 7. Ver línea de tiempo completa
```sql
SELECT 
  os.label as estado,
  te.note,
  te.event_date
FROM timeline_events te
LEFT JOIN order_states os ON te.status = os.id
WHERE te.order_id = (SELECT id FROM orders WHERE code = 'TF-1024')
ORDER BY te.event_date ASC;
```

### 8. Ver notificaciones de orden
```sql
SELECT 
  message,
  read,
  notification_date
FROM notifications
WHERE order_id = (SELECT id FROM orders WHERE code = 'TF-1024')
ORDER BY notification_date DESC;
```

---

## ✏️ OPERACIONES CRUD

### Crear nueva orden
```sql
INSERT INTO orders (
  code, client_id, client_name, client_phone, client_email,
  device_type, device_brand, device_model, fault,
  status, assigned_to
) VALUES (
  'TF-1030',
  (SELECT id FROM users WHERE email = 'cliente@mail.com'),
  'Nombre Cliente',
  '+54 11 1111-2222',
  'cliente@mail.com',
  'Notebook',
  'HP',
  'Pavilion 15',
  'No carga la batería',
  'recibido',
  'Martín Gómez'
)
RETURNING code, client_name;
```

### Crear orden con cliente ocasional (sin registrar)
```sql
INSERT INTO orders (
  code, client_id, client_name, client_phone, client_email,
  device_type, device_brand, device_model, fault,
  status, assigned_to
) VALUES (
  'TF-1031',
  NULL,
  'Cliente Ocasional',
  '+54 9 11 3333-4444',
  'ocasional@mail.com',
  'PC',
  'Armada',
  'Gaming Ryzen 7',
  'Se congela en juegos',
  'recibido',
  'Sofía Ruiz'
)
RETURNING code;
```

### Cambiar estado de orden
```sql
UPDATE orders
SET status = 'en_reparacion'
WHERE code = 'TF-1024'
RETURNING code, status;
```

### Asignar orden a diferente empleado
```sql
UPDATE orders
SET assigned_to = 'Sofía Ruiz'
WHERE code = 'TF-1024'
RETURNING code, assigned_to;
```

### Agregar item de presupuesto
```sql
INSERT INTO budget_items (
  order_id,
  description,
  amount
) VALUES (
  (SELECT id FROM orders WHERE code = 'TF-1024'),
  'Cambio de batería',
  15000
)
RETURNING description, amount;
```

### Agregar evento a línea de tiempo
```sql
INSERT INTO timeline_events (
  order_id,
  status,
  note,
  event_date
) VALUES (
  (SELECT id FROM orders WHERE code = 'TF-1024'),
  'en_reparacion',
  'Se inicia reparación del puerto HDMI',
  CURRENT_TIMESTAMP
)
RETURNING status, note;
```

### Enviar notificación a cliente
```sql
INSERT INTO notifications (
  order_id,
  message,
  read,
  notification_date
) VALUES (
  (SELECT id FROM orders WHERE code = 'TF-1024'),
  'Tu orden está lista para retirar',
  false,
  CURRENT_TIMESTAMP
)
RETURNING message, notification_date;
```

### Crear nuevo usuario
```sql
INSERT INTO users (
  name,
  email,
  phone,
  role,
  active
) VALUES (
  'Nuevo Empleado',
  'nuevo@tecnofix.com',
  '+54 11 1234-5678',
  'empleado',
  true
)
RETURNING id, name, email;
```

### Crear usuario corporativo
```sql
INSERT INTO users (
  name,
  email,
  phone,
  role,
  active,
  is_corporate,
  company_name,
  company_logo
) VALUES (
  'Contacto Empresa',
  'contacto@empresa.com',
  '+54 11 8765-4321',
  'cliente',
  true,
  true,
  'Empresa XYZ S.A.',
  'https://example.com/logo.png'
)
RETURNING id, company_name;
```

### Marcar notificación como leída
```sql
UPDATE notifications
SET read = true
WHERE order_id = (SELECT id FROM orders WHERE code = 'TF-1024')
AND read = false;
```

### Desactivar usuario
```sql
UPDATE users
SET active = false, updated_at = CURRENT_TIMESTAMP
WHERE email = 'usuario@tecnofix.com'
RETURNING name, active;
```

---

## 📊 REPORTES Y ANÁLISIS

### Estadísticas generales del sistema
```sql
SELECT * FROM get_order_statistics();
```

### Ingresos por mes
```sql
SELECT 
  DATE_TRUNC('month', created_at) as mes,
  COUNT(*) as ordenes,
  COALESCE(SUM(get_order_budget_total(id)), 0) as ingresos
FROM orders
WHERE status = 'entregado'
GROUP BY DATE_TRUNC('month', created_at)
ORDER BY mes DESC;
```

### Productividad del equipo
```sql
SELECT 
  assigned_to,
  COUNT(*) as total_ordenes,
  COUNT(CASE WHEN status = 'entregado' THEN 1 END) as completadas,
  ROUND(100.0 * COUNT(CASE WHEN status = 'entregado' THEN 1 END) / COUNT(*), 1) as tasa_completacion,
  ROUND(AVG(get_order_budget_total(id))::numeric, 0) as presupuesto_promedio
FROM orders
WHERE assigned_to IS NOT NULL
GROUP BY assigned_to
ORDER BY COUNT(CASE WHEN status = 'entregado' THEN 1 END) DESC;
```

### Órdenes completadas en últimos 30 días
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

### Órdenes con presupuesto aprobado pero sin iniciar
```sql
SELECT 
  code,
  client_name,
  device_brand,
  get_order_budget_total(id) as presupuesto,
  EXTRACT(DAY FROM CURRENT_TIMESTAMP - created_at) as dias_espera
FROM orders
WHERE status IN ('esperando_repuestos', 'recibido', 'en_diagnostico')
AND get_order_budget_total(id) > 0
ORDER BY created_at ASC;
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

### Clientes con más órdenes
```sql
SELECT 
  client_name,
  client_email,
  COUNT(*) as total_ordenes,
  COUNT(CASE WHEN status = 'entregado' THEN 1 END) as completadas,
  COALESCE(SUM(get_order_budget_total(id)), 0) as total_invertido
FROM orders
WHERE client_id IS NOT NULL
GROUP BY client_name, client_email
ORDER BY COUNT(*) DESC
LIMIT 10;
```

### Tiempo promedio de reparación por tipo
```sql
SELECT 
  device_type,
  COUNT(*) as ordenes,
  ROUND(AVG(EXTRACT(DAY FROM updated_at - created_at))::numeric, 1) as dias_promedio
FROM orders
WHERE status = 'entregado'
GROUP BY device_type
ORDER BY dias_promedio DESC;
```

---

## 🔍 BÚSQUEDAS Y FILTROS

### Buscar cliente por email o teléfono
```sql
SELECT id, name, email, phone, role, is_corporate, company_name
FROM users
WHERE email ILIKE '%juan%' OR phone ILIKE '%5555%'
LIMIT 10;
```

### Buscar orden por cliente
```sql
SELECT code, device_brand, status, created_at
FROM orders
WHERE client_name ILIKE '%juan%' OR client_email = 'juan.perez@mail.com'
ORDER BY created_at DESC;
```

### Órdenes de un tipo de equipo específico
```sql
SELECT 
  code,
  client_name,
  device_brand,
  device_model,
  status
FROM orders
WHERE device_type = 'Notebook'
ORDER BY created_at DESC;
```

### Órdenes asignadas a un empleado
```sql
SELECT 
  code,
  client_name,
  device_brand,
  status,
  get_order_budget_total(id) as presupuesto
FROM orders
WHERE assigned_to = 'Martín Gómez'
ORDER BY status, created_at DESC;
```

### Órdenes en estado específico con detalles
```sql
SELECT 
  code,
  client_name,
  device_brand,
  assigned_to,
  get_order_budget_total(id) as presupuesto,
  EXTRACT(DAY FROM CURRENT_TIMESTAMP - created_at) as dias_activa
FROM orders
WHERE status = 'esperando_repuestos'
ORDER BY created_at ASC;
```

### Presupuestos pendientes de aprobación
```sql
SELECT 
  code,
  client_name,
  COUNT(bi.id) as items_presupuesto,
  get_order_budget_total(o.id) as total,
  EXTRACT(DAY FROM CURRENT_TIMESTAMP - o.created_at) as dias_sin_respuesta
FROM orders o
LEFT JOIN budget_items bi ON o.id = bi.order_id
WHERE o.status IN ('recibido', 'en_diagnostico')
AND get_order_budget_total(o.id) > 0
GROUP BY o.id, code, client_name
ORDER BY days_sin_respuesta DESC;
```

---

## 🗑️ OPERACIONES PELIGROSAS (Usar con cuidado)

### Eliminar orden completa (y todos sus datos)
```sql
DELETE FROM orders
WHERE code = 'TF-1024'
RETURNING code, client_name;
```

### Limpiar notificaciones antiguas no leídas
```sql
DELETE FROM notifications
WHERE read = false
AND notification_date < CURRENT_DATE - INTERVAL '90 days'
RETURNING COUNT(*) as eliminadas;
```

### Eliminar usuario inactivo
```sql
DELETE FROM users
WHERE id = 'uuid-aqui'
AND active = false
RETURNING name, email;
```

### Reset de una orden (reiniciar desde recibido)
```sql
UPDATE orders
SET status = 'recibido'
WHERE code = 'TF-1024'
RETURNING code, status;
```

---

## 🔧 MANTENIMIENTO

### Verificar integridad referencial
```sql
-- Órdenes sin cliente válido (excepto ocasionales)
SELECT o.code, o.client_id, u.name
FROM orders o
LEFT JOIN users u ON o.client_id = u.id
WHERE o.client_id IS NOT NULL AND u.id IS NULL;
```

### Duplicados potenciales
```sql
SELECT email, COUNT(*) as cantidad
FROM users
GROUP BY email
HAVING COUNT(*) > 1;
```

### Estadísticas de uso
```sql
SELECT 
  'Total Usuarios' as metrica, COUNT(*) as valor FROM users
UNION ALL
SELECT 'Empleados Activos', COUNT(*) FROM users WHERE role = 'empleado' AND active = true
UNION ALL
SELECT 'Órdenes Activas', COUNT(*) FROM orders WHERE status != 'entregado'
UNION ALL
SELECT 'Órdenes Completadas', COUNT(*) FROM orders WHERE status = 'entregado';
```

### Actualizar estadísticas (PostgreSQL)
```sql
ANALYZE users;
ANALYZE orders;
ANALYZE budget_items;
ANALYZE timeline_events;
ANALYZE notifications;
```

---

## 📋 COMPARATIVAS Y ANÁLISIS

### Órdenes vs presupuesto vs tiempo
```sql
SELECT 
  code,
  client_name,
  device_brand,
  status,
  get_order_budget_total(id) as presupuesto,
  EXTRACT(DAY FROM updated_at - created_at)::int as dias_duracion,
  (SELECT COUNT(*) FROM timeline_events WHERE order_id = o.id) as eventos_registrados,
  (SELECT COUNT(*) FROM notifications WHERE order_id = o.id) as notificaciones_enviadas
FROM orders o
WHERE status = 'entregado'
ORDER BY updated_at DESC
LIMIT 20;
```

### Comparación presupuesto vs tipo de equipo
```sql
SELECT 
  device_type,
  COUNT(*) as ordenes,
  ROUND(MIN(get_order_budget_total(id))::numeric, 0) as minimo,
  ROUND(AVG(get_order_budget_total(id))::numeric, 0) as promedio,
  ROUND(MAX(get_order_budget_total(id))::numeric, 0) as maximo
FROM orders
WHERE status = 'entregado'
GROUP BY device_type
ORDER BY promedio DESC;
```

### Análisis de carga de trabajo
```sql
SELECT 
  assigned_to,
  COUNT(*) as ordenes_activas,
  ROUND(AVG(EXTRACT(DAY FROM CURRENT_TIMESTAMP - created_at))::numeric, 1) as dias_promedio_espera,
  MIN(created_at) as orden_mas_antigua
FROM orders
WHERE status != 'entregado'
GROUP BY assigned_to
ORDER BY ordenes_activas DESC;
```

---

## 💡 TIPS Y TRUCOS

### Obtener ID de orden por código
```sql
SELECT id FROM orders WHERE code = 'TF-1024';
```

### Total rápido de ingresos
```sql
SELECT 'Ingresos Totales', COALESCE(SUM(get_order_budget_total(id)), 0)
FROM orders
WHERE status = 'entregado';
```

### Últimas actividades
```sql
SELECT 
  'Orden actualizada' as tipo,
  code as referencia,
  updated_at as fecha
FROM orders
ORDER BY updated_at DESC
LIMIT 10;
```

### Próximas órdenes a vencer (sin completar)
```sql
SELECT 
  code,
  client_name,
  status,
  CURRENT_DATE - DATE(created_at) as dias_pendiente
FROM orders
WHERE status != 'entregado'
ORDER BY created_at ASC
LIMIT 5;
```

---

## ⚡ QUERYS DE UNA LÍNEA

```sql
-- Contar órdenes activas
SELECT COUNT(*) FROM orders WHERE status != 'entregado';

-- Empleados activos
SELECT COUNT(*) FROM users WHERE role = 'empleado' AND active = true;

-- Total ingresos
SELECT SUM(get_order_budget_total(id)) FROM orders WHERE status = 'entregado';

-- Orden más reciente
SELECT code, client_name FROM orders ORDER BY created_at DESC LIMIT 1;

-- Cliente con más órdenes
SELECT client_name, COUNT(*) FROM orders GROUP BY client_name ORDER BY COUNT(*) DESC LIMIT 1;

-- Estado con más órdenes
SELECT status, COUNT(*) FROM orders GROUP BY status ORDER BY COUNT(*) DESC LIMIT 1;

-- Presupuesto más alto
SELECT code, client_name, get_order_budget_total(id) FROM orders ORDER BY get_order_budget_total(id) DESC LIMIT 1;

-- Tiempo promedio de reparación
SELECT ROUND(AVG(EXTRACT(DAY FROM updated_at - created_at))::numeric, 1) FROM orders WHERE status = 'entregado';
```

---

**Última actualización:** 2024-07-06  
**Versión:** 1.0  
**Uso:** Copy & Paste directamente en Supabase SQL Editor
