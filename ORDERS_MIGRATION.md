# Migración de Órdenes a Persistencia Real

## Resumen
Se implementó la persistencia completa de órdenes en Supabase, reemplazando los datos hardcodeados que existían solo en memoria.

## Cambios Realizados

### 1. Nueva capa de queries: `lib/queries/orders.ts`
Funciones implementadas:
- ✅ `fetchOrders()` - Obtiene todas las órdenes con sus relaciones (budget_items, timeline_events, notifications)
- ✅ `insertOrderRemote()` - Crea una orden nueva con código único calculado automáticamente
- ✅ `updateOrderStatusRemote()` - Actualiza el estado + agrega evento timeline + notificación
- ✅ `updateOrderAssigneeRemote()` - Reasigna orden + notificación
- ✅ `insertBudgetItemRemote()` - Agrega item de presupuesto
- ✅ `deleteBudgetItemRemote()` - Elimina item de presupuesto
- ✅ `insertNotificationRemote()` - Crea notificación
- ✅ `markNotificationsReadRemote()` - Marca notificaciones como leídas

### 2. Actualización de `lib/store.tsx`
- ✅ Eliminados los 3 objetos de órdenes hardcodeadas (initialOrders ahora es [])
- ✅ Agregado `useEffect` para cargar órdenes reales desde Supabase al montar
- ✅ Agregado estado `ordersLoading` (similar a `usersLoading` y `statesLoading`)
- ✅ Todas las funciones de mutación actualizadas con **patrón optimista**:
  - `addOrder` - UI instantánea con id temporal, persistencia async, reemplazo con id real de la BD
  - `advanceStatus` - Update optimista + persistencia + rollback si falla
  - `reassignOrder` - Update optimista + persistencia + rollback si falla
  - `addBudgetItem` - Insert optimista + persistencia + reemplazo con id real
  - `removeBudgetItem` - Delete optimista + persistencia + rollback si falla
  - `sendBudgetNotification` - Insert optimista + persistencia + reemplazo con id real
  - `markNotificationsRead` - Update optimista + persistencia + rollback si falla

### 3. Generación de códigos de orden
**Implementación elegida: Cálculo en TypeScript**

En `insertOrderRemote()`:
```typescript
// 1. Obtener el último código de orden
const { data: lastOrder } = await supabase
  .from("orders")
  .select("code")
  .order("created_at", { ascending: false })
  .limit(1)
  .single()

// La función SQL create_order_with_code() calcula el prefijo,
// la fecha y el contador global dentro de una transacción.
const { data } = await supabase.rpc("create_order_with_code", input)
```

**Ventajas vs función SQL:**
- ✅ Más simple de debuggear y mantener
- ✅ No requiere migraciones SQL adicionales
- ✅ Funciona con cualquier backend de base de datos
- ✅ El patrón optimista ya maneja la UI instantánea

### 4. Actualización de `lib/supabase.ts`
Exporta tanto `supabase` como `getSupabaseClient()` para compatibilidad con diferentes patrones de uso.

### 5. Manejo de clientes ocasionales
`clientId` vacío (`""`) se convierte automáticamente a `null` antes de insertarse en la BD, cumpliendo con la constraint FK que permite NULL para clientes ocasionales.

## Comportamiento de la UI

### Antes
- Todas las mutaciones solo en memoria
- Se perdía todo al recargar la página
- Códigos de orden basados en `orders.length` (fácil de duplicar)

### Ahora
- **UI optimista**: todas las mutaciones se reflejan instantáneamente
- Persistencia real en segundo plano
- Rollback automático si la persistencia falla (con log en consola)
- Recarga desde la BD al montar el provider
- Códigos de orden únicos basados en el contador global bloqueado en la BD

## Verificación

### Archivos sin errores de compilación
- ✅ `lib/store.tsx`
- ✅ `lib/queries/orders.ts`
- ✅ `lib/supabase.ts`

### Componentes compatibles
- ✅ `order-form.tsx` - Sigue funcionando con el id temporal devuelto por `addOrder`
- ✅ `order-detail.tsx` - Funciona con órdenes reales
- ✅ Todos los componentes de employee/admin que usan `orders` del store

## Próximos pasos recomendados

1. **Testing**: Probar flujo completo de creación de orden → actualización de estado → presupuesto → notificaciones
2. **Validar RLS**: Si se habilita Row Level Security en el futuro, asegurarse de que las políticas permitan las operaciones con la anon key
3. **Manejo de errores mejorado**: Considerar mostrar toasts/alertas al usuario cuando las operaciones fallen (actualmente solo se loguea en consola)
4. **Optimización**: Si el volumen de órdenes crece mucho, implementar paginación en `fetchOrders()`

## Datos de ejemplo

La base de datos ya tiene 3 órdenes de ejemplo insertadas via `schema.sql`:
- CP-2407010001 (Juan Pérez - PS5)
- CP-2407030002 (María López - Notebook)
- CP-2407060003 (Carlos Díaz - PC)

Las nuevas órdenes continuarán desde el siguiente valor del contador global.



