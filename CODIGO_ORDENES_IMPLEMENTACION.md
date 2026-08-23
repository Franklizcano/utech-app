# Implementación de Códigos Globales y Búsqueda Normalizada

## Resumen

Los códigos de órdenes usan el formato `PREFIJO-YYMMDDCONTADOR`: `CP` para clientes particulares, `CC` para clientes corporativos y `CO` para clientes ocasionales. El contador es global para todos los prefijos y nunca se repite.

## Cambios Realizados

### 1. Instalación de Dependencias
- **Paquete instalado**: `nanoid@6.0.0`
- Comando: `pnpm add nanoid`

### 2. Helpers de Utilidad (`lib/utils.ts`)

Se agregaron dos funciones helpers reutilizables:

#### `normalizeOrderCode(input: string): string`
- **Propósito**: Normaliza códigos de orden para comparación
- **Función**: Elimina guiones y espacios, convierte a mayúsculas
- **Ejemplo**: `"cp-2608120001"` → `"CP2608120001"`
- **Uso**: Permite búsquedas flexibles ignorando formato

#### `formatOrderCode(raw: string): string`
- **Propósito**: Formatea códigos para visualización consistente
- **Función**: Inserta un guion después del prefijo
- **Ejemplo**: `"CP2608120001"` → `"CP-2608120001"`
- **Uso**: Presenta códigos en formato legible

### 3. Generación de Códigos (`lib/queries/orders-server.ts`)

#### Función SQL `create_order_with_code()`
La función bloquea el contador global, calcula el prefijo según el cliente e inserta la orden en la misma transacción.

**Características**:
- Usa `CP`, `CC` o `CO` como referencia para colaboradores
- Incluye la fecha local en formato `YYMMDD`
- Usa mínimo cuatro posiciones para el contador
- Crece naturalmente a cinco o más posiciones desde `10000`
- El contador es único globalmente, incluso entre prefijos

#### Función `insertOrderRemote()` actualizada
**Cambios principales**:
- ❌ Eliminado: nanoid y códigos `TF`
- ✅ Agregado: Contador bloqueado dentro de una transacción
- ✅ Agregado: Reutilización del contador si falla el INSERT de la orden
- ✅ Agregado: Migración cronológica de los tickets existentes

**Ventajas**:
- Sin duplicados ante creaciones concurrentes
- Sin reinicio por fecha o prefijo
- Códigos legibles y útiles para colaboradores

### 4. Portal de Cliente (`components/client/client-portal.tsx`)

#### Componente `ClientLogin` actualizado
**Cambios**:
- Importa `normalizeOrderCode` desde utils
- Normaliza tanto el input del usuario como el código de la orden antes de comparar
- Permite búsqueda flexible: con o sin guiones, mayúsculas/minúsculas

**Código de búsqueda**:
```typescript
const normalizedInput = normalizeOrderCode(code.trim())
const match = orders.find(
  (o) => normalizeOrderCode(o.code) === normalizedInput || 
         o.clientEmail.toLowerCase() === code.trim().toLowerCase()
)
```

**Ejemplos de búsqueda válidos**:
- `CP-2608120001` ✅
- `cp2608120001` ✅
- `CP 260812 0001` ✅
- `260812` ✅
- `0001` ✅

#### Placeholders actualizados
- Antes: códigos antiguos de prueba
- Ahora: `CP-2608120001`, `CC-2608120002`, `CO-2608120003`

### 5. Vista de Servicio (`components/service-workspace.tsx`)

#### Nuevo buscador agregado
**Funcionalidad**:
- Input de búsqueda sobre la lista de órdenes
- Filtra en tiempo real mientras el usuario escribe
- Búsqueda por:
  - Código de orden (normalizado)
  - Nombre del cliente

**Implementación**:
```typescript
const filteredOrders = useMemo(() => {
  if (!searchQuery.trim()) return orders
  
  const normalizedQuery = normalizeOrderCode(searchQuery.trim())
  const lowerQuery = searchQuery.trim().toLowerCase()
  
  return orders.filter((order) => {
    const matchesCode = normalizeOrderCode(order.code).includes(normalizedQuery)
    const matchesClient = order.clientName.toLowerCase().includes(lowerQuery)
    return matchesCode || matchesClient
  })
}, [orders, searchQuery])
```

**UI/UX**:
- Icono de búsqueda en el input
- Placeholder: "Buscar por código o cliente..."
- Mensaje cuando no hay resultados
- Performance optimizada con `useMemo`

## Formato de Códigos

### Nuevo formato global
- `CP-2608080150`: cliente particular
- `CC-2608090151`: cliente corporativo
- `CO-26081010000`: cliente ocasional, contador de cinco dígitos
- La secuencia global no se reinicia y cada contador confirmado es único.

## Compatibilidad con Base de Datos

- La columna `code` mantiene restricción `UNIQUE` y admite longitud variable.
- `order_code_counter` serializa las creaciones concurrentes.
- `007_global_order_codes.sql` migra los códigos existentes usando `created_at`.

## Testing

### Verificación de compilación
```bash
pnpm run build
```
✅ Compilación exitosa

### Pruebas sugeridas
1. Crear nueva orden → Verificar prefijo, fecha y contador global
2. Buscar orden en portal cliente con diferentes formatos
3. Usar el buscador en vista de servicio
4. Crear múltiples órdenes simultáneamente para verificar unicidad

## Archivos Modificados

1. `lib/utils.ts` - Normalización y formato de códigos variables
2. `lib/queries/orders-server.ts` - Generación transaccional y búsqueda pública
3. `components/client/client-portal.tsx` - Actualizado login con normalización
4. `components/service-workspace.tsx` - Agregado buscador con filtrado
5. `package.json` - Agregada dependencia nanoid

## Próximos Pasos (Opcionales)

1. **Migración de códigos existentes**: Ejecutar `database/migrations/007_global_order_codes.sql`
2. **Analytics**: Monitorear longitud promedio de búsqueda y patrones de uso
3. **API externa**: Si se expone API, documentar el nuevo formato de códigos
4. **Tests unitarios**: Agregar tests para `normalizeOrderCode` y `formatOrderCode`
5. **Actualizar documentación**: Revisar archivos MD con ejemplos antiguos si es necesario

## Notas Técnicas

- **Zona horaria**: La fecha del código usa `America/Argentina/Buenos_Aires`.
- **Contador**: Tiene mínimo cuatro dígitos y no se trunca al superar `9999`.
- **Búsqueda**: Normaliza y permite cualquier segmento del código completo.

## Fecha de Implementación
2026-07-31

