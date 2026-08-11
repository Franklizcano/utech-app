# 📊 Diagrama Entidad-Relación (ER)

## Sistema de Gestión de Reparaciones

---

## Diagrama ASCII ER

```
┌─────────────────┐
│     ROLES       │
├─────────────────┤
│ id (PK)         │
│ name            │
│ description     │
└────────┬────────┘
         │
         │ (1:N)
         │
         ▼
┌─────────────────────────────────────┐
│          USERS                      │
├─────────────────────────────────────┤
│ id (PK, UUID)                       │
│ name                                │
│ email (UNIQUE)                      │
│ phone                               │
│ role (FK→roles.id)                  │
│ active                              │
│ company_id (FK→companies.id, NULL)  │
│ created_at                          │
│ updated_at                          │
└────────┬────────────────────────────┘
         │
         │ (1:N) client_id (nullable)
         │
         ▼
┌─────────────────────────────────────┐
│         ORDERS                      │
├─────────────────────────────────────┤
│ id (PK, UUID)                       │
│ code (UNIQUE)                       │
│ client_id (FK→users.id, nullable)   │ ◄─── Cliente ocasional si NULL
│ client_name                         │
│ client_phone                        │
│ client_email                        │
│ device_type                         │
│ device_brand                        │
│ device_model                        │
│ fault (TEXT)                        │
│ status (FK→order_states.id)         │
│ assigned_to                         │
│ created_at                          │
│ updated_at                          │
└────┬──────────────────────┬──────────┘
     │                      │
     │ (1:N)                │ (1:N)
     │                      │
     ▼                      ▼
┌──────────────────┐  ┌──────────────────────┐
│  BUDGET_ITEMS    │  │   ORDER_STATES       │
├──────────────────┤  ├──────────────────────┤
│ id (PK)          │  │ id (PK)              │
│ order_id (FK)    │  │ label                │
│ description      │  │ color (hex)          │
│ amount           │  │ position             │
│ created_at       │  │ created_at           │
└──────────────────┘  │ updated_at           │
                      └──────────────────────┘
                              ▲
                              │ (1:N)
                              │
     ┌────────────────────────┤
     │                        │
     ▼                        │
┌──────────────────────┐      │
│  TIMELINE_EVENTS     │      │
├──────────────────────┤      │
│ id (PK)              │      │
│ order_id (FK)        │      │
│ status (FK)──────────┘
│ note (TEXT)          │
│ event_date           │
│ created_at           │
└──────────────────────┘

     │
     │ (1:N)
     ▼
┌──────────────────────┐
│  NOTIFICATIONS       │
├──────────────────────┤
│ id (PK)              │
│ order_id (FK)        │
│ message (TEXT)       │
│ read (BOOLEAN)       │
│ notification_date    │
│ created_at           │
└──────────────────────┘
```

### COMPANIES
```
Tabla principal: companies
├─ id (UUID) - Primary Key
├─ name (VARCHAR UNIQUE) - Nombre de la empresa
├─ logo (TEXT) - URL del logo
├─ user_limit (INTEGER) - Cupo de usuarios corporativos
├─ created_at (TIMESTAMP) - Creación
└─ updated_at (TIMESTAMP) - Última actualización
```

---

## Relaciones Detalladas

### 1. **ROLES → USERS** (1:N)
- Un rol puede tener muchos usuarios
- Tipos: admin, empleado, cliente
- Relación: No eliminable (roles son constantes)

### 2. **USERS → ORDERS** (1:N)
- Un cliente puede tener muchas órdenes
- client_id puede ser NULL (cliente ocasional)
- Relación: ON DELETE SET NULL (orden sin cliente)

### 3. **COMPANIES → USERS** (1:N opcional)
- Una empresa puede tener muchos usuarios corporativos
- `users.company_id` puede ser NULL para usuarios independientes
- Relación: ON DELETE SET NULL

### 4. **ORDER_STATES → ORDERS** (1:N)
- Un estado puede aplicarse a muchas órdenes
- Estados son predefinidos (recibido → entregado)
- Relación: No eliminable mientras existan órdenes

### 5. **ORDERS → BUDGET_ITEMS** (1:N)
- Una orden puede tener múltiples items de presupuesto
- Relación: ON DELETE CASCADE (eliminar orden elimina items)

### 6. **ORDERS → TIMELINE_EVENTS** (1:N)
- Una orden puede tener múltiples eventos en su historial
- Relación: ON DELETE CASCADE (eliminar orden elimina eventos)

### 7. **ORDER_STATES → TIMELINE_EVENTS** (1:N)
- Un estado puede estar en múltiples eventos históricos
- Relación: No eliminable mientras existan eventos

### 8. **ORDERS → NOTIFICATIONS** (1:N)
- Una orden puede tener múltiples notificaciones
- Relación: ON DELETE CASCADE (eliminar orden elimina notificaciones)

---

## Cardinalidades

