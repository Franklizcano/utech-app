"use server"

import { getSessionAction } from "@/app/actions/auth"
import { getSupabaseServerClient } from "@/lib/supabase"
import { appendOrderHistoryEventServer } from "@/lib/queries/order-history-server"
import { FINAL_ORDER_STATUS, type DeviceType, type OrderDetailsInput, type OrderStatus, type Role } from "@/lib/types"

const INTERNAL_ROLES: Role[] = ["admin", "colaborador", "presupuestador"]
const DEVICE_TYPES: DeviceType[] = ["PC", "Notebook", "PlayStation", "Xbox", "Nintendo", "Otro"]

type InternalSession = NonNullable<Awaited<ReturnType<typeof getSessionAction>>>

async function getMutableOrder(orderId: string, session: InternalSession) {
  if (!orderId || !session.active || !INTERNAL_ROLES.includes(session.role)) return null

  const supabase = getSupabaseServerClient()
  let query = supabase
    .from("orders")
    .select("id, status, assigned_to, budget_assigned_to, device_type, device_brand, device_model, device_serial, fault")
    .eq("id", orderId)
    .neq("status", FINAL_ORDER_STATUS)

  if (session.role === "admin") {
    query = query.not("assigned_to", "is", null)
  } else if (session.role === "colaborador") {
    query = query.eq("assigned_to", session.name)
  } else {
    query = query.or(`assigned_to.eq.${session.name},budget_assigned_to.eq.${session.id}`)
  }

  const { data, error } = await query.maybeSingle()
  if (error || !data) return null
  return data
}

function actorFromSession(session: InternalSession) {
  return { userId: session.id, name: session.name, role: session.role }
}

export async function updateOrderStatusAction(orderId: string, statusInput: string, noteInput?: string): Promise<boolean> {
  const session = await getSessionAction()
  if (!session || !session.active || !INTERNAL_ROLES.includes(session.role)) return false

  const status = typeof statusInput === "string" ? statusInput.trim() : ""
  const note = typeof noteInput === "string" ? noteInput.trim().slice(0, 500) : ""
  if (!status) return false
  if (session.role === "colaborador" && (status.startsWith("presupuesto") || status === "pendiente_presupuesto")) return false

  const currentOrder = await getMutableOrder(orderId, session)
  if (!currentOrder || currentOrder.status === status) return false

  const supabase = getSupabaseServerClient()
  const { data: state, error: stateError } = await supabase.from("order_states").select("id, label").eq("id", status).eq("is_active", true).maybeSingle()
  if (stateError || !state) return false

  const now = new Date().toISOString()
  const { data: updated, error } = await supabase
    .from("orders")
    .update({ status, updated_at: now })
    .eq("id", orderId)
    .eq("status", currentOrder.status)
    .select("id, client_id")
    .maybeSingle()
  if (error || !updated) return false

  const statusLabel = state.label as string
  const message = `Estado actualizado: ${statusLabel}.${note ? ` ${note}` : ""}`
  await Promise.all([
    supabase.from("timeline_events").insert({ order_id: orderId, status, note: note || null, event_date: now }),
    supabase.from("notifications").insert({
      order_id: orderId,
      recipient_user_id: (updated.client_id as string | null) ?? null,
      notification_type: "status_changed",
      title: "Estado actualizado",
      message,
      notification_date: now,
      read: false,
    }),
    appendOrderHistoryEventServer({
      orderId,
      eventType: "status_changed",
      summary: `Estado cambiado a ${statusLabel}.`,
      actor: actorFromSession(session),
      fieldName: "status",
      oldValue: currentOrder.status,
      newValue: status,
      metadata: { note: note || null },
      date: now,
    }),
  ])

  return true
}

export async function reassignOrderAction(orderId: string, newAssigneeInput: string): Promise<boolean> {
  const session = await getSessionAction()
  if (!session || !session.active || !INTERNAL_ROLES.includes(session.role)) return false

  const newAssignee = typeof newAssigneeInput === "string" ? newAssigneeInput.trim() : ""
  const currentOrder = await getMutableOrder(orderId, session)
  if (!currentOrder || !newAssignee || currentOrder.assigned_to === newAssignee) return false

  const supabase = getSupabaseServerClient()
  const { data: target, error: targetError } = await supabase
    .from("users")
    .select("id, name, role")
    .eq("name", newAssignee)
    .in("role", ["admin", "colaborador", "presupuestador"])
    .eq("active", true)
    .maybeSingle()
  if (targetError || !target) return false

  const now = new Date().toISOString()
  const { data: updated, error } = await supabase
    .from("orders")
    .update({ assigned_to: newAssignee, updated_at: now })
    .eq("id", orderId)
    .eq("assigned_to", currentOrder.assigned_to)
    .select("id, client_id")
    .maybeSingle()
  if (error || !updated) return false

  await Promise.all([
    supabase.from("notifications").insert({
      order_id: orderId,
      recipient_user_id: (updated.client_id as string | null) ?? null,
      notification_type: "order_reassigned",
      title: "Orden reasignada",
      message: `Tu pedido ha sido reasignado a ${newAssignee}.`,
      notification_date: now,
      read: false,
    }),
    appendOrderHistoryEventServer({
      orderId,
      eventType: "assignee_changed",
      summary: "Colaborador asignado actualizado.",
      actor: actorFromSession(session),
      fieldName: "assigned_to",
      oldValue: currentOrder.assigned_to,
      newValue: newAssignee,
      metadata: { targetUserId: target.id, targetRole: target.role },
      date: now,
    }),
  ])

  return true
}

export async function updateOrderDetailsAction(orderId: string, input: OrderDetailsInput): Promise<boolean> {
  const session = await getSessionAction()
  if (!session || !session.active || !INTERNAL_ROLES.includes(session.role)) return false

  const currentOrder = await getMutableOrder(orderId, session)
  if (!currentOrder) return false

  const deviceType = typeof input?.deviceType === "string" ? input.deviceType.trim() : ""
  const deviceBrand = typeof input?.deviceBrand === "string" ? input.deviceBrand.trim() : ""
  const deviceModel = typeof input?.deviceModel === "string" ? input.deviceModel.trim() : ""
  const deviceSerial = typeof input?.deviceSerial === "string" ? input.deviceSerial.trim() : ""
  const fault = typeof input?.fault === "string" ? input.fault.trim() : ""
  if (!DEVICE_TYPES.includes(deviceType as DeviceType) || !fault || deviceBrand.length > 100 || deviceModel.length > 100 || deviceSerial.length > 255 || fault.length > 5000) return false

  const nextValues = { device_type: deviceType, device_brand: deviceBrand, device_model: deviceModel, device_serial: deviceSerial || null, fault }
  const changedFields = Object.entries(nextValues).filter(([field, value]) => (currentOrder[field as keyof typeof currentOrder] ?? null) !== value)
  if (changedFields.length === 0) return false

  const now = new Date().toISOString()
  const supabase = getSupabaseServerClient()
  const { error } = await supabase.from("orders").update({ ...nextValues, updated_at: now }).eq("id", orderId)
  if (error) return false

  await appendOrderHistoryEventServer({
    orderId,
    eventType: "order_details_changed",
    summary: "Datos técnicos de la orden modificados.",
    actor: actorFromSession(session),
    metadata: {
      changes: changedFields.map(([field, value]) => ({
        field,
        oldValue: currentOrder[field as keyof typeof currentOrder] ?? null,
        newValue: value,
      })),
    },
    date: now,
  })

  return true
}
