"use server"

import { getSessionAction } from "@/app/actions/auth"
import { getSupabaseServerClient } from "@/lib/supabase"
import { fetchBudgetOrdersCountForUser, fetchBudgetOrdersForUser, claimBudgetOrderServer, updateBudgetItemDiscountServer } from "@/lib/queries/orders-server"
import type { BudgetItem, Order } from "@/lib/types"

const EDITABLE_BUDGET_STATUSES = ["recibido", "pendiente_presupuesto", "presupuesto_rechazado"]

function mapBudgetItem(row: Record<string, unknown>): BudgetItem {
  return {
    id: row.id as string,
    description: row.description as string,
    amount: Number(row.amount),
    discountType: row.discount_type === "fixed" || row.discount_type === "percentage" ? row.discount_type : null,
    discountValue: row.discount_value === null || row.discount_value === undefined ? null : Number(row.discount_value),
  }
}

async function canEditBudgetOrder(orderId: string, userId: string, role: string) {
  const supabase = getSupabaseServerClient()
  let query = supabase.from("orders").select("id, status, budget_assigned_to").eq("id", orderId)
  if (role === "presupuestador") query = query.eq("budget_assigned_to", userId)
  const { data, error } = await query.maybeSingle()
  if (error || !data) return false
  return EDITABLE_BUDGET_STATUSES.includes(data.status as string)
}

export async function fetchBudgetQueueAction(): Promise<Order[]> {
  const session = await getSessionAction()
  if (!session || !session.active || !["admin", "presupuestador"].includes(session.role)) return []
  return fetchBudgetOrdersForUser(session.id, session.role)
}

export async function fetchBudgetQueueCountAction(): Promise<number> {
  const session = await getSessionAction()
  if (!session || !session.active || !["admin", "presupuestador"].includes(session.role)) return 0
  return fetchBudgetOrdersCountForUser(session.id, session.role)
}

export async function claimBudgetOrderAction(orderId: string): Promise<boolean> {
  const session = await getSessionAction()
  if (!session || !session.active || !["admin", "presupuestador"].includes(session.role)) return false
  return claimBudgetOrderServer(orderId, session.id)
}

export async function updateBudgetItemDiscountAction(
  itemId: string,
  discountType: "fixed" | "percentage" | null,
  discountValue: number | null,
): Promise<boolean> {
  const session = await getSessionAction()
  if (!session || !session.active || !["admin", "presupuestador"].includes(session.role)) return false
  if (discountType === null) return updateBudgetItemDiscountServer(itemId, session.id, session.role, null, null)
  if (discountType !== "fixed" && discountType !== "percentage") return false
  if (typeof discountValue !== "number" || !Number.isFinite(discountValue) || discountValue < 0) return false
  if (discountType === "percentage" && discountValue > 100) return false

  return updateBudgetItemDiscountServer(itemId, session.id, session.role, discountType, discountValue)
}

export async function addBudgetItemAction(orderId: string, description: string, amount: number): Promise<BudgetItem | null> {
  const session = await getSessionAction()
  if (!session || !session.active || !["admin", "presupuestador"].includes(session.role)) return null

  const normalizedDescription = typeof description === "string" ? description.trim() : ""
  if (!orderId || !normalizedDescription || normalizedDescription.length > 255 || !Number.isFinite(amount) || amount <= 0) return null
  if (!await canEditBudgetOrder(orderId, session.id, session.role)) return null

  const supabase = getSupabaseServerClient()
  const { data, error } = await supabase
    .from("budget_items")
    .insert({ order_id: orderId, description: normalizedDescription, amount })
    .select("id, description, amount, discount_type, discount_value")
    .single()
  return error || !data ? null : mapBudgetItem(data as Record<string, unknown>)
}

export async function deleteBudgetItemAction(itemId: string): Promise<boolean> {
  const session = await getSessionAction()
  if (!session || !session.active || !["admin", "presupuestador"].includes(session.role) || !itemId) return false

  const supabase = getSupabaseServerClient()
  const { data: item, error: itemError } = await supabase
    .from("budget_items")
    .select("id, order_id")
    .eq("id", itemId)
    .maybeSingle()
  if (itemError || !item || !await canEditBudgetOrder(item.order_id as string, session.id, session.role)) return false

  const { error } = await supabase.from("budget_items").delete().eq("id", itemId)
  return !error
}

