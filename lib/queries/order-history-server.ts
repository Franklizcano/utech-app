import { getSupabaseServerClient } from "@/lib/supabase"
import type { OrderHistoryEvent, OrderHistoryEventType, Role } from "@/lib/types"

export interface OrderHistoryActor {
  userId: string | null
  name: string | null
  role: Role | null
}

export interface AppendOrderHistoryEventInput {
  orderId: string
  eventType: OrderHistoryEventType
  summary: string
  actor: OrderHistoryActor
  fieldName?: string | null
  oldValue?: unknown
  newValue?: unknown
  metadata?: Record<string, unknown>
  date?: string
}

function rowToOrderHistoryEvent(row: Record<string, unknown>): OrderHistoryEvent {
  return {
    id: row.id as string,
    eventType: row.event_type as OrderHistoryEventType,
    actorUserId: (row.actor_user_id as string | null) ?? null,
    actorName: (row.actor_name as string | null) ?? null,
    actorRole: (row.actor_role as Role | null) ?? null,
    summary: row.summary as string,
    fieldName: (row.field_name as string | null) ?? null,
    oldValue: row.old_value ?? null,
    newValue: row.new_value ?? null,
    metadata: (row.metadata as Record<string, unknown> | null) ?? {},
    date: row.event_date as string,
  }
}

export async function appendOrderHistoryEventServer(input: AppendOrderHistoryEventInput): Promise<boolean> {
  if (!input.orderId || !input.summary.trim()) return false

  const supabase = getSupabaseServerClient()
  const { error } = await supabase.from("order_history_events").insert({
    order_id: input.orderId,
    event_type: input.eventType,
    actor_user_id: input.actor.userId,
    actor_name: input.actor.name,
    actor_role: input.actor.role,
    summary: input.summary.trim(),
    field_name: input.fieldName ?? null,
    old_value: input.oldValue === undefined ? null : input.oldValue,
    new_value: input.newValue === undefined ? null : input.newValue,
    metadata: input.metadata ?? {},
    event_date: input.date ?? new Date().toISOString(),
  })

  if (error) {
    console.error("Error al registrar el historial de la orden:", error.message)
    return false
  }

  return true
}

export async function fetchOrderHistoryServer(orderIds: string[]): Promise<Map<string, OrderHistoryEvent[]>> {
  const historyByOrder = new Map<string, OrderHistoryEvent[]>()
  if (orderIds.length === 0) return historyByOrder

  const supabase = getSupabaseServerClient()
  const { data, error } = await supabase
    .from("order_history_events")
    .select("*")
    .in("order_id", orderIds)
    .order("event_date", { ascending: true })
    .order("created_at", { ascending: true })

  if (error) {
    console.error("Error al cargar el historial de las órdenes:", error.message)
    throw new Error("No se pudo cargar el historial de la orden.")
  }

  for (const row of (data ?? []) as Array<Record<string, unknown>>) {
    const orderId = row.order_id as string
    const events = historyByOrder.get(orderId) ?? []
    events.push(rowToOrderHistoryEvent(row))
    historyByOrder.set(orderId, events)
  }

  return historyByOrder
}
