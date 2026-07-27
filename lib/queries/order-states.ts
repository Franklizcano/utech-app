import { getSupabaseClient } from "@/lib/supabase"
import type { OrderState } from "@/lib/types"

/**
 * Trae todos los estados de orden desde Supabase, ordenados por posición.
 */
export async function fetchOrderStates(): Promise<OrderState[]> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from("order_states")
    .select("id, label, color, position")
    .order("position", { ascending: true })

  if (error) {
    console.error("Error al traer order_states:", error.message)
    return []
  }

  return data ?? []
}

/**
 * Inserta un nuevo estado de orden en Supabase.
 */
export async function insertOrderState(state: OrderState): Promise<OrderState | null> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from("order_states")
    .insert({ id: state.id, label: state.label, color: state.color, position: state.position })
    .select("id, label, color, position")
    .single()

  if (error) {
    console.error("Error al crear order_state:", error.message)
    return null
  }

  return data
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
 * Elimina un estado de orden. Puede fallar si hay órdenes que lo referencian (FK).
 */
export async function deleteOrderStateRemote(id: string): Promise<boolean> {
  const supabase = getSupabaseClient()
  const { error } = await supabase.from("order_states").delete().eq("id", id)

  if (error) {
    console.error("Error al eliminar order_state:", error.message)
    return false
  }

  return true
}

/**
 * Actualiza la posición de múltiples estados (para reordenar el flujo).
 */
export async function reorderOrderStatesRemote(states: { id: string; position: number }[]): Promise<boolean> {
  const supabase = getSupabaseClient()
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

