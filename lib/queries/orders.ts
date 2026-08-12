import { getSupabaseClient } from "@/lib/supabase"
import type { OrderStatus, BudgetItem, TimelineEvent, AppNotification, OrderDetailsInput } from "@/lib/types"

/**
 * Mapea un budget_item de snake_case a camelCase
 */
function rowToBudgetItem(row: any): BudgetItem {
  return {
    id: row.id,
    description: row.description,
    amount: parseFloat(row.amount),
  }
}

/**
 * Mapea un timeline_event de snake_case a camelCase
 */
function rowToTimelineEvent(row: any): TimelineEvent {
  return {
    id: row.id,
    status: row.status as OrderStatus,
    note: row.note,
    date: row.event_date,
  }
}

/**
 * Mapea una notification de snake_case a camelCase
 */
function rowToNotification(row: any): AppNotification {
  return {
    id: row.id,
    message: row.message,
    date: row.notification_date,
    read: row.read,
  }
}


/**
 * Actualiza el estado de una orden y agrega un evento de timeline + notificación
 */
export async function updateOrderStatusRemote(
  orderId: string,
  status: OrderStatus,
  statusLabel: string,
  note?: string
): Promise<boolean> {
  const supabase = getSupabaseClient()
  try {
    const now = new Date().toISOString()

    // 1. Actualizar el status de la orden
    const { error: updateError } = await supabase
      .from("orders")
      .update({ status, updated_at: now })
      .eq("id", orderId)

    if (updateError) {
      console.error("Error updating order status:", updateError)
      return false
    }

    // 2. Crear evento de timeline
    const { error: timelineError } = await supabase.from("timeline_events").insert({
      order_id: orderId,
      status,
      note,
      event_date: now,
    })

    if (timelineError) {
      console.error("Error inserting timeline event:", timelineError)
    }

    // 3. Crear notificación
    const message = `Estado actualizado: ${statusLabel}.${note ? ` ${note}` : ""}`
    const { error: notifError } = await supabase.from("notifications").insert({
      order_id: orderId,
      message,
      notification_date: now,
      read: false,
    })

    if (notifError) {
      console.error("Error inserting notification:", notifError)
    }

    return true
  } catch (error) {
    console.error("Error in updateOrderStatusRemote:", error)
    return false
  }
}

/**
 * Reasigna una orden a otro empleado y crea una notificación
 */
export async function updateOrderAssigneeRemote(
  orderId: string,
  newAssignee: string
): Promise<boolean> {
  const supabase = getSupabaseClient()
  try {
    const now = new Date().toISOString()

    // 1. Actualizar el asignado
    const { error: updateError } = await supabase
      .from("orders")
      .update({ assigned_to: newAssignee, updated_at: now })
      .eq("id", orderId)

    if (updateError) {
      console.error("Error updating order assignee:", updateError)
      return false
    }

    // 2. Crear notificación
    const { error: notifError } = await supabase.from("notifications").insert({
      order_id: orderId,
      message: `Tu pedido ha sido reasignado a ${newAssignee}.`,
      notification_date: now,
      read: false,
    })

    if (notifError) {
      console.error("Error inserting reassignment notification:", notifError)
    }

    return true
  } catch (error) {
    console.error("Error in updateOrderAssigneeRemote:", error)
    return false
  }
}

/**
 * Actualiza los datos de reparación de una orden sin modificar información del cliente.
 */
export async function updateOrderDetailsRemote(orderId: string, input: OrderDetailsInput): Promise<boolean> {
  const supabase = getSupabaseClient()
  try {
    const { error } = await supabase
      .from("orders")
      .update({
        device_type: input.deviceType,
        device_brand: input.deviceBrand,
        device_model: input.deviceModel,
        device_serial: input.deviceSerial,
        fault: input.fault,
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId)

    if (error) {
      console.error("Error updating order details:", error)
      return false
    }

    return true
  } catch (error) {
    console.error("Error in updateOrderDetailsRemote:", error)
    return false
  }
}

/**
 * Agrega un item de presupuesto a una orden
 */
export async function insertBudgetItemRemote(
  orderId: string,
  description: string,
  amount: number
): Promise<BudgetItem | null> {
  const supabase = getSupabaseClient()
  try {
    const { data, error } = await supabase
      .from("budget_items")
      .insert({
        order_id: orderId,
        description,
        amount,
      })
      .select()
      .single()

    if (error || !data) {
      console.error("Error inserting budget item:", error)
      return null
    }

    return rowToBudgetItem(data)
  } catch (error) {
    console.error("Error in insertBudgetItemRemote:", error)
    return null
  }
}

/**
 * Elimina un item de presupuesto
 */
export async function deleteBudgetItemRemote(itemId: string): Promise<boolean> {
  const supabase = getSupabaseClient()
  try {
    const { error } = await supabase.from("budget_items").delete().eq("id", itemId)

    if (error) {
      console.error("Error deleting budget item:", error)
      return false
    }

    return true
  } catch (error) {
    console.error("Error in deleteBudgetItemRemote:", error)
    return false
  }
}

/**
 * Crea una notificación para una orden
 */
export async function insertNotificationRemote(
  orderId: string,
  message: string
): Promise<AppNotification | null> {
  const supabase = getSupabaseClient()
  try {
    const now = new Date().toISOString()

    const { data, error } = await supabase
      .from("notifications")
      .insert({
        order_id: orderId,
        message,
        notification_date: now,
        read: false,
      })
      .select()
      .single()

    if (error || !data) {
      console.error("Error inserting notification:", error)
      return null
    }

    return rowToNotification(data)
  } catch (error) {
    console.error("Error in insertNotificationRemote:", error)
    return null
  }
}



