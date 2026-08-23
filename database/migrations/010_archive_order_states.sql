-- Archivado reversible de estados de órdenes.
-- Los estados históricos no se eliminan porque orders y timeline_events los referencian.

ALTER TABLE order_states
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE order_states
  DROP CONSTRAINT IF EXISTS order_states_position_key;

CREATE UNIQUE INDEX IF NOT EXISTS idx_order_states_active_position_unique
  ON order_states (position)
  WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_order_states_active
  ON order_states (is_active);

-- Normaliza y reactiva los estados que forman parte del flujo obligatorio.
UPDATE order_states
SET position = -100 - position,
    is_active = TRUE
WHERE id IN (
  'recibido', 'pendiente_presupuesto', 'presupuesto_enviado',
  'presupuesto_aprobado', 'presupuesto_rechazado', 'entregado'
);

UPDATE order_states AS state
SET position = protected.position,
    is_active = TRUE,
    updated_at = CURRENT_TIMESTAMP
FROM (VALUES
  ('recibido', 0),
  ('pendiente_presupuesto', 5),
  ('presupuesto_enviado', 6),
  ('presupuesto_aprobado', 7),
  ('presupuesto_rechazado', 8),
  ('entregado', 9)
) AS protected(id, position)
WHERE state.id = protected.id;

CREATE OR REPLACE FUNCTION prevent_order_state_structure_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  expected_position INTEGER;
BEGIN
  expected_position := CASE NEW.id
    WHEN 'recibido' THEN 0
    WHEN 'pendiente_presupuesto' THEN 5
    WHEN 'presupuesto_enviado' THEN 6
    WHEN 'presupuesto_aprobado' THEN 7
    WHEN 'presupuesto_rechazado' THEN 8
    WHEN 'entregado' THEN 9
    ELSE NULL
  END;

  IF expected_position IS NOT NULL THEN
    IF NEW.is_active = FALSE THEN
      RAISE EXCEPTION 'El estado estructural % no puede archivarse', NEW.id;
    END IF;

    -- Durante el reordenamiento se usan posiciones negativas temporales.
    IF NEW.position >= 0 AND NEW.position <> expected_position THEN
      RAISE EXCEPTION 'El estado estructural % debe conservar la posición %', NEW.id, expected_position;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_order_state_structure ON order_states;
CREATE TRIGGER protect_order_state_structure
BEFORE UPDATE OF position, is_active ON order_states
FOR EACH ROW
EXECUTE FUNCTION prevent_order_state_structure_changes();




