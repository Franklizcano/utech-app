"use server"

import { getSessionAction } from "@/app/actions/auth"
import { getSupabaseServerClient } from "@/lib/supabase"
import { fetchBudgetOrdersForUser, claimBudgetOrderServer } from "@/lib/queries/orders-server"
import type { Order } from "@/lib/types"

export async function fetchBudgetQueueAction(): Promise<Order[]> {
  const session = await getSessionAction()
  if (!session || !session.active || !["admin", "presupuestador"].includes(session.role)) return []
  return fetchBudgetOrdersForUser(session.id, session.role)
}

export async function claimBudgetOrderAction(orderId: string): Promise<boolean> {
  const session = await getSessionAction()
  if (!session || !session.active || !["admin", "presupuestador"].includes(session.role)) return false
  return claimBudgetOrderServer(orderId, session.id)
}

export async function submitOrderForBudgetAction(orderId: string): Promise<boolean> {
  const session = await getSessionAction()
  if (!session || !session.active || session.role !== "colaborador") return false
  const supabase = getSupabaseServerClient()
  const { data, error } = await supabase
    .from("orders")
    .update({ status: "pendiente_presupuesto", assigned_to: null, budget_submitted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", orderId)
    .eq("assigned_to", session.name)
    .select("id")
    .maybeSingle()
  return !error && Boolean(data)
}

export async function sendBudgetToClientAction(orderId: string): Promise<boolean> {
  const session = await getSessionAction()
  if (!session || !session.active || !["admin", "presupuestador"].includes(session.role)) return false
  const supabase = getSupabaseServerClient()
  const now = new Date().toISOString()
  let query = supabase
    .from("orders")
    .update({ status: "presupuesto_enviado", budget_submitted_at: now, updated_at: now })
    .eq("id", orderId)
    .in("status", ["pendiente_presupuesto", "presupuesto_rechazado"])
  if (session.role === "presupuestador") query = query.eq("budget_assigned_to", session.id)
  const { data, error } = await query
    .select("id")
    .maybeSingle()
  if (error || !data) return false
  await supabase.from("notifications").insert({ order_id: orderId, message: "Tu presupuesto está disponible para revisar y responder.", notification_date: now, read: false })
  return true
}

export async function decideBudgetAction(orderId: string, decision: "aprobado" | "rechazado", note?: string): Promise<boolean> {
  const session = await getSessionAction()
  if (!session || !session.active || session.role !== "cliente" || session.companyId) return false
  const supabase = getSupabaseServerClient()
  const now = new Date().toISOString()
  const status = decision === "aprobado" ? "presupuesto_aprobado" : "presupuesto_rechazado"
  const { data, error } = await supabase
    .from("orders")
    .update({ status, budget_decision: decision, budget_decision_note: note?.trim() || null, budget_decided_at: now, assigned_to: null, budget_assigned_to: null, updated_at: now })
    .eq("id", orderId)
    .eq("client_id", session.id)
    .eq("status", "presupuesto_enviado")
    .select("id")
    .maybeSingle()
  if (error || !data) return false
  await supabase.from("notifications").insert({ order_id: orderId, message: decision === "aprobado" ? "El cliente aprobó el presupuesto. La orden está lista para ser tomada." : `El cliente rechazó el presupuesto.${note?.trim() ? ` Motivo: ${note.trim()}` : ""}`, notification_date: now, read: false })
  return true
}


