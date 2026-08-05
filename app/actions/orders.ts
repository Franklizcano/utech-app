"use server"

import { getSessionAction } from "@/app/actions/auth"
import { getSupabaseServerClient } from "@/lib/supabase"
import { fetchOrdersForUser } from "@/lib/queries/orders-server"

export async function fetchOrdersAction() {
  const session = await getSessionAction()
  if (!session || !session.active) {
    return []
  }

  return fetchOrdersForUser(session.id, session.role, session.name)
}

export async function markNotificationsReadAction(orderId: string): Promise<boolean> {
  if (!orderId) return false

  const session = await getSessionAction()
  if (!session || !session.active) return false

  const supabase = getSupabaseServerClient()
  let orderQuery = supabase.from("orders").select("id").eq("id", orderId)

  if (session.role === "cliente") {
    orderQuery = orderQuery.eq("client_id", session.id)
  } else if (session.role !== "admin" && session.role !== "colaborador") {
    return false
  }

  const { data: order, error: orderError } = await orderQuery.maybeSingle()
  if (orderError || !order) return false

  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("order_id", order.id)
    .eq("read", false)

  if (error) {
    console.error("Error al marcar notificaciones como leídas:", error.message)
    return false
  }

  return true
}

