-- ============================================
-- MIGRACIÓN: Agregar campo password_hash a la tabla users
-- Ejecutar en Supabase Dashboard → SQL Editor
-- ============================================

-- 1. Agregar columna password_hash
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT NOT NULL DEFAULT '';

-- 2. (Opcional) Deshabilitar RLS temporalmente para poder hacer queries desde la app
--    Si querés mantener las políticas de seguridad, comentá estas líneas
--    y configurá las políticas según tu necesidad.
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE budget_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE timeline_events DISABLE ROW LEVEL SECURITY;
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;

-- 3. IMPORTANTE: Después de ejecutar esta migración, necesitás generar hashes
--    reales para los usuarios existentes.
--
--    Pasos:
--    a) Arrancá tu app: npm run dev
--    b) Generá un hash con:
--       curl -X POST http://localhost:3000/api/hash-password -H "Content-Type: application/json" -d '{"password":"tu-password"}'
--    c) Usá el hash generado para actualizar los usuarios:
--       UPDATE users SET password_hash = 'EL_HASH_GENERADO' WHERE email = 'lucia@tecnofix.com';
--       UPDATE users SET password_hash = 'EL_HASH_GENERADO' WHERE email = 'martin@tecnofix.com';
--       ... (repetir para cada usuario)

