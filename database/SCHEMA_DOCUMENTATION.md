# Documentación del Schema de Base de Datos

## Sistema de Gestión de Reparaciones - Base de Datos PostgreSQL (Supabase)

---

## 📋 Resumen Ejecutivo

Este schema define la estructura de datos completa para un sistema de gestión de órdenes de reparación de equipos electrónicos. Incluye gestión de usuarios, órdenes, presupuestos, línea de tiempo y notificaciones.

---

## 🏗️ Tablas Principales

### 1. **roles** - Tipos de roles del sistema

Define los roles disponibles en la aplicación.

```sql
-- Campos
id (TEXT, PK)           -- Identificador único del rol (admin, empleado, cliente)
name (VARCHAR)          -- Nombre del rol
description (TEXT)      -- Descripción del rol
created_at (TIMESTAMP)  -- Fecha de creación
```

**Valores por defecto:**
- `admin` - Administrador (acceso completo)
- `empleado` - Empleado (gestión de órdenes)
- `cliente` - Cliente (seguimiento de órdenes personales)

---

### 2. **users** - Usuarios del sistema

Almacena información de todos los usuarios (administradores, empleados y clientes).

```sql
-- Campos principales
id (UUID, PK)              -- Identificador único
name (VARCHAR)             -- Nombre completo
email (VARCHAR, UNIQUE)    -- Email único del usuario
phone (VARCHAR)            -- Teléfono de contacto
role (FK → roles.id)       -- Rol del usuario
active (BOOLEAN)           -- Estado del usuario

-- Relación opcional con una empresa
company_id (UUID, FK → companies.id) -- Empresa; NULL para usuarios independientes

created_at (TIMESTAMP)     -- Fecha de creación
updated_at (TIMESTAMP)     -- Fecha de última actualización
```

**Índices:**
- `email` - Búsqueda rápida por email
- `role` - Filtrado por rol
- `active` - Filtrado por estado activo
- `company_id` - Usuarios pertenecientes a una empresa

### 3. **companies** - Empresas

Contiene los datos compartidos por los usuarios corporativos. Un usuario pertenece a una empresa cuando `users.company_id` tiene valor; si es `NULL`, es independiente.

```text
id (UUID, PK)              -- Identificador único
name (VARCHAR, UNIQUE)     -- Nombre de la empresa
logo (TEXT)                -- URL o data URI del logo
user_limit (INTEGER)       -- Cupo máximo de usuarios
created_at (TIMESTAMP)     -- Fecha de creación
updated_at (TIMESTAMP)     -- Fecha de última actualización
```

---

### 4. **order_states** - Estados del flujo de reparación

Define los diferentes estados por los que puede pasar una orden.

```sql
-- Campos
id (TEXT, PK)        -- Identificador único del estado
label (VARCHAR)      -- Nombre del estado
color (VARCHAR)      -- Color hex para UI (#RRGGBB)
position (INTEGER)   -- Posición en el flujo (0, 1, 2, ...)

created_at (TIMESTAMP)  -- Fecha de creación
updated_at (TIMESTAMP)  -- Fecha de actualización
```

**Estados por defecto:**
| ID | Label | Color | Posición |
|---|---|---|---|
| `recibido` | Recibido | #8b5cf6 | 0 |
| `en_diagnostico` | En diagnóstico | #06b6d4 | 1 |
| `esperando_repuestos` | Esperando repuestos | #f59e0b | 2 |
| `en_reparacion` | En reparación | #3b82f6 | 3 |
| `listo` | Listo para retirar | #10b981 | 4 |
| `entregado` | Entregado | #6366f1 | 5 |

---

### 4. **orders** - Órdenes de reparación (Tabla Principal)

La tabla central del sistema que almacena todas las órdenes de reparación.

```sql
-- Identificación
id (UUID, PK)              -- Identificador único
code (VARCHAR(32), UNIQUE)  -- Código de orden (formato: PREFIJO-YYMMDDCONTADOR, ej: CP-2407010001)

-- Información del cliente
client_id (FK → users.id)  -- Referencia a usuario cliente (NULL para ocasionales)
client_name (VARCHAR)      -- Nombre del cliente
client_phone (VARCHAR)     -- Teléfono del cliente
client_email (VARCHAR)     -- Email del cliente

-- Información del equipo
device_type (VARCHAR)      -- Tipo (PC, Notebook, PlayStation, Xbox, Nintendo, Otro)
device_brand (VARCHAR)     -- Marca (Sony, Lenovo, etc.)
device_model (VARCHAR)     -- Modelo específico
fault (TEXT)               -- Descripción del problema/daño

-- Gestión de la orden
status (FK → order_states.id)  -- Estado actual de la orden
assigned_to (VARCHAR)          -- Nombre del empleado asignado

created_at (TIMESTAMP)     -- Fecha de creación
updated_at (TIMESTAMP)     -- Fecha de actualización
```

