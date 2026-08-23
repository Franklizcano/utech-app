-- Elimina la protección específica de PostgreSQL.
-- Las reglas de estados protegidos se validan en la capa de aplicación
-- para mantener la lógica independiente del motor de base de datos.

DROP TRIGGER IF EXISTS protect_order_state_structure ON order_states;
DROP FUNCTION IF EXISTS prevent_order_state_structure_changes();

