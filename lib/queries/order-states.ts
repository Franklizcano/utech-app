import { getSupabaseClient } from "@/lib/supabase"
import { isProtectedOrderState, PROTECTED_ORDER_STATE_POSITIONS, type OrderState } from "@/lib/types"

/**
 * Trae todos los estados de orden desde Supabase, ordenados por posición.
 */
export async function fetchOrderStates(): Promise<OrderState[]> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from("order_states")
    .select("id, label, color, position, is_active")
    .eq("is_active", true)
    .order("position", { ascending: true })

  if (error) {
    console.error("Error al traer order_states:", error.message)
    return []
  }

  return (data ?? []).map((state) => ({ ...state, isActive: state.is_active }))
}

export async function fetchArchivedOrderStates(): Promise<OrderState[]> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from("order_states")
    .select("id, label, color, position, is_active")
    .eq("is_active", false)
    .order("label", { ascending: true })

  if (error) {
    console.error("Error al traer estados archivados:", error.message)
    return []
  }

  return (data ?? []).map((state) => ({ ...state, isActive: state.is_active }))
}

/**
 * Inserta un nuevo estado de orden en Supabase.
 */
export async function insertOrderState(state: OrderState): Promise<OrderState | null> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from("order_states")
    .insert({ id: state.id, label: state.label, color: state.color, position: state.position, is_active: true })
    .select("id, label, color, position, is_active")
    .single()

  if (error) {
    console.error("Error al crear order_state:", error.message)
    return null
  }

  return { ...data, isActive: data.is_active }
}

/**
 * Actualiza el label y color de un estado existente.
 */
export async function updateOrderStateRemote(id: string, label: string, color: string): Promise<boolean> {
  const supabase = getSupabaseClient()
  const { error } = await supabase
    .from("order_states")
    .update({ label, color, updated_at: new Date().toISOString() })
    .eq("id", id)

  if (error) {
    console.error("Error al actualizar order_state:", error.message)
    return false
  }

  return true
}

/**
 * Archiva un estado para conservar sus referencias históricas.
 */
export async function deleteOrderStateRemote(id: string): Promise<{ success: boolean; error?: string }> {
  if (isProtectedOrderState(id)) {
    return { success: false, error: "Este estado es estructural y no puede archivarse." }
  }

  const supabase = getSupabaseClient()
  const { error } = await supabase
    .from("order_states")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("id", id)

  if (error) {
    console.error("Error al archivar order_state:", error.message)
    return { success: false, error: "No se pudo archivar el estado." }
  }

  return { success: true }
}

export async function restoreOrderStateRemote(id: string): Promise<{ success: boolean; error?: string }> {
  if (isProtectedOrderState(id)) {
    return { success: false, error: "Este estado estructural no puede restaurarse porque no puede archivarse." }
  }

  const supabase = getSupabaseClient()
  const { data: highestState, error: highestStateError } = await supabase
    .from("order_states")
    .select("position")
    .eq("is_active", true)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (highestStateError) return { success: false, error: "No se pudo calcular la posición del estado." }

  const { error } = await supabase
    .from("order_states")
    .update({ is_active: true, position: (highestState?.position ?? -1) + 1, updated_at: new Date().toISOString() })
    .eq("id", id)

  if (error) {
    console.error("Error al restaurar order_state:", error.message)
    return { success: false, error: "No se pudo restaurar el estado." }
  }

  return { success: true }
}

/**
 * Actualiza la posición de múltiples estados (para reordenar el flujo).
 */
export async function reorderOrderStatesRemote(states: { id: string; position: number }[]): Promise<boolean> {
  const protectedStatePositionsAreValid = Object.entries(PROTECTED_ORDER_STATE_POSITIONS).every(([id, position]) =>
    states.some((state) => state.id === id && state.position === position),
  )

  if (!protectedStatePositionsAreValid) {
    console.error("No se pueden cambiar las posiciones de los estados estructurales.")
    return false
  }

  const supabase = getSupabaseClient()
  const temporaryResults = await Promise.all(
    states.map(({ id }, index) => supabase.from("order_states").update({ position: -(index + 1) }).eq("id", id)),
  )

  if (temporaryResults.some((result) => result.error)) {
    console.error("Error al preparar el reordenamiento de order_states")
    return false
  }

  const results = await Promise.all(
    states.map(({ id, position }) => supabase.from("order_states").update({ position }).eq("id", id)),
  )

  const hasError = results.some((r) => r.error)
  if (hasError) {
    console.error("Error al reordenar order_states")
    return false
  }

  return true
}

