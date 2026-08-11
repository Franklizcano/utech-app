import { getSupabaseServerClient } from "@/lib/supabase"
import { FINAL_ORDER_STATUS, type AppNotification, type BudgetItem, type OccasionalTicketStatus, type Order, type OrderCreationInput, type OrderStatus, type TimelineEvent, type Role } from "@/lib/types"
import { formatOrderCode } from "@/lib/utils"
import { customAlphabet } from "nanoid"

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
    assignedTo: (row.assigned_to as string | null) ?? null,
    budget: [],
    timeline: [],
    notifications: [],
    createdAt: row.created_at as string,
  }
}

async function hydrateOrders(
  ordersData: Array<Record<string, unknown>>,
  supabase: ReturnType<typeof getSupabaseServerClient>,
): Promise<Order[]> {
  if (!ordersData.length) return []

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

function generateOrderCode(): string {
  const alphabet = customAlphabet("23456789ABCDEFGHJKLMNPQRSTUVWXYZ", 8)
  return formatOrderCode(`TF${alphabet()}`)
}

/**
 * Crea una orden usando el cliente server-side y devuelve sus datos iniciales.
 * La identidad del cliente debe ser fijada por la Server Action que llama a esta función.
 */
export async function insertOrderServer(input: OrderCreationInput): Promise<Order | null> {
  const supabase = getSupabaseServerClient()
  const maxRetries = 5

  for (let attempt = 0; attempt < maxRetries; attempt += 1) {
    const now = new Date().toISOString()
    const { data: orderData, error: orderError } = await supabase
      .from("orders")
      .insert({
        code: generateOrderCode(),
        client_id: input.clientId,
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

    if (orderError?.code === "23505" && attempt < maxRetries - 1) continue
    if (orderError || !orderData) {
      console.error("Error al crear la orden desde el servidor:", orderError?.message)
      return null
    }

    const orderId = orderData.id as string
    const [timelineResult, notificationResult] = await Promise.all([
      supabase.from("timeline_events").insert({
        order_id: orderId,
        status: "recibido",
        note: "Equipo ingresado en el sistema.",
        event_date: now,
      }),
      supabase.from("notifications").insert({
        order_id: orderId,
        message: `Recibimos tu equipo (${input.deviceBrand} ${input.deviceModel}). Te mantendremos al tanto.`,
        notification_date: now,
        read: false,
      }),
    ])

    if (timelineResult.error || notificationResult.error) {
      console.error("Error al crear los detalles iniciales de la orden:", {
        timeline: timelineResult.error?.message,
        notification: notificationResult.error?.message,
      })
    }

    const [timeline, notifications] = await Promise.all([
      supabase.from("timeline_events").select("*").eq("order_id", orderId).order("event_date", { ascending: true }),
      supabase.from("notifications").select("*").eq("order_id", orderId).order("notification_date", { ascending: true }),
    ])

    const order = rowToOrder(orderData)
    order.timeline = (timeline.data ?? []).map(rowToTimelineEvent)
    order.notifications = (notifications.data ?? []).map(rowToNotification)
    return order
  }

  return null
}

/**
 * Asigna una orden disponible al colaborador actual sin permitir que dos colaboradores
 * tomen la misma orden simultáneamente.
 */
export async function claimOrderServer(orderId: string, assignee: string): Promise<boolean> {
  if (!orderId || !assignee.trim()) return false

  const supabase = getSupabaseServerClient()
  const now = new Date().toISOString()
  const { data: order, error } = await supabase
    .from("orders")
    .update({ assigned_to: assignee.trim(), updated_at: now })
    .eq("id", orderId)
    .is("assigned_to", null)
    .not("client_id", "is", null)
    .select("id")
    .maybeSingle()

  if (error || !order) {
    if (error) console.error("Error al tomar la orden:", error.message)
    return false
  }

  const { error: notificationError } = await supabase.from("notifications").insert({
    order_id: order.id,
    message: `Tu orden fue tomada por ${assignee.trim()}.`,
    notification_date: now,
    read: false,
  })

  if (notificationError) {
    console.error("Error al notificar la asignación de la orden:", notificationError.message)
  }

  return true
}

export async function fetchAvailableOrdersForCollaborator(): Promise<Order[]> {
  const supabase = getSupabaseServerClient()
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .is("assigned_to", null)
    .not("client_id", "is", null)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error al traer órdenes disponibles:", error.message)
    throw new Error("No se pudieron cargar las órdenes disponibles.")
  }

  return hydrateOrders((data ?? []) as Array<Record<string, unknown>>, supabase)
}

/**
 * Busca el estado público de un ticket perteneciente a un cliente ocasional.
 * Nunca devuelve órdenes asociadas a usuarios registrados ni datos sensibles.
 */
export async function fetchOccasionalTicketStatus(code: string): Promise<OccasionalTicketStatus | null> {
  const normalizedCode = formatOrderCode(code.trim())
  if (!normalizedCode) return null

  const supabase = getSupabaseServerClient()
  const { data, error } = await supabase
    .from("orders")
    .select("code, status")
    .eq("code", normalizedCode)
    .is("client_id", null)
    .maybeSingle()

  if (error) {
    console.error("Error al consultar el estado público del ticket:", error.message)
    throw new Error("No se pudo consultar el ticket.")
  }

  if (!data) return null

  return {
    code: data.code as string,
    status: data.status as OrderStatus,
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
  } else if (role === "admin") {
    ordersQuery = ordersQuery.not("assigned_to", "is", null).neq("status", FINAL_ORDER_STATUS)
  } else if (role === "colaborador") {
    if (!assignedTo) return []

    const lastMonth = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    ordersQuery = ordersQuery.eq("assigned_to", assignedTo).neq("status", FINAL_ORDER_STATUS).gte("updated_at", lastMonth)
  }

  const { data: ordersData, error: ordersError } = await ordersQuery

  if (ordersError) {
    console.error("Error al traer órdenes autorizadas:", ordersError.message)
    throw new Error("No se pudieron cargar las órdenes.")
  }

  return hydrateOrders((ordersData ?? []) as Array<Record<string, unknown>>, supabase)
}

export async function fetchCompletedOrdersForUser(userId: string, role: Role, assignedTo?: string): Promise<Order[]> {
  if (!userId || !["admin", "colaborador"].includes(role)) return []

  const supabase = getSupabaseServerClient()
  let ordersQuery = supabase
    .from("orders")
    .select("*")
    .eq("status", FINAL_ORDER_STATUS)
    .not("assigned_to", "is", null)
    .order("updated_at", { ascending: false })

  if (role === "colaborador") {
    if (!assignedTo) return []

    const lastMonth = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    ordersQuery = ordersQuery.eq("assigned_to", assignedTo).gte("updated_at", lastMonth)
  }

  const { data: ordersData, error: ordersError } = await ordersQuery

  if (ordersError) {
    console.error("Error al traer órdenes finalizadas:", ordersError.message)
    throw new Error("No se pudieron cargar las órdenes finalizadas.")
  }

  return hydrateOrders((ordersData ?? []) as Array<Record<string, unknown>>, supabase)
}

