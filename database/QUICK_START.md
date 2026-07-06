# 🚀 Quick Start - Schema de Base de Datos

## Pasos Rápidos para Implementar

### 1️⃣ CREAR EL SCHEMA

Abre Supabase SQL Editor y ejecuta:

```bash
# Copiar contenido de: database/schema.sql
# Pegar en Supabase SQL Editor
# Click en "Run"
```

**Tiempo estimado:** 2-3 minutos

---

### 2️⃣ VERIFICAR QUE FUNCIONÓ

```sql
-- Verificar que existen las tablas
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Debería mostrar:
-- budget_items
-- notifications
-- order_states
-- orders
-- roles
-- timeline_events
-- users
```

---

### 3️⃣ QUERIES MÁS USADAS

#### Ver todas las órdenes activas
```sql
SELECT 
  code, 
  client_name, 
  device_brand, 
  status, 
  assigned_to,
  created_at
FROM orders
WHERE status != 'entregado'
ORDER BY created_at DESC;
```

#### Crear nueva orden
```sql
INSERT INTO orders (
  code, client_id, client_name, client_phone, client_email,
  device_type, device_brand, device_model, fault,
  status, assigned_to
) VALUES (
  'TF-1030',
  NULL,  -- o UUID si es cliente registrado
  'Cliente Nuevo',
  '+54 11 1111-2222',
  'cliente@mail.com',
  'Notebook',
  'HP',
  'Pavilion 15',
  'No carga',
  'recibido',
  'Empleado Nombre'
);
```

#### Buscar orden por código
```sql
SELECT * FROM orders WHERE code = 'TF-1024';
```

#### Ver órdenes de un cliente
```sql
SELECT * FROM orders 
WHERE client_email = 'juan.perez@mail.com'
ORDER BY created_at DESC;
```

#### Cambiar estado de orden
```sql
UPDATE orders
SET status = 'en_reparacion'
WHERE code = 'TF-1024';
```

#### Ver presupuesto de orden
```sql
SELECT description, amount
FROM budget_items
WHERE order_id = (SELECT id FROM orders WHERE code = 'TF-1024');
```

#### Total presupuesto de orden
```sql
SELECT get_order_budget_total(id) 
FROM orders 
WHERE code = 'TF-1024';
```

#### Agregar item de presupuesto
```sql
INSERT INTO budget_items (order_id, description, amount)
VALUES (
  (SELECT id FROM orders WHERE code = 'TF-1024'),
  'Cambio de batería',
  15000
);
```

#### Ver línea de tiempo
```sql
SELECT 
  os.label as estado,
  te.note,
  te.event_date
FROM timeline_events te
LEFT JOIN order_states os ON te.status = os.id
WHERE te.order_id = (SELECT id FROM orders WHERE code = 'TF-1024')
ORDER BY event_date ASC;
```

#### Agregar evento a línea de tiempo
```sql
INSERT INTO timeline_events (order_id, status, note, event_date)
VALUES (
  (SELECT id FROM orders WHERE code = 'TF-1024'),
  'en_reparacion',
  'Se inicia reparación',
  CURRENT_TIMESTAMP
);
```

#### Ver notificaciones de orden
```sql
SELECT message, read, notification_date
FROM notifications
WHERE order_id = (SELECT id FROM orders WHERE code = 'TF-1024')
ORDER BY notification_date DESC;
```

#### Agregar notificación
```sql
INSERT INTO notifications (order_id, message, read, notification_date)
VALUES (
  (SELECT id FROM orders WHERE code = 'TF-1024'),
  'Tu orden está lista',
  false,
  CURRENT_TIMESTAMP
);
```

#### Listar empleados
```sql
SELECT id, name, email, phone, active
FROM users
WHERE role = 'empleado'
ORDER BY name;
```

#### Crear usuario
```sql
INSERT INTO users (name, email, phone, role, active)
VALUES ('Nuevo Usuario', 'nuevo@mail.com', '+54 11 1234-5678', 'empleado', true);
```

---

## 📊 REPORTES ÚTILES

#### Estadísticas generales
```sql
SELECT * FROM get_order_statistics();
```

