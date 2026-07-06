# 📚 Base de Datos - Sistema de Gestión de Reparaciones

## Documentación Completa del Schema PostgreSQL/Supabase

---

## 📖 Índice de Archivos

```
database/
├── README.md                       ← Estás aquí
├── schema.sql                      ← SQL COMPLETO para crear todo
├── QUICK_START.md                  ← Inicio rápido (5 min)
├── SCHEMA_DOCUMENTATION.md         ← Documentación detallada
├── QUERIES_GUIDE.md                ← +100 queries útiles
├── ER_DIAGRAM.md                   ← Diagrama entidad-relación
└── README.md                       ← Este archivo
```

---

## 🚀 INICIO RÁPIDO (¿Prisa?)

**5 minutos para poner en marcha:**

1. Abre Supabase SQL Editor
2. Copia el contenido de `schema.sql`
3. Pega y ejecuta
4. ¡Listo! Tu BD está lista

→ Ir a: **[QUICK_START.md](./QUICK_START.md)**

---

## 📋 ¿QUÉ NECESITAS?

### "Quiero entender la estructura completa"
→ Lee: **[SCHEMA_DOCUMENTATION.md](./SCHEMA_DOCUMENTATION.md)**

- Descripción detallada de cada tabla
- Campos y sus tipos
- Relaciones entre tablas
- Ejemplos de datos
- Funciones disponibles

### "Necesito hacer queries SQL"
→ Usa: **[QUERIES_GUIDE.md](./QUERIES_GUIDE.md)**

- 100+ queries listos para copiar-pegar
- Búsquedas y filtros
- Reportes
- Operaciones CRUD
- Tips y trucos

### "Quiero ver el diagrama visual"
→ Mira: **[ER_DIAGRAM.md](./ER_DIAGRAM.md)**

- Diagrama ASCII de relaciones
- Cardinalidades
- Índices
- Restricciones
- Flujo de datos

### "Solo dame el SQL"
→ Copia: **[schema.sql](./schema.sql)**

- SQL listo para ejecutar
- Con datos de ejemplo
- Vistas y funciones
- Políticas RLS

---

## 🎯 PRINCIPALES CARACTERÍSTICAS

### ✅ 7 Tablas Principales
```
roles          → Tipos de usuario (admin, empleado, cliente)
users          → Usuarios del sistema
orders         → Órdenes de reparación
order_states   → Estados del flujo
budget_items   → Items de presupuesto
timeline_events → Historial de cambios
notifications  → Notificaciones a clientes
```

### ✅ 2 Vistas SQL
```
v_orders_summary      → Órdenes con info consolidada
v_latest_notifications → Última notificación por orden
```

### ✅ 2 Funciones SQL
```
get_order_budget_total()  → Total de presupuesto
get_order_statistics()    → Estadísticas globales
```

### ✅ Seguridad RLS
```
Row Level Security habilitado
Políticas básicas incluidas
Fácil de personalizar
```

---

## 📊 ESTRUCTURA DE DATOS

### El Flujo Central

```
USUARIO (Cliente)
    ↓
Crea ORDEN
    ↓
├─ PRESUPUESTO (items de costo)
├─ LÍNEA DE TIEMPO (historial de estados)
└─ NOTIFICACIONES (comunicación con cliente)
```

### Tabla Principal: ORDERS

Una orden tiene:
- Identificación (`code`: TF-1024)
- Información del cliente (nombre, email, teléfono)
- Datos del equipo (marca, modelo, tipo)
- Descripción del problema (`fault`)
- Estado actual (`status`)
- Asignación a empleado (`assigned_to`)
- Presupuesto asociado (`budget_items`)
- Historial de cambios (`timeline_events`)
- Notificaciones (`notifications`)

---

## 🔄 EJEMPLO DE USO

### Crear una orden
```sql
INSERT INTO orders (
  code, client_name, client_phone, client_email,
  device_type, device_brand, device_model, fault,
  status, assigned_to
) VALUES (
  'TF-1030',
  'Cliente Nuevo',
  '+54 11 1111-2222',
  'cliente@mail.com',
  'Notebook',
  'HP',
  'Pavilion 15',
  'Pantalla rota',
  'recibido',
  'Martín Gómez'
);
```