| De | A | Tipo | Notas |
|---|---|---|---|
| ROLES | USERS | 1:N | Un rol múltiples usuarios |
| COMPANIES | USERS | 1:N opcional | `company_id` NULL para usuarios independientes |
| USERS | ORDERS | 1:N | Un cliente múltiples órdenes (nullable) |
| ORDER_STATES | ORDERS | 1:N | Un estado múltiples órdenes |
| ORDER_STATES | TIMELINE_EVENTS | 1:N | Un estado múltiples eventos |
| ORDERS | BUDGET_ITEMS | 1:N | Una orden múltiples items |
| ORDERS | TIMELINE_EVENTS | 1:N | Una orden múltiples eventos |
| ORDERS | NOTIFICATIONS | 1:N | Una orden múltiples notificaciones |

---

## Atributos por Tabla

### ROLES
```
Tabla principal: roles
├─ id (TEXT) - Primary Key
│  └─ Valores: admin, empleado, cliente
├─ name (VARCHAR) - Nombre del rol
├─ description (TEXT) - Descripción
└─ created_at (TIMESTAMP)
```

### USERS
```
Tabla principal: users
├─ id (UUID) - Primary Key
├─ name (VARCHAR) - Nombre completo
├─ email (VARCHAR UNIQUE) - Email único
├─ phone (VARCHAR) - Teléfono
├─ role (FK→roles.id) - Rol del usuario
├─ active (BOOLEAN) - ¿Usuario activo?
├─ company_id (FK→companies.id, nullable) - Empresa a la que pertenece
├─ created_at (TIMESTAMP) - Creación
└─ updated_at (TIMESTAMP) - Última actualización
```

### COMPANIES
```
Tabla principal: companies
├─ id (UUID) - Primary Key
├─ name (VARCHAR UNIQUE) - Nombre de la empresa
├─ logo (TEXT) - URL del logo
├─ user_limit (INTEGER) - Cupo máximo de usuarios
├─ created_at (TIMESTAMP) - Creación
└─ updated_at (TIMESTAMP) - Última actualización
```

### ORDER_STATES
```
Tabla principal: order_states
├─ id (TEXT) - Primary Key (recibido, en_diagnostico, etc)
├─ label (VARCHAR) - Etiqueta visible
├─ color (VARCHAR) - Código hex color (#RRGGBB)
├─ position (INTEGER UNIQUE) - Posición en flujo (0-5)
├─ created_at (TIMESTAMP)
└─ updated_at (TIMESTAMP)
```

### ORDERS
```
Tabla principal: orders (Entidad Central)
├─ Identificación
│  ├─ id (UUID) - Primary Key
│  └─ code (VARCHAR UNIQUE) - Código orden (TF-1024)
├─ Cliente
│  ├─ client_id (FK, nullable) - Referencia usuario
│  ├─ client_name (VARCHAR) - Nombre del cliente
│  ├─ client_phone (VARCHAR) - Teléfono
│  └─ client_email (VARCHAR) - Email
├─ Equipo
│  ├─ device_type (VARCHAR) - PC, Notebook, Consola, etc
│  ├─ device_brand (VARCHAR) - Marca
│  ├─ device_model (VARCHAR) - Modelo
│  └─ fault (TEXT) - Problema reportado
├─ Gestión
│  ├─ status (FK→order_states.id) - Estado actual
│  └─ assigned_to (VARCHAR) - Empleado asignado
├─ Auditoría
│  ├─ created_at (TIMESTAMP)
│  └─ updated_at (TIMESTAMP)
└─ Relaciones (1:N)
   ├─ → BUDGET_ITEMS (múltiples items)
   ├─ → TIMELINE_EVENTS (múltiples eventos)
   └─ → NOTIFICATIONS (múltiples notificaciones)
```

### BUDGET_ITEMS
```
Tabla detalle: budget_items
├─ id (UUID) - Primary Key
├─ order_id (FK→orders.id) - Orden padre
├─ description (VARCHAR) - Descripción del item
├─ amount (DECIMAL) - Monto en ARS
└─ created_at (TIMESTAMP)
```

### TIMELINE_EVENTS
```
Tabla detalle: timeline_events
├─ id (UUID) - Primary Key
├─ order_id (FK→orders.id) - Orden padre
├─ status (FK→order_states.id) - Estado registrado
├─ note (TEXT) - Nota adicional
├─ event_date (TIMESTAMP) - Fecha del evento
└─ created_at (TIMESTAMP)
```

### NOTIFICATIONS
```
Tabla detalle: notifications
├─ id (UUID) - Primary Key
├─ order_id (FK→orders.id) - Orden padre
├─ message (TEXT) - Contenido notificación
├─ read (BOOLEAN) - ¿Fue leída?
├─ notification_date (TIMESTAMP) - Fecha envío
└─ created_at (TIMESTAMP)
```

---

## Flujo de Datos