#### Órdenes por estado
```sql
SELECT 
  os.label,
  COUNT(o.id) as cantidad
FROM orders o
LEFT JOIN order_states os ON o.status = os.id
GROUP BY os.id, os.label
ORDER BY COUNT(o.id) DESC;
```

#### Productividad del equipo
```sql
SELECT 
  assigned_to,
  COUNT(*) as total,
  COUNT(CASE WHEN status = 'entregado' THEN 1 END) as completadas
FROM orders
GROUP BY assigned_to
ORDER BY total DESC;
```

#### Ingresos estimados
```sql
SELECT 
  COALESCE(SUM(get_order_budget_total(id)), 0) as ingresos
FROM orders
WHERE status = 'entregado';
```

---

## 🎯 ESTRUCTURA DE DATOS RÁPIDA

```
📦 ORDEN
  ├─ code: TF-1024
  ├─ client: Juan Pérez (juan.perez@mail.com)
  ├─ device: Sony PS5 Slim
  ├─ fault: No da imagen por HDMI
  ├─ status: esperando_repuestos
  ├─ assigned_to: Martín Gómez
  │
  ├─ 💰 PRESUPUESTO
  │  ├─ Cambio módulo HDMI: $28.000
  │  ├─ Mano de obra: $22.000
  │  └─ Limpieza: $6.000
  │  └─ TOTAL: $56.000
  │
  ├─ 📅 LÍNEA DE TIEMPO
  │  ├─ 2024-07-01: Recibido
  │  ├─ 2024-07-02: En diagnóstico
  │  └─ 2024-07-04: Esperando repuestos
  │
  └─ 🔔 NOTIFICACIONES
     ├─ [LEÍDA] Recibida tu PS5
     ├─ [LEÍDA] Presupuesto cargado
     └─ [NO LEÍDA] Esperando repuesto
```

---

## 🔗 RELACIONES PRINCIPALES

```
users (clientes)
  ↓
orders (órdenes de reparación)
  ├── budget_items (items de costo)
  ├── timeline_events (historial de cambios)
  └── notifications (notificaciones)

order_states (estados disponibles)
  ↓
orders (referencia)
  └── timeline_events (cada cambio de estado)
```

---

## ⚙️ FUNCIONES DISPONIBLES

### `get_order_budget_total(order_uuid)`
Retorna el total de presupuesto de una orden.

```sql
SELECT get_order_budget_total('550e8400-e29b-41d4-a716-446655440000');
-- Retorna: 56000
```

### `get_order_statistics()`
Retorna estadísticas globales del sistema.

```sql
SELECT * FROM get_order_statistics();
-- Retorna: total_orders, completed_orders, pending_orders, average_budget
```

---

## 📈 VISTAS (Views) DISPONIBLES

### `v_orders_summary`
Resumen consolidado de órdenes con cliente, dispositivo, estado y presupuesto total.

```sql
SELECT * FROM v_orders_summary 
WHERE status != 'entregado';
```

### `v_latest_notifications`
Última notificación de cada orden.

```sql
SELECT * FROM v_latest_notifications;
```

---

## 🆘 TROUBLESHOOTING

### "Error: relation does not exist"
→ Ejecutar el schema completo en `schema.sql`

### "Foreign key constraint violation"
→ Verificar que el usuario/orden/estado existe antes de referenciar

### "Duplicate key value violates unique constraint"
→ El email del usuario o código de orden ya existe

### "Permission denied"
→ Verificar que las políticas RLS permiten la operación

---

## 📞 PRÓXIMOS PASOS

1. ✅ Ejecutar `schema.sql`
2. ✅ Verificar tablas con los queries de verificación
3. ✅ Usar queries de ejemplo según sea necesario
4. 📖 Leer `SCHEMA_DOCUMENTATION.md` para más detalles
5. 🔍 Consultar `QUERIES_GUIDE.md` para queries avanzadas

---

## 📄 DOCUMENTACIÓN COMPLETA

- **schema.sql**: SQL completo para crear todas las tablas
- **SCHEMA_DOCUMENTATION.md**: Documentación detallada de cada tabla
- **QUERIES_GUIDE.md**: +100 queries útiles para operaciones comunes
- **QUICK_START.md**: Este archivo (referencia rápida)

---

**¡Listo para usar!** 🎉