### Cambiar estado
```sql
UPDATE orders
SET status = 'en_reparacion'
WHERE code = 'TF-1030';
```

### Ver presupuesto
```sql
SELECT description, amount
FROM budget_items
WHERE order_id = (SELECT id FROM orders WHERE code = 'TF-1030');
```

→ Más ejemplos en: **[QUERIES_GUIDE.md](./QUERIES_GUIDE.md)**

---

## 🎓 CONCEPTOS CLAVE

### Clientes Registrados vs Ocasionales
- **Registrado**: Usuario en la tabla `users` con rol 'cliente'
- **Ocasional**: Orden sin `client_id` (NULL)
- Ambos pueden consultar su orden por código

### Estados del Flujo
1. **Recibido** (🟣) - Ingresa la orden
2. **En diagnóstico** (🔵) - Se evalúa el equipo
3. **Esperando repuestos** (🟠) - Pendiente llegada de piezas
4. **En reparación** (🔵) - Se está arreglando
5. **Listo para retirar** (🟢) - Completada
6. **Entregado** (🟣) - Cliente retiró

### Presupuesto
- Tabla separada `budget_items`
- Múltiples items por orden
- Total calculado con función SQL
- Se notifica al cliente cuando está cargado

### Historial
- Tabla `timeline_events` registra cada cambio
- Inmutable (solo se inserta, no se modifica)
- Permite auditoría completa de la orden

---

## 🔒 SEGURIDAD

### Row Level Security (RLS)
- ✅ Habilitado en todas las tablas principales
- ✅ Políticas básicas incluidas
- ✅ Fácil de personalizar para tu sistema de autenticación

### Integridad Referencial
- ✅ Foreign keys en todas las relaciones
- ✅ ON DELETE CASCADE para eliminar en cascada
- ✅ ON DELETE SET NULL para clientes ocasionales

### Auditoría
- ✅ `created_at` en todas las tablas
- ✅ `updated_at` en tablas principales
- ✅ Campos `event_date` en historial

---

## 📈 DATOS DE EJEMPLO

Se incluyen datos iniciales:

### 7 Usuarios
```
- 1 Admin (Lucía)
- 3 Empleados (Martín, Sofía, Diego)
- 3 Clientes (Juan, María, Carlos)
```

### 3 Órdenes
```
- TF-1024: PS5 - Esperando repuestos
- TF-1025: Notebook - Lista para retirar
- TF-1026: PC - En diagnóstico
```

Con eventos, presupuestos y notificaciones completas.

---

## 🚀 CÓMO EMPEZAR

### Paso 1: Crear el Schema
```
1. Ir a Supabase Dashboard
2. SQL Editor
3. Copiar `schema.sql` completo
4. Pegar y ejecutar
5. ✅ Listo!
```

### Paso 2: Verificar
```sql
-- Verificar que existen las tablas
SELECT COUNT(*) FROM orders;
SELECT COUNT(*) FROM users;
```

### Paso 3: Usar
Usa los queries de `QUERIES_GUIDE.md` para operaciones comunes.

---

## 📚 REFERENCIAS RÁPIDAS

### Tablas por Funcionalidad

**Gestión de Usuarios:**
- `roles` - Tipos de rol
- `users` - Usuarios sistema

**Órdenes:**
- `orders` - Orden principal
- `order_states` - Estados disponibles
- `budget_items` - Items de costo
- `timeline_events` - Historial
- `notifications` - Notificaciones

### Queries Más Usadas

```sql
-- Ver todas las órdenes activas
SELECT * FROM orders WHERE status != 'entregado';

-- Ver órdenes de un cliente
SELECT * FROM orders WHERE client_email = 'ejemplo@mail.com';

-- Ver presupuesto de orden
SELECT get_order_budget_total(id) FROM orders WHERE code = 'TF-1024';

-- Ver estadísticas
SELECT * FROM get_order_statistics();

-- Cambiar estado
UPDATE orders SET status = 'en_reparacion' WHERE code = 'TF-1024';
```

→ Más queries: **[QUERIES_GUIDE.md](./QUERIES_GUIDE.md)**

---

