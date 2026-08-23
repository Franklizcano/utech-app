-- ============================================
-- MIGRACIÓN: Órdenes creadas por clientes y buzón de colaboradores
-- Ejecutar en Supabase Dashboard → SQL Editor
-- ============================================

-- Las órdenes creadas por clientes permanecen sin técnico hasta ser tomadas.
ALTER TABLE orders
  ALTER COLUMN assigned_to DROP NOT NULL;

-- Índice para cargar rápidamente el buzón de órdenes disponibles.
CREATE INDEX IF NOT EXISTS idx_orders_unassigned
  ON orders(created_at DESC)
  WHERE assigned_to IS NULL;

