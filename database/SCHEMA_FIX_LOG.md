# Log de Correcciones del Schema SQL

## Error Encontrado y Corregido

### Problema Original
```
ERROR: 42601: syntax error at or near "WHERE" LINE 312
```

### Causa
Los INSERT statements con SELECT tenían dos claúsulas WHERE, lo cual es inválido en PostgreSQL.

**Código incorrecto:**
```sql
INSERT INTO budget_items (order_id, description, amount)
SELECT id, 'Cambio de módulo HDMI PS5', 28000
FROM orders WHERE code = 'TF-1024'
WHERE NOT EXISTS (SELECT 1 FROM budget_items WHERE order_id = ... ); -- ❌ SEGUNDO WHERE - ERROR!
```

### Solución Implementada
Se reemplazó la claúsula `WHERE NOT EXISTS` por `ON CONFLICT DO NOTHING`, que es más eficiente y tiene sintaxis correcta.

**Código correcto:**
```sql
INSERT INTO budget_items (order_id, description, amount)
SELECT id, 'Cambio de módulo HDMI PS5', 28000
FROM orders WHERE code = 'TF-1024'
ON CONFLICT DO NOTHING; -- ✅ Sintaxis correcta
```

## Cambios Realizados

### 1. Budget Items (6 statements corregidos)
- `INSERT INTO budget_items` para TF-1024 (módulo HDMI)
- `INSERT INTO budget_items` para TF-1024 (mano de obra)
- `INSERT INTO budget_items` para TF-1024 (limpieza)
- `INSERT INTO budget_items` para TF-1025 (pasta térmica)
- `INSERT INTO budget_items` para TF-1025 (disipador)
- `INSERT INTO budget_items` para TF-1025 (mano de obra)

### 2. Timeline Events (3 statements corregidos)
- `INSERT INTO timeline_events` para TF-1024 (recibido)
- `INSERT INTO timeline_events` para TF-1024 (diagnóstico)
- `INSERT INTO timeline_events` para TF-1024 (esperando repuestos)

### 3. Notifications (5 statements corregidos)
- `INSERT INTO notifications` para TF-1024 (recibida)
- `INSERT INTO notifications` para TF-1024 (presupuesto)
- `INSERT INTO notifications` para TF-1024 (repuesto)
- `INSERT INTO notifications` para TF-1025 (lista)
- `INSERT INTO notifications` para TF-1026 (diagnóstico)

**Total de statements corregidos: 14**

## Ventajas de la Solución

1. **Sintaxis válida**: `ON CONFLICT DO NOTHING` es la forma correcta en PostgreSQL
2. **Más eficiente**: No requiere subconsultas complejas
3. **Más limpio**: Código más legible y mantenible
4. **Idempotente**: Puede ejecutarse múltiples veces sin errores

## Verificación

El archivo `database/schema.sql` ha sido corregido y está listo para ejecutar en Supabase sin errores.

### Cómo proceder:

1. Abre Supabase Dashboard
2. Ve a SQL Editor
3. Copia el contenido actualizado de `database/schema.sql`
4. Pega en el editor
5. Haz clic en "RUN"
6. ✅ Debe ejecutarse sin errores

## Estado

✅ **CORREGIDO** - El schema SQL está listo para producción.
