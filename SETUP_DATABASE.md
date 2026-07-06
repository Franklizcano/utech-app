# 🗄️ Configuración de Base de Datos

Este documento explica cómo configurar tu base de datos Supabase con el schema completo para el sistema de gestión de reparaciones.

## ⚡ Inicio Rápido (5 minutos)

### Opción 1: Manual (Recomendado para principiantes)

1. **Abre tu Supabase Dashboard**
   - Ve a: https://app.supabase.com
   - Selecciona tu proyecto

2. **Accede al SQL Editor**
   - En el menú lateral, haz clic en "SQL Editor"
   - Haz clic en "New Query"

3. **Copia el schema SQL**
   - Abre el archivo: `database/schema.sql`
   - Selecciona TODO el contenido (Ctrl+A)
   - Cópialo (Ctrl+C)

4. **Pega en Supabase**
   - En el SQL Editor, borra cualquier contenido existente
   - Pega el SQL (Ctrl+V)

5. **Ejecuta el SQL**
   - Presiona el botón "RUN" (esquina superior derecha)
   - O usa el atajo: Ctrl+Enter

6. **Verifica los resultados**
   - Deberías ver un mensaje: "Query executed successfully"
   - Las tablas aparecerán en el menú lateral bajo "Tables"

### Opción 2: Script automático (Línea de comandos)

```bash
# 1. Asegúrate de que las variables de entorno están configuradas
source /vercel/share/.env.project

# 2. Ejecuta el script de configuración
bash scripts/setup-db-rest.sh
```

### Opción 3: Usando el Supabase CLI

```bash
# 1. Instala el CLI de Supabase (si no lo tienes)
npm install -g supabase

# 2. Ejecuta el SQL
supabase db push

# 3. Copia el schema
cat database/schema.sql | supabase db execute
```

---

## 📊 ¿Qué se crea?

Cuando ejecutes el schema SQL, se crearán:

### Tablas (7)
- `roles` - Tipos de rol del sistema
- `users` - Usuarios registrados
- `order_states` - Estados de las órdenes
- `orders` - Órdenes de reparación (tabla principal)
- `budget_items` - Items de presupuesto
- `timeline_events` - Historial de cambios
- `notifications` - Notificaciones a clientes

### Vistas (2)
- `v_orders_summary` - Resumen de órdenes con presupuesto total
- `v_latest_notifications` - Última notificación por orden

### Funciones (2)
- `get_order_budget_total(uuid)` - Calcula total de presupuesto
- `get_order_statistics()` - Estadísticas globales

### Índices
- Índices en campos de búsqueda frecuente
- Índices en foreign keys para mejor rendimiento

### Datos de Ejemplo
- 7 usuarios (1 admin, 3 empleados, 3 clientes)
- 3 órdenes de reparación
- 6 items de presupuesto
- 4 eventos de línea de tiempo
- 4 notificaciones

---

## 🔍 Verificación

Después de ejecutar el script, verifica que todo esté correcto:

### En Supabase Dashboard:

1. **Ve a "Tables"** (menú lateral)
   - Deberías ver 7 tablas listadas

2. **Explora una tabla**
   - Haz clic en "orders"
   - Deberías ver 3 órdenes de ejemplo

3. **Revisa los datos de ejemplo**
   - Tabla `users` → 7 usuarios
   - Tabla `orders` → 3 órdenes
   - Tabla `budget_items` → 6 items

### En la Terminal:

```bash
# Consulta el número de filas de cada tabla
SELECT 
  schemaname,
  tablename,
  n_live_tup as row_count
FROM pg_stat_user_tables
ORDER BY n_live_tup DESC;
```

---

## 🛠️ Troubleshooting

### Error: "Table already exists"

**Causa:** Las tablas ya fueron creadas previamente.

**Solución:** 
- Los inserts de datos tienen `ON CONFLICT ... DO NOTHING`
- Esto es normal y no causa problemas
- Las tablas existentes se reutilizan

### Error: "Extension uuid-ossp not available"

**Causa:** La extensión UUID no está habilitada.

**Solución:**
Supabase la habilita automáticamente, pero si tienes problemas, ejecuta:
```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

### No puedo ejecutar el SQL

**Opciones:**

1. **Verifica tu conexión a Supabase**
   - Abre el proyecto en Supabase Dashboard
   - Ve a Settings → API
   - Confirma que tienes las credenciales correctas

2. **Usa el Supabase CLI**
   ```bash
   supabase link
   supabase db push
   ```

3. **Contacta a Soporte**
   - Supabase tiene excelente documentación: https://supabase.com/docs

---

## 📚 Documentación Adicional

Para más detalles sobre el schema:

- **QUICK_START.md** - Queries más usadas
- **SCHEMA_DOCUMENTATION.md** - Descripción de cada tabla
- **QUERIES_GUIDE.md** - +100 ejemplos de SQL
- **ER_DIAGRAM.md** - Diagrama entidad-relación

---

## 🚀 Próximos Pasos

Una vez que el schema está creado:

1. **Conecta tu aplicación**
   - Las variables de entorno ya están configuradas
   - El código puede consultar las tablas

2. **Reemplaza el store en memoria**
   - `lib/store.tsx` actualmente usa estado local
   - Migra a Supabase para persistencia real

3. **Implementa seguridad (RLS)**
   - El schema incluye políticas básicas
   - Personaliza según tu sistema de autenticación

4. **Prueba con los datos de ejemplo**
   - Los usuarios y órdenes están listos
   - Explora las vistas SQL

---

## 📞 Soporte

Si tienes problemas:

1. **Lee los archivos de documentación** en `database/`
2. **Consulta la documentación de Supabase**: https://supabase.com/docs
3. **Abre un issue** en GitHub si encontraste un bug

---

## ✅ Checklist de Configuración

- [ ] Abrí Supabase Dashboard
- [ ] Fui a SQL Editor
- [ ] Copié el contenido de `database/schema.sql`
- [ ] Pegué el SQL en Supabase
- [ ] Ejecuté el SQL
- [ ] Verifiqué que las 7 tablas aparecen
- [ ] Verifiqué que hay datos de ejemplo (3 órdenes)
- [ ] Leí la documentación en `database/`
- [ ] ¡Listo para empezar!

---

**¿Listo para empezar?** 🚀
