# ✅ Checklist de Configuración - Base de Datos Supabase

## 🎯 Objetivo
Implementar el schema SQL en tu base de datos Supabase integrada para que el sistema de gestión de reparaciones funcione con persistencia real.

---

## 📋 Paso a Paso (5 minutos)

### 1️⃣ Abre Supabase Dashboard
- [ ] Ve a https://app.supabase.com
- [ ] Inicia sesión con tu cuenta
- [ ] Selecciona tu proyecto

**Resultado esperado:** Ves el dashboard de tu proyecto Supabase

---

### 2️⃣ Accede al SQL Editor
- [ ] En el menú lateral, haz clic en **"SQL Editor"**
- [ ] Verás una lista de consultas guardadas (si hay)
- [ ] Haz clic en **"New Query"**

**Resultado esperado:** Se abre un editor SQL vacío

---

### 3️⃣ Copia el Schema SQL
- [ ] En tu editor de código, abre: `database/schema.sql`
- [ ] Selecciona TODO el contenido: **Ctrl+A** (Windows/Linux) o **Cmd+A** (Mac)
- [ ] Cópialo: **Ctrl+C** o **Cmd+C**

**Resultado esperado:** Tienes todo el SQL en el portapapeles

---

### 4️⃣ Pega en Supabase
- [ ] En el SQL Editor de Supabase, borra cualquier contenido existente
- [ ] Pega el SQL: **Ctrl+V** o **Cmd+V**
- [ ] Deberías ver 380 líneas de SQL

**Resultado esperado:** El SQL aparece en el editor

---

### 5️⃣ Ejecuta el SQL
- [ ] Haz clic en el botón **"RUN"** (esquina superior derecha)
- [ ] O usa el atajo: **Ctrl+Enter** o **Cmd+Enter**
- [ ] Espera a que termine (2-5 segundos)

**Resultado esperado:** Ves mensaje "Query executed successfully"

---

### 6️⃣ Verifica las Tablas
- [ ] En el menú lateral izquierdo, haz clic en **"Tables"**
- [ ] Deberías ver estas 7 tablas listadas:
  - [ ] `roles`
  - [ ] `users`
  - [ ] `order_states`
  - [ ] `orders`
  - [ ] `budget_items`
  - [ ] `timeline_events`
  - [ ] `notifications`

**Resultado esperado:** Todas las 7 tablas aparecen en el listado

---

### 7️⃣ Verifica los Datos de Ejemplo
- [ ] Haz clic en la tabla **"orders"**
- [ ] Deberías ver 3 órdenes (CP-2407010001, CP-2407030002, CP-2407060003)
- [ ] Haz clic en **"users"**
- [ ] Deberías ver 7 usuarios (1 admin, 3 empleados, 3 clientes)

**Resultado esperado:** Los datos de ejemplo están presentes

---

### 8️⃣ Verifica los Índices y Vistas
- [ ] En el menú lateral, expande la sección de **"Database"**
- [ ] Busca **"Indexes"** - Deberías ver ~11 índices
- [ ] Busca **"Views"** - Deberías ver 2 vistas:
  - [ ] `v_orders_summary`
  - [ ] `v_latest_notifications`

**Resultado esperado:** Índices y vistas están presentes

---

## 🎉 ¡Configuración Completada!

Si has marcado todas las casillas anteriores, tu base de datos está lista.

---

## 📊 Estructura Creada

```
Base de Datos: PostgreSQL (Supabase)
├── Tablas (7)
│   ├── roles → Tipos de rol
│   ├── users → Usuarios del sistema
│   ├── order_states → Estados de reparación
│   ├── orders → Órdenes (principal)
│   ├── budget_items → Presupuestos
│   ├── timeline_events → Historial
│   └── notifications → Notificaciones
│
├── Vistas (2)
│   ├── v_orders_summary → Resumen de órdenes
│   └── v_latest_notifications → Últimas notificaciones
│
├── Funciones (2)
│   ├── get_order_budget_total() → Calcula totales
│   └── get_order_statistics() → Estadísticas
│
└── Datos de Ejemplo
    ├── 7 usuarios
    ├── 3 órdenes
    ├── 6 presupuestos
    └── 8 notificaciones
```

---

## 🔍 Consultas Útiles para Verificar

Una vez configurada la base de datos, puedes hacer estas consultas en el SQL Editor de Supabase:

### Contar todas las tablas
```sql
SELECT 
  tablename,
  (SELECT COUNT(*) FROM pg_table_info(tablename)::pg_table_info) as row_count
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

### Ver todas las órdenes
```sql
SELECT code, client_name, status, assigned_to, created_at
FROM orders
ORDER BY created_at DESC;
```

### Ver todos los usuarios
```sql
SELECT name, email, role, active
FROM users
ORDER BY role, name;
```

### Ver presupuesto total por orden
```sql
SELECT 
  o.code,
  o.client_name,
  COUNT(bi.id) as items,
  SUM(bi.amount) as total
FROM orders o
LEFT JOIN budget_items bi ON o.id = bi.order_id
GROUP BY o.id, o.code, o.client_name;
```

---

## 🆘 Troubleshooting

### Error: "Table already exists"
**Causa:** Las tablas ya fueron creadas.
**Solución:** Es normal. El script usa `CREATE TABLE IF NOT EXISTS` así que es seguro ejecutarlo de nuevo.

### Error: "Extension uuid-ossp not available"
**Causa:** La extensión UUID no está habilitada.
**Solución:** Supabase lo hace automáticamente. Si tienes problemas, ejecuta:
```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

### No aparecen las tablas después de ejecutar
**Solución:**
1. Recarga la página (F5)
2. Desconéctate y vuelve a conectar
3. Revisa los errores en la consola del SQL Editor
4. Intenta nuevamente paso por paso

### El botón "RUN" está deshabilitado
**Causa:** El SQL puede estar vacío o hay error de sintaxis.
**Solución:**
1. Verifica que pegaste TODO el contenido de `schema.sql`
2. Asegúrate de que no hay código cortado
3. Intenta copiar y pegar de nuevo

---

## 📚 Documentación Adicional

Después de la configuración, puedes consultar:

| Archivo | Contenido |
|---------|-----------|
| `SETUP_DATABASE.md` | Guía completa de configuración |
| `database/QUICK_START.md` | Queries más usadas |
| `database/SCHEMA_DOCUMENTATION.md` | Descripción de cada tabla |
| `database/QUERIES_GUIDE.md` | +100 ejemplos de SQL |
| `database/SQL_SNIPPETS.md` | Queries copy-paste |
| `database/ER_DIAGRAM.md` | Diagrama de relaciones |

---

## 🚀 Próximos Pasos

Una vez configurada la base de datos:

1. **Integra con tu aplicación**
   - Actualiza `lib/store.tsx` para usar Supabase
   - Migra de estado local a base de datos

2. **Personaliza la Seguridad (RLS)**
   - Modifica las políticas según tu autenticación
   - Implementa control de acceso por usuario

3. **Prueba con los datos de ejemplo**
   - Explora las órdenes existentes
   - Prueba las vistas SQL creadas

4. **Agrega más datos**
   - Crea nuevos usuarios
   - Crea nuevas órdenes
   - Documenta el proceso

---

## ✨ Características Después de la Configuración

Con el schema implementado, podrás:

✅ **Crear órdenes** con información del cliente y equipo
✅ **Trackear presupuestos** con múltiples items
✅ **Mantener historial** de cambios de estado
✅ **Notificar clientes** automáticamente
✅ **Consultar datos** con vistas SQL
✅ **Generar reportes** con funciones SQL
✅ **Controlar acceso** con Row Level Security

---

## 📞 Soporte

Si tienes problemas:

1. **Revisa la documentación** en `database/README.md`
2. **Consulta Supabase docs:** https://supabase.com/docs
3. **Ejecuta consultas de verificación** (ver sección anterior)
4. **Contacta soporte** si persisten los errores

---

## 🎯 Resumen

| Métrica | Valor |
|---------|-------|
| Tiempo de configuración | 5 minutos |
| Tablas creadas | 7 |
| Vistas creadas | 2 |
| Funciones creadas | 2 |
| Datos de ejemplo | 19 registros |
| Líneas de SQL | 380 |
| Documentación | 2,600+ líneas |
| Ejemplos de queries | +100 |

---

## ✅ Checklist Final

- [ ] Abrí Supabase Dashboard
- [ ] Fui a SQL Editor
- [ ] Copié `database/schema.sql`
- [ ] Pegué el SQL en Supabase
- [ ] Ejecuté el SQL
- [ ] Verifiqué las 7 tablas
- [ ] Verifiqué los datos de ejemplo
- [ ] Verifiqué índices y vistas
- [ ] Leí la documentación
- [ ] ¡Listo para empezar!

---

**¿Completaste todos los pasos? ¡Felicidades! 🎉**

Tu base de datos Supabase está lista para usar. Ahora puedes:

1. Integrar con tu aplicación
2. Crear nuevas órdenes
3. Trackear presupuestos
4. Notificar a clientes

¡Adelante! 🚀