**Índices principales:**
- `code` - Búsqueda por código de orden
- `client_id` - Órdenes de un cliente
- `status` - Filtrado por estado
- `assigned_to` - Órdenes asignadas a un empleado
- `created_at` DESC - Ordenamiento por fecha

**Ejemplo:**
```
Código: CP-2407010001
Cliente: Juan Pérez (juan.perez@mail.com)
Equipo: Sony PS5 Slim
Problema: No da imagen por HDMI
Estado: Esperando repuestos
Asignado a: Martín Gómez
```

---

### 5. **budget_items** - Items de presupuesto

Almacena los items de costo asociados a cada orden.

```sql
-- Campos
id (UUID, PK)              -- Identificador único del item
order_id (FK → orders.id)  -- Referencia a la orden
description (VARCHAR)      -- Descripción del item (ej: "Cambio de pantalla")
amount (DECIMAL)           -- Monto en pesos argentinos

created_at (TIMESTAMP)     -- Fecha de creación
```

**Índice:**
- `order_id` - Items de una orden específica

**Ejemplo para orden CP-240701-0001:**
| Descripción | Monto |
|---|---|
| Cambio de módulo HDMI PS5 | $28.000 |
| Mano de obra (microsoldadura) | $22.000 |
| Limpieza y pasta térmica | $6.000 |
| **TOTAL** | **$56.000** |

---

### 6. **timeline_events** - Eventos de línea de tiempo

Registro cronológico de cambios de estado de cada orden.

```sql
-- Campos
id (UUID, PK)              -- Identificador único del evento
order_id (FK → orders.id)  -- Referencia a la orden
status (FK → order_states.id)  -- Estado al que cambió
note (TEXT)                -- Nota adicional del cambio

event_date (TIMESTAMP)     -- Fecha del evento
created_at (TIMESTAMP)     -- Fecha de registro
```

**Índices:**
- `order_id` - Timeline de una orden
- `status` - Eventos por tipo de estado

**Ejemplo:**
```
Orden CP-240701-0001:
  2024-07-01 10:30 → Recibido: "Equipo ingresado en mostrador"
  2024-07-02 14:15 → En diagnóstico: "Se confirma puerto HDMI dañado"
  2024-07-04 09:00 → Esperando repuestos: "Se encarga módulo HDMI original"
```

---

### 7. **notifications** - Notificaciones

Almacena notificaciones enviadas a clientes sobre sus órdenes.

```sql
-- Campos
id (UUID, PK)              -- Identificador único
order_id (FK → orders.id)  -- Referencia a la orden
message (TEXT)             -- Contenido de la notificación
read (BOOLEAN)             -- ¿Fue leída?

notification_date (TIMESTAMP)  -- Fecha de envío
created_at (TIMESTAMP)         -- Fecha de creación en BD
```

**Índices:**
- `order_id` - Notificaciones de una orden
- `read` - Notificaciones leídas/no leídas

**Ejemplo:**
```
Orden CP-240701-0001:
  [LEÍDA] "Tu PS5 fue recibida. Te avisaremos con el diagnóstico."
  [LEÍDA] "Presupuesto cargado. Total: $56.000"
  [NO LEÍDA] "Estamos esperando el repuesto (módulo HDMI)"
```

---

## 📊 Vistas SQL (Views)

### v_orders_summary
Vista que combina información de órdenes, usuarios y presupuestos.

```sql
SELECT
  o.id,
  o.code,
  o.client_name,
  o.client_email,
  c.name AS company_name,
  c.logo AS company_logo,
  o.device_type,
  o.device_brand,
  os.label as status_label,
  COALESCE(SUM(bi.amount), 0) as budget_total
FROM orders o
LEFT JOIN users u ON o.client_id = u.id
LEFT JOIN companies c ON u.company_id = c.id
LEFT JOIN order_states os ON o.status = os.id
LEFT JOIN budget_items bi ON o.id = bi.order_id
GROUP BY o.id, u.id, c.id, os.id;
```

**Uso:** Reportes rápidos de órdenes con información consolidada.

---

### v_latest_notifications
Última notificación de cada orden.

