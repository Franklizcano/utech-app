-- Ajusta la protección de estados para que solo sean estructurales
-- el inicio, el flujo de presupuesto y el estado final.
-- Las etapas operativas del taller quedan configurables.

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

    -- El reordenamiento utiliza posiciones negativas de forma temporal.
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

