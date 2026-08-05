import { customAlphabet } from "nanoid"
import { getSupabaseClient } from "@/lib/supabase"
import type { Order, OrderStatus, BudgetItem, TimelineEvent, AppNotification, OrderDetailsInput } from "@/lib/types"
import { formatOrderCode } from "@/lib/utils"

/**
 * Mapea una fila de la base de datos (snake_case) a un objeto Order (camelCase)
 */
function rowToOrder(row: any): Order {
  return {
    id: row.id,
    code: row.code,
    clientId: row.client_id,
    clientName: row.client_name,
    clientPhone: row.client_phone,
    clientEmail: row.client_email,
    deviceType: row.device_type,
    deviceBrand: row.device_brand,
    deviceModel: row.device_model,
    fault: row.fault,
    status: row.status as OrderStatus,
    assignedTo: row.assigned_to,
    budget: row.budget_items || [],
    timeline: row.timeline_events || [],
    notifications: row.notifications || [],
    createdAt: row.created_at,
  }
}

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
 * Genera un código de orden único usando nanoid.
 * Formato: TF-XXXXX (ej: TF-K7M9P)
 * Usa un alfabeto alfanumérico en mayúsculas sin caracteres ambiguos (0, O, I, 1)
 */
export function generateOrderCode(): string {
  const nanoidGenerator = customAlphabet("23456789ABCDEFGHJKLMNPQRSTUVWXYZ", 8)
  const id = nanoidGenerator()
  // Formatear con guion: TF-XXXXX
  return formatOrderCode(`TF${id}`)
}

/**
 * Crea una nueva orden en la base de datos.
 * Incluye el evento inicial de timeline y la notificación inicial.
 * Reintentos automáticos en caso de colisión de código (23505).
 */
export async function insertOrderRemote(input: {
  clientId: string | null
  clientName: string
  clientPhone: string
  clientEmail: string
  deviceType: string
  deviceBrand: string
  deviceModel: string
  fault: string
  assignedTo: string
}): Promise<Order | null> {
  const supabase = getSupabaseClient()
  const maxRetries = 5

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const code = generateOrderCode()
      const now = new Date().toISOString()

      // 1. Crear la orden
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .insert({
          code,
          client_id: input.clientId || null,
          client_name: input.clientName,
          client_phone: input.clientPhone,
          client_email: input.clientEmail,
          device_type: input.deviceType,
          device_brand: input.deviceBrand,
          device_model: input.deviceModel,
          fault: input.fault,
          status: "recibido",
          assigned_to: input.assignedTo,
        })
        .select()
        .single()

      // Reintentar si hay conflicto de código único (23505)
      if (orderError?.code === "23505" && attempt < maxRetries - 1) {
        console.warn(`Conflicto de código de orden (intento ${attempt + 1}/${maxRetries}), reintentando...`)
        continue
      }

      if (orderError || !orderData) {
        console.error("Error inserting order:", orderError)
        return null
      }

      const orderId = orderData.id

      // 2. Crear el evento inicial de timeline
      const { error: timelineError } = await supabase.from("timeline_events").insert({
        order_id: orderId,
        status: "recibido",
        note: "Equipo ingresado en el sistema.",
        event_date: now,
      })

      if (timelineError) {
        console.error("Error inserting initial timeline event:", timelineError)
      }

      // 3. Crear la notificación inicial
      const { error: notifError } = await supabase.from("notifications").insert({
        order_id: orderId,
        message: `Recibimos tu equipo (${input.deviceBrand} ${input.deviceModel}). Te mantendremos al tanto.`,
        notification_date: now,
        read: false,
      })

      if (notifError) {
        console.error("Error inserting initial notification:", notifError)
      }

      // 4. Recargar la orden completa con todas sus relaciones
      const [timelineResult, notifResult] = await Promise.all([
        supabase.from("timeline_events").select("*").eq("order_id", orderId).order("event_date", { ascending: true }),
        supabase.from("notifications").select("*").eq("order_id", orderId).order("notification_date", { ascending: true }),
      ])

      const order = rowToOrder(orderData)
      order.budget = []
      order.timeline = timelineResult.data?.map(rowToTimelineEvent) || []
      order.notifications = notifResult.data?.map(rowToNotification) || []

      return order
    } catch (error) {
      console.error("Error in insertOrderRemote:", error)
      if (attempt === maxRetries - 1) {
        return null
      }
    }
  }

  return null
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



