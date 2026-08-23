# AGENTS.md

## Propósito del proyecto

`utech-app` es una aplicación web interna para gestionar reparaciones de equipos electrónicos. Centraliza el ingreso de órdenes, asignación y seguimiento técnico, presupuestos, notificaciones, usuarios y reportes.

El producto tiene cuatro roles principales:

- `admin`: administración global, usuarios, empresas, estados, anuncios y estadísticas.
- `colaborador`: toma y gestiona órdenes asignadas.
- `presupuestador`: trabaja con el flujo de presupuestos.
- `cliente`: crea órdenes propias, consulta su estado y recibe notificaciones.

También existe una consulta pública limitada para tickets de clientes ocasionales. Esa consulta solo debe devolver código y estado, nunca datos personales o del equipo.

## Stack y comandos

- Next.js 16 con App Router, React 19 y TypeScript estricto.
- Supabase/PostgreSQL para persistencia.
- Tailwind CSS 4 y componentes UI locales en `components/ui/`.
- `pnpm` es el gestor declarado en `package.json` (`pnpm@10.34.5`).
- Alias de imports: `@/*` apunta a la raíz del repositorio.

Comandos disponibles:

```bash
pnpm install
pnpm dev
pnpm lint
pnpm build
pnpm start
```

No hay un script de tests automatizados declarado actualmente. Después de cambios relevantes, ejecutar como mínimo `pnpm lint` y `pnpm build`; para cambios de tipos puede usarse `pnpm exec tsc --noEmit`.

## Inicio local

1. Instalar dependencias con `pnpm install`.
2. Crear `.env.local` a partir de `.env.example`.
3. Configurar las credenciales de Supabase y el secreto de sesión sin incluirlas en Git.
4. Preparar la base de datos siguiendo `database/QUICK_START.md` y las migraciones aplicables.
5. Ejecutar `pnpm dev` y abrir `http://localhost:3000`.

Variables esperadas:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` — únicamente servidor; nunca debe llevar prefijo `NEXT_PUBLIC_`.
- `NEXT_PUBLIC_ORDERS_CACHE_TTL_SECONDS` — TTL de la caché de órdenes; el código aplica un valor predeterminado si falta o es inválido.
- `SESSION_SECRET` — está documentada en `.env.example`; verificar su uso real antes de asumir que protege o firma la sesión.

Nunca imprimir valores completos de secretos en logs, documentación, commits o mensajes de error.

## Arquitectura y límites entre capas

```text
app/page.tsx y app/layout.tsx
        ↓
components/                         UI por rol y componentes reutilizables
        ↓
lib/store.tsx                        estado cliente, carga, caché y optimismo
        ↓