```
Cliente Registrado (USERS)
    │
    └─→ Crea Orden (ORDERS)
           │
           ├─→ Inicia en estado "recibido" (ORDER_STATES)
           │
           ├─→ Se registra evento inicial (TIMELINE_EVENTS)
           │
           ├─→ Se envía notificación (NOTIFICATIONS)
           │
           ├─→ Se asigna a empleado (ORDERS.assigned_to)
           │
           └─→ Se agrega presupuesto (BUDGET_ITEMS)
                  │
                  └─→ Se envía notificación de presupuesto

Durante la reparación:
    │
    ├─→ Estado cambia → en_diagnostico
    │   ├─ Nuevo evento en TIMELINE_EVENTS
    │   └─ Nueva notificación
    │
    ├─→ Estado cambia → esperando_repuestos
    │   ├─ Nuevo evento en TIMELINE_EVENTS
    │   └─ Nueva notificación
    │
    ├─→ Estado cambia → en_reparacion
    │   ├─ Nuevo evento en TIMELINE_EVENTS
    │   └─ Nueva notificación
    │
    ├─→ Estado cambia → listo
    │   ├─ Nuevo evento en TIMELINE_EVENTS
    │   └─ Nueva notificación
    │
    └─→ Estado cambia → entregado
        ├─ Nuevo evento en TIMELINE_EVENTS
        └─ Notificación final
```

---

## Índices Principales

```
Tabla: users
├─ idx_users_email (email)
├─ idx_users_role (role)
├─ idx_users_active (active)
└─ idx_users_company_id (company_id)

Tabla: companies
└─ name (UNIQUE)

Tabla: orders
├─ idx_orders_code (code)
├─ idx_orders_client_id (client_id)
├─ idx_orders_status (status)
├─ idx_orders_assigned_to (assigned_to)
└─ idx_orders_created_at (created_at DESC)

Tabla: budget_items
└─ idx_budget_items_order_id (order_id)

Tabla: timeline_events
├─ idx_timeline_events_order_id (order_id)
└─ idx_timeline_events_status (status)

Tabla: notifications
├─ idx_notifications_order_id (order_id)
└─ idx_notifications_read (read)
```

---

## Restricciones de Integridad

### Foreign Keys
```
users.role → roles.id (RESTRICT)
users.company_id → companies.id (SET NULL)
orders.client_id → users.id (SET NULL)
orders.status → order_states.id (RESTRICT)
budget_items.order_id → orders.id (CASCADE)
timeline_events.order_id → orders.id (CASCADE)
timeline_events.status → order_states.id (RESTRICT)
notifications.order_id → orders.id (CASCADE)
```

### Unique Constraints
```
users.email (UNIQUE)
orders.code (UNIQUE)
order_states.position (UNIQUE)
```

### Not Null Constraints
```
users: name, email, phone, role, active, created_at
order_states: label, color, position
orders: code, client_name, client_phone, client_email,
        device_type, device_brand, device_model, fault,
        status, assigned_to, created_at
budget_items: order_id, description, amount
timeline_events: order_id, status, event_date
notifications: order_id, message, read, notification_date
```

---

## Views (Vistas)

### v_orders_summary
```
Columnas: id, code, client_name, client_email, device_type,
          device_brand, status_label, status_color, assigned_to,
          budget_total, created_at, updated_at

Lógica: LEFT JOIN orders con users, order_states, budget_items
        Agrupa por order_id y suma budget_items
```

### v_latest_notifications
```
Columnas: order_id, message, read, notification_date

Lógica: DISTINCT ON (order_id) para obtener última notificación
        Ordenada por notification_date DESC
```

---

## Procedimientos Almacenados

### get_order_budget_total(order_uuid)
```
Entrada: UUID de orden
Salida: DECIMAL (suma de budget_items.amount)
Lógica: SUM(amount) WHERE order_id = parametro
```

### get_order_statistics()
```
Salida: TABLE(total_orders, completed_orders, pending_orders, average_budget)
Lógica: Estadísticas globales del sistema
```

---

## Consideraciones de Diseño

1. **Cliente Ocasional**: `client_id` es nullable para permitir órdenes sin cliente registrado

2. **Auditoría**: Todas las tablas tienen `created_at`, algunas también `updated_at`

3. **Moneda**: Presupuestos en ARS (pesos argentinos)

4. **Cascada**: Eliminar orden elimina automáticamente items, eventos y notificaciones

5. **Historial**: TIMELINE_EVENTS mantiene registro inmutable de cambios

6. **Notificaciones**: Separadas en tabla para permitir historial y lectura

7. **Estados Predefinidos**: ORDER_STATES es casi estática pero permitre personalización

---

## Normalización

- **1NF**: Todos los campos tienen valores atómicos ✓
- **2NF**: Todas las dependencias funcionales están resueltas ✓
- **3NF**: Sin dependencias transitivas ✓
- **BCNF**: Todos los determinantes son claves candidatas ✓

---

## Escalabilidad

- Los índices de búsqueda permiten queries rápidas incluso con miles de órdenes
- Las vistas permiten reportes complejos sin afectar performance
- Las funciones almacenadas centralizan lógica de negocio
- RLS permite seguridad a nivel de fila en Supabase

---

## Próximos Pasos

1. Implementar en Supabase usando `schema.sql`
2. Configurar políticas RLS según autenticación
3. Crear índices adicionales si es necesario
4. Realizar testing de integridad referencial
5. Documentar procedimientos de backup

---

**Diagrama creado:** 2024-07-06  
**Versión:** 1.0  
**Estado:** Listo para producción