export async function submitOrderForBudgetAction(orderId: string): Promise<boolean> {
  const session = await getSessionAction()
  if (!session || !session.active || !["colaborador", "presupuestador"].includes(session.role)) return false
  const supabase = getSupabaseServerClient()
  const { data, error } = await supabase
    .from("orders")
    .update({ status: "pendiente_presupuesto", assigned_to: null, budget_submitted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", orderId)
    .eq("assigned_to", session.name)
    .eq("status", "recibido")
    .select("id")
    .maybeSingle()
  if (error || !data) return false

  const now = new Date().toISOString()
  await Promise.all([
    supabase.from("timeline_events").insert({ order_id: orderId, status: "pendiente_presupuesto", note: "El equipo fue enviado a revisión de presupuesto.", event_date: now }),
    supabase.from("notifications").insert({ order_id: orderId, message: "Tu equipo fue enviado a revisión de presupuesto.", notification_date: now, read: false }),
  ])
  return true
}

export async function sendBudgetToClientAction(orderId: string): Promise<boolean> {
  const session = await getSessionAction()
  if (!session || !session.active || !["admin", "presupuestador"].includes(session.role)) return false
  const supabase = getSupabaseServerClient()
  const now = new Date().toISOString()
  const { data: budgetItems, error: budgetError } = await supabase.from("budget_items").select("amount, discount_type, discount_value").eq("order_id", orderId)
  if (budgetError || !budgetItems?.length) return false
  const total = budgetItems.reduce((sum, item) => {
    const amount = Number(item.amount)
    const discount = item.discount_type === "percentage" ? amount * Math.min(100, Math.max(0, Number(item.discount_value) || 0)) / 100 : item.discount_type === "fixed" ? Math.min(amount, Math.max(0, Number(item.discount_value) || 0)) : 0
    return sum + Math.max(0, amount - discount)
  }, 0)
  if (!Number.isFinite(total) || total <= 0) return false
  let query = supabase
    .from("orders")
    .update({ status: "presupuesto_enviado", budget_decision: null, budget_decision_note: null, budget_decided_at: null, budget_submitted_at: now, updated_at: now })
    .eq("id", orderId)
    .in("status", ["pendiente_presupuesto", "presupuesto_rechazado"])
  if (session.role === "presupuestador") query = query.eq("budget_assigned_to", session.id)
  const { data, error } = await query
    .select("id")
    .maybeSingle()
  if (error || !data) return false
  await Promise.all([
    supabase.from("timeline_events").insert({ order_id: orderId, status: "presupuesto_enviado", note: "Presupuesto finalizado y enviado al cliente.", event_date: now }),
    supabase.from("notifications").insert({ order_id: orderId, message: "Tu presupuesto está disponible para revisar y responder.", notification_date: now, read: false }),
  ])
  return true
}

export async function decideBudgetAction(orderId: string, decision: "aprobado" | "rechazado", note?: string): Promise<boolean> {
  const session = await getSessionAction()
  if (!session || !session.active || session.role !== "cliente") return false
  if (decision !== "aprobado" && decision !== "rechazado") return false
  const normalizedNote = typeof note === "string" ? note.trim().slice(0, 500) : ""
  const supabase = getSupabaseServerClient()
  const now = new Date().toISOString()
  const status = decision === "aprobado" ? "presupuesto_aprobado" : "presupuesto_rechazado"
  const { data, error } = await supabase
    .from("orders")
    .update({ status, budget_decision: decision, budget_decision_note: normalizedNote || null, budget_decided_at: now, assigned_to: null, budget_assigned_to: null, updated_at: now })
    .eq("id", orderId)
    .eq("client_id", session.id)
    .eq("status", "presupuesto_enviado")
    .select("id")
    .maybeSingle()
  if (error || !data) return false
  await Promise.all([
    supabase.from("timeline_events").insert({ order_id: orderId, status, note: normalizedNote || (decision === "aprobado" ? "El cliente aceptó el presupuesto." : "El cliente rechazó el presupuesto."), event_date: now }),
    supabase.from("notifications").insert({ order_id: orderId, message: decision === "aprobado" ? "El cliente aprobó el presupuesto. La orden está lista para ser tomada." : `El cliente rechazó el presupuesto.${normalizedNote ? ` Motivo: ${normalizedNote}` : ""}`, notification_date: now, read: false }),
  ])
  return true
}