app/actions/*.ts                     frontera server-side y autorización
        ↓
lib/queries/*.ts                     acceso a Supabase y transformación de filas
        ↓
Supabase/PostgreSQL                  tablas, RPC, funciones, vistas y RLS
```

### UI y composición

- `components/app-shell.tsx` decide qué vista mostrar según el rol autenticado:
  - `AdminView` para administradores.
  - `ServiceWorkspace` para colaboradores y presupuestadores.
  - `ClientPortal` para clientes.
- Los componentes con estado, hooks o handlers del navegador deben declarar `"use client"`.
- Mantener la accesibilidad existente: etiquetas, `aria-*`, foco, teclado, contraste y estados de carga/error.
- Reutilizar primero los componentes de `components/ui/`, `lib/utils.ts` y los patrones de estilo existentes.

### Estado cliente

- `lib/store.tsx` contiene el contexto global y coordina usuarios, órdenes, estados y acciones de UI.
- La creación de órdenes usa actualización optimista: se muestra un ID temporal, se persiste en servidor y se revierte si falla.
- Al cambiar o invalidar órdenes, respetar el ciclo de caché de `lib/order-cache.ts` y llamar a las funciones de revalidación correspondientes.
- No hacer que el store sea una segunda capa de persistencia: los datos definitivos deben venir de las acciones/queries server-side.
- Usar `new Date().toISOString()` para timestamps nuevos.

### Server Actions y acceso a datos

- Los archivos de `app/actions/` usan `"use server"` y son la frontera de confianza.
- Toda acción que lea o modifique datos privados debe obtener la sesión mediante `getSessionAction()` y comprobar `active` y el rol necesario.
- Validar y normalizar entradas en servidor aunque ya hayan sido validadas en la UI. Para texto, seguir el patrón de `trim`; para emails, normalizar a minúsculas; para enums, validar contra valores permitidos.
- Devolver resultados explícitos y seguros, normalmente `{ success: boolean, error?: string }`; no enviar stack traces, claves ni datos sensibles al cliente.
- `getSupabaseClient()` es para el cliente público. `getSupabaseServerClient()` usa `SUPABASE_SERVICE_ROLE_KEY` y solo puede importarse desde código server-side.
- Las funciones de `lib/queries/` no deben importarse desde componentes cliente si usan el cliente server-side.
- Preferir consultas parametrizadas de Supabase/RPC. Escapar correctamente filtros de búsqueda y evitar interpolar SQL o permisos desde entrada del usuario.

## Modelo de dominio y flujo de órdenes

La fuente de verdad de los tipos compartidos es `lib/types.ts`. Reutilizar sus tipos y helpers antes de crear interfaces duplicadas.

Una orden (`Order`) combina:

- cliente registrado (`clientId`) o cliente ocasional (`clientId: null`),
- código único, datos del equipo y falla,
- estado y asignación,
- items de presupuesto,
- historial (`timeline`),
- notificaciones.

El flujo principal para crear una orden es:

```text
formulario → lib/store.tsx:addOrder()
→ app/actions/orders.ts:createOrderAction()
→ lib/queries/orders-server.ts:insertOrderServer()
→ RPC create_order_with_code
→ timeline_events y notifications
→ orden persistida devuelta al store
```

Al tocar este flujo:

- Mantener la identidad del cliente fijada en la Server Action; no confiar en un `clientId` enviado por el navegador cuando la sesión es de cliente.
- Validar `deviceType` contra los valores definidos en `DeviceType`.
- Recordar que los clientes ocasionales pueden tener `clientId = null`.
- No modificar directamente el estado local sin persistir la operación correspondiente.
- Los cambios de estado deben conservar el historial y las notificaciones cuando el caso de uso lo requiera; revisar las funciones remotas en `lib/queries/orders.ts`.
- Respetar `FINAL_ORDER_STATUS` y `PROTECTED_ORDER_STATE_POSITIONS`. Los estados protegidos forman parte del contrato del flujo.
- Los códigos usan formatos globales `CP`, `CC` o `CO` con fecha y contador. Para búsquedas, reutilizar la normalización existente en las queries; no implementar comparaciones ad hoc.
- Los montos están expresados en ARS y deben manejarse como números en el dominio; usar `formatCurrency` para presentación.

## Autorización por rol

La autorización no debe depender solo de ocultar botones en React. Debe comprobarse en cada Server Action y query server-side.

- Cliente: solo sus órdenes; puede consultar tickets ocasionales por el endpoint público restringido.
- Colaborador: órdenes disponibles y órdenes asignadas a su identidad operativa.
- Presupuestador: órdenes del flujo de presupuesto autorizadas para ese usuario.
- Admin: operaciones administrativas y órdenes permitidas por las reglas de negocio.

Al cambiar una regla de visibilidad, revisar conjuntamente:

1. la vista/componente,
2. la Server Action,
3. la query server-side,
4. las políticas/RPC de Supabase,
5. las pruebas manuales con cada rol afectado.

## Base de datos y migraciones

Áreas principales de `database/`:

- `schema.sql`: esquema base y referencia de inicialización.
- `migrations/`: cambios incrementales numerados; revisar la secuencia completa antes de crear una nueva.
- `SCHEMA_DOCUMENTATION.md`, `ER_DIAGRAM.md` y `QUERIES_GUIDE.md`: documentación y consultas de referencia.
- `scripts/setup-database.mjs`: intento de inicialización por RPC; si las RPC administrativas no existen, el script indica ejecutar el SQL manualmente en Supabase.

Reglas para cambios SQL:

1. Crear una migración nueva, numerada y con nombre descriptivo en `database/migrations/`.
2. Hacerla idempotente cuando sea razonable (`IF EXISTS`/`IF NOT EXISTS`) y preservar datos existentes.
3. Revisar claves foráneas, índices, restricciones, funciones, vistas, RLS y compatibilidad con datos históricos.
4. Actualizar `lib/types.ts` y las transformaciones `rowTo*` si cambia el contrato de datos.
5. Actualizar la documentación SQL afectada.
6. Probar la migración en una base de datos de desarrollo antes de aplicarla en producción.
7. No editar `schema.sql` como sustituto silencioso de una migración sobre una base ya existente. Si se modifica la instalación base, explicar cómo se mantiene alineada con las migraciones.

El historial de `timeline_events` es auditable: no borrar ni editar eventos existentes sin una justificación explícita de negocio. Las órdenes ocasionales y las relaciones con empresas tienen casos `NULL` que deben conservarse.

La documentación en `database/` contiene ejemplos históricos (por ejemplo, roles o formatos de código antiguos). Antes de copiar un ejemplo, verificar nombres y contratos contra el esquema/migraciones actuales y `lib/types.ts`.

## Seguridad y privacidad

- No exponer `SUPABASE_SERVICE_ROLE_KEY` ni usarla desde componentes cliente.
- No guardar contraseñas en texto plano; el código actual usa `bcryptjs`.
- No confiar en el rol, `userId`, `companyId` o `assignedTo` enviados por el navegador.
- No devolver información de otros clientes desde búsquedas, detalles o tickets públicos.
- Evitar registrar emails completos, tokens, hashes, cookies de sesión o payloads sensibles.
- Revisar RLS y permisos de RPC cuando se cambie el modelo de acceso; el service role puede saltarse RLS, por lo que la autorización de la aplicación es obligatoria.
- Validar límites, formatos, valores vacíos y entradas manipuladas antes de consultar o mutar datos.

## Convenciones de implementación

- Mantener TypeScript estricto y los tipos centralizados.
- Usar nombres descriptivos y cambios pequeños; no introducir abstracciones o patrones innecesarios.
- Mantener el estilo existente: componentes funcionales, hooks de React, imports con `@/` y clases Tailwind.
- No cambiar contratos públicos ni formatos de respuesta sin actualizar todos sus consumidores.
- Separar transformación de filas de Supabase (`snake_case`) del modelo de UI (`camelCase`).
- Manejar estados de carga, vacío, error y rollback en operaciones asíncronas.
- Para cambios visuales, verificar responsive, teclado, lector de pantalla y feedback de acciones.

## Checklist de validación

Antes de entregar cambios:

- [ ] Revisé `lib/types.ts` y las acciones/queries relacionadas.
- [ ] Confirmé autorización y alcance de datos para cada rol afectado.
- [ ] Validé entradas en el servidor y contemplé errores y valores límite.
- [ ] Si cambié órdenes, revisé caché, timeline, notificaciones y rollback optimista.
- [ ] Si cambié SQL, añadí migración y actualicé tipos/documentación.
- [ ] Ejecuté `pnpm lint`.
- [ ] Ejecuté `pnpm build` o documenté por qué no fue posible.
- [ ] Probé manualmente el flujo modificado con las credenciales/roles de desarrollo disponibles, sin documentar secretos.

Para investigar un fallo, seguir el dato desde el componente hacia `lib/store.tsx`, la Server Action, la query y finalmente Supabase; no corregir solo el síntoma visual sin verificar la persistencia y autorización.