```sql
SELECT DISTINCT ON (order_id)
  order_id,
  message,
  read,
  notification_date
FROM notifications
ORDER BY order_id, notification_date DESC;
```

---

## ⚙️ Funciones SQL

### get_order_budget_total(order_uuid)
Calcula el total de presupuesto de una orden.

```sql
SELECT get_order_budget_total('550e8400-e29b-41d4-a716-446655440000');
-- Retorna: 56000
```

---

### get_order_statistics()
Retorna estadísticas globales del sistema.

```sql
SELECT * FROM get_order_statistics();
```

**Retorna:**
```
total_orders      | 3
completed_orders  | 1
pending_orders    | 2
average_budget    | 33000
```

---

## 🔒 Row Level Security (RLS)

Las siguientes tablas tienen RLS habilitado:
- `users` - Solo admins ven todos los usuarios
- `orders` - Los clientes ven solo sus órdenes
- `budget_items` - Heredado de órdenes
- `timeline_events` - Heredado de órdenes
- `notifications` - Heredado de órdenes

**Nota:** Las políticas actuales son básicas. Ajustar según tu sistema de autenticación.

---

## 📈 Datos de Ejemplo

El schema incluye datos iniciales:

### Usuarios (7 total)
```
1. Lucía Fernández (admin)
2. Martín Gómez (empleado)
3. Sofía Ruiz (empleado)
4. Diego Páez (empleado, inactivo)
5. Juan Pérez (cliente)
6. María López (cliente)
7. Carlos Díaz (cliente)
```

### Órdenes (3 total)
```
1. CP-240701-0001 (Juan Pérez) - PlayStation PS5 Slim - Estado: Esperando repuestos
2. CP-240703-0002 (María López) - Notebook Lenovo - Estado: Listo
3. CP-240706-0003 (Carlos Díaz) - PC Armada - Estado: En diagnóstico
```

---

## 🚀 Cómo Usar

### 1. **Ejecutar el schema:**
```sql
-- En Supabase SQL Editor, copiar y ejecutar database/schema.sql
```

### 2. **Consultar órdenes activas:**
```sql
SELECT code, client_name, device_brand, status_label, budget_total
FROM v_orders_summary
WHERE status != 'entregado'
ORDER BY created_at DESC;
```

### 3. **Obtener órdenes de un cliente:**
```sql
SELECT * FROM orders
WHERE client_email = 'juan.perez@mail.com'
ORDER BY created_at DESC;
```

### 4. **Ver línea de tiempo de una orden:**
```sql
SELECT status, note, event_date
FROM timeline_events
WHERE order_id = (SELECT id FROM orders WHERE code = 'CP-240701-0001')
ORDER BY event_date ASC;
```

### 5. **Calcular total de presupuesto:**
```sql
SELECT get_order_budget_total('550e8400-e29b-41d4-a716-446655440000');
```

---

## 🔄 Flujo de Datos

```
Cliente (usuario) 
    ↓
    └→ Crea orden
        ↓
        └→ Order (con estado inicial "recibido")
            ├→ Budget Items (items de costo)
            ├→ Timeline Events (historial de cambios)
            └→ Notifications (notificaciones al cliente)
```

---

## 📝 Notas Importantes

1. **Clientes ocasionales:** Las órdenes pueden tener `client_id = NULL` para clientes no registrados.

2. **Moneda:** Todos los montos están en pesos argentinos (ARS).

3. **Zona horaria:** Todas las timestamps usan `TIMESTAMP WITH TIME ZONE`.

4. **Códigos únicos:** Los códigos de orden son únicos y se generan automáticamente (PREFIJO-YYMMDD-CONTADOR global).

5. **Eliminación en cascada:** Si se elimina una orden, se eliminan automáticamente sus items de presupuesto, eventos y notificaciones.

6. **Auditoría:** Todas las tablas tienen `created_at` y `updated_at` para tracking.

---

## 🔧 Mantenimiento

### Crear índices personalizados:
```sql
CREATE INDEX idx_orders_client_email ON orders(client_email);
CREATE INDEX idx_notifications_unread ON notifications(order_id, read) 
WHERE read = false;
```

### Actualizar estadísticas (PostgreSQL):
```sql
ANALYZE orders;
ANALYZE budget_items;
ANALYZE timeline_events;
```

---

## 📞 Soporte

Para consultas, verificar:
1. Estados válidos en `order_states`
2. Roles válidos en `roles`
3. Clientes registrados en `users` con `role = 'cliente'`
