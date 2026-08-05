import { getSupabaseServerClient } from "@/lib/supabase"
import type { AppNotification, BudgetItem, Order, OrderStatus, TimelineEvent, Role } from "@/lib/types"

function rowToBudgetItem(row: Record<string, unknown>): BudgetItem {
  return {
    id: row.id as string,
    description: row.description as string,
    amount: Number(row.amount),
  }
}

function rowToTimelineEvent(row: Record<string, unknown>): TimelineEvent {
  return {
    id: row.id as string,
    status: row.status as OrderStatus,
    note: (row.note as string | null) ?? undefined,
    date: row.event_date as string,
  }
}

function rowToNotification(row: Record<string, unknown>): AppNotification {
  return {
    id: row.id as string,
    message: row.message as string,
    date: row.notification_date as string,
    read: row.read as boolean,
  }
}

function rowToOrder(row: Record<string, unknown>): Order {
  return {
    id: row.id as string,
    code: row.code as string,
    clientId: (row.client_id as string | null) ?? null,
    clientName: row.client_name as string,
    clientPhone: row.client_phone as string,
    clientEmail: row.client_email as string,
    deviceType: row.device_type as Order["deviceType"],
    deviceBrand: row.device_brand as string,
    deviceModel: row.device_model as string,
    fault: row.fault as string,
    status: row.status as OrderStatus,
    assignedTo: row.assigned_to as string,
    budget: [],
    timeline: [],
    notifications: [],
    createdAt: row.created_at as string,
  }
}

/**
 * Obtiene únicamente las órdenes permitidas para la sesión autenticada.
 * Esta función solo debe importarse desde Server Actions o código server-side.
 */
export async function fetchOrdersForUser(userId: string, role: Role, assignedTo?: string): Promise<Order[]> {
  if (!userId || !["admin", "colaborador", "cliente"].includes(role)) {
    return []
  }

  const supabase = getSupabaseServerClient()
  let ordersQuery = supabase.from("orders").select("*").order("created_at", { ascending: false })

  if (role === "cliente") {
    ordersQuery = ordersQuery.eq("client_id", userId)
  } else if (role === "colaborador") {
    if (!assignedTo) return []

    const lastMonth = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    ordersQuery = ordersQuery.eq("assigned_to", assignedTo).gte("updated_at", lastMonth)
  }

  const { data: ordersData, error: ordersError } = await ordersQuery

  if (ordersError) {
    console.error("Error al traer órdenes autorizadas:", ordersError.message)
    throw new Error("No se pudieron cargar las órdenes.")
  }

  if (!ordersData?.length) return []

  const orderIds = ordersData.map((row) => row.id as string)
  const [budgetResult, timelineResult, notificationsResult] = await Promise.all([
    supabase.from("budget_items").select("*").in("order_id", orderIds),
    supabase.from("timeline_events").select("*").in("order_id", orderIds).order("event_date", { ascending: true }),
    supabase
      .from("notifications")
      .select("*")
      .in("order_id", orderIds)
      .order("notification_date", { ascending: true }),
  ])

  if (budgetResult.error || timelineResult.error || notificationsResult.error) {
    console.error("Error al traer relaciones de órdenes autorizadas:", {
      budget: budgetResult.error?.message,
      timeline: timelineResult.error?.message,
      notifications: notificationsResult.error?.message,
    })
    throw new Error("No se pudieron cargar los detalles de las órdenes.")
  }

  const budgets = new Map<string, BudgetItem[]>()
  const timelines = new Map<string, TimelineEvent[]>()
  const notifications = new Map<string, AppNotification[]>()

  for (const row of budgetResult.data ?? []) {
    const orderId = row.order_id as string
    const items = budgets.get(orderId) ?? []
    items.push(rowToBudgetItem(row))
    budgets.set(orderId, items)
  }

  for (const row of timelineResult.data ?? []) {
    const orderId = row.order_id as string
    const events = timelines.get(orderId) ?? []
    events.push(rowToTimelineEvent(row))
    timelines.set(orderId, events)
  }

  for (const row of notificationsResult.data ?? []) {
    const orderId = row.order_id as string
    const items = notifications.get(orderId) ?? []
    items.push(rowToNotification(row))
    notifications.set(orderId, items)
  }

  return ordersData.map((row) => {
    const order = rowToOrder(row)
    order.budget = budgets.get(order.id) ?? []
    order.timeline = timelines.get(order.id) ?? []
    order.notifications = notifications.get(order.id) ?? []
    return order
  })
}