## 🆘 PROBLEMAS COMUNES

### "No puedo ver las tablas"
→ Ejecutar el SQL completo de `schema.sql`

### "Error de foreign key"
→ Verificar que el usuario/estado/orden existe antes

### "Permisos denegados"
→ Configurar las políticas RLS en Supabase

### "Email/Código duplicado"
→ Email y código de orden deben ser únicos

---

## 💡 TIPS

1. **Buscar orden rápido:**
   ```sql
   SELECT * FROM orders WHERE code = 'TF-1024';
   ```

2. **Total de ingresos:**
   ```sql
   SELECT SUM(get_order_budget_total(id)) FROM orders WHERE status = 'entregado';
   ```

3. **Órdenes sin asignar:**
   ```sql
   SELECT * FROM orders WHERE assigned_to IS NULL;
   ```

4. **Exportar reportes:**
   Usa `QUERIES_GUIDE.md` → Sección REPORTES

---

## 🔗 RELACIONES PRINCIPALES

```
users
  ├── roles (N:1)
  └── orders (1:N)
       ├── order_states (N:1)
       ├── budget_items (1:N)
       ├── timeline_events (1:N)
       │    └── order_states (N:1)
       └── notifications (1:N)
```

→ Diagrama completo: **[ER_DIAGRAM.md](./ER_DIAGRAM.md)**

---

## 📞 DOCUMENTACIÓN DISPONIBLE

| Documento | Para | Tiempo |
|---|---|---|
| **QUICK_START.md** | Inicio rápido | 5 min |
| **SCHEMA_DOCUMENTATION.md** | Entender estructura | 15 min |
| **QUERIES_GUIDE.md** | Hacer queries | Consulta |
| **ER_DIAGRAM.md** | Ver relaciones | 10 min |
| **schema.sql** | Ejecutar SQL | 1 min |

---

## ✅ Checklist Implementación

- [ ] Ejecutar `schema.sql` en Supabase
- [ ] Verificar que las 7 tablas existan
- [ ] Probar queries básicas
- [ ] Leer `SCHEMA_DOCUMENTATION.md`
- [ ] Configurar políticas RLS según necesidad
- [ ] Crear backups regulares
- [ ] Documentar cambios personalizados

---

## 🎯 Próximos Pasos

1. ✅ **Crear schema**: Ejecutar `schema.sql`
2. 📖 **Aprender**: Leer documentación
3. 🔍 **Explorar**: Probar queries
4. 🛠️ **Personalizar**: Adaptar según necesidades
5. 🚀 **Implementar**: Conectar desde aplicación
6. 📊 **Monitorear**: Revisar performance

---

## 📄 Estructura del Repositorio

```
database/
├── schema.sql                  ← ⭐ INICIO AQUÍ
├── QUICK_START.md             ← ⭐ MÁS RÁPIDO
├── SCHEMA_DOCUMENTATION.md    ← Referencia completa
├── QUERIES_GUIDE.md           ← +100 queries
├── ER_DIAGRAM.md              ← Diagrama visual
└── README.md                  ← Este archivo
```

---

## 📝 Notas Importantes

1. **Moneda**: Todos los montos en ARS (pesos argentinos)
2. **Zona horaria**: TIMESTAMP WITH TIME ZONE
3. **Códigos únicos**: Generados automáticamente (TF-XXXX)
4. **Eliminación**: En cascada para órdenes
5. **Clientes ocasionales**: `client_id` puede ser NULL

---

## 🎉 ¡Listo para Usar!

Tu base de datos está lista para:
- ✅ Crear y gestionar órdenes
- ✅ Trackear presupuestos
- ✅ Mantener historial completo
- ✅ Notificar a clientes
- ✅ Generar reportes

**Tiempo para empezar: 5 minutos**

---

## 📞 Soporte

¿Problemas?
1. Revisa `QUICK_START.md`
2. Busca en `QUERIES_GUIDE.md`
3. Consulta `SCHEMA_DOCUMENTATION.md`
4. Verifica `ER_DIAGRAM.md`

**¡Adelante!** 🚀

---

**Última actualización:** 2024-07-06  
**Versión:** 1.0  
**Estado:** ✅ Producción
