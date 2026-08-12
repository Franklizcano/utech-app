"use server"

import { getSessionAction } from "@/app/actions/auth"
import { getSupabaseServerClient } from "@/lib/supabase"
import {
  claimOrderServer,
  fetchAvailableOrdersForCollaborator,
  fetchCompletedOrdersForUser,
  fetchOccasionalTicketStatus,
  fetchOrdersForUser,
  insertOrderServer,
} from "@/lib/queries/orders-server"
import type { OccasionalTicketStatus, Order, OrderCreationInput } from "@/lib/types"

export interface OccasionalTicketLookupResult {
  success: boolean
  ticket?: OccasionalTicketStatus
  error?: string
}

export interface CreateOrderResult {
  success: boolean
  order?: Order
  error?: string
}

function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

function normalizeOrderDetails(input: OrderCreationInput) {
  const allowedDeviceTypes = ["PC", "Notebook", "PlayStation", "Xbox", "Nintendo", "Otro"]
  const deviceType = normalizeText(input?.deviceType)
  const deviceBrand = normalizeText(input?.deviceBrand)
  const deviceModel = normalizeText(input?.deviceModel)
  const deviceSerial = normalizeText(input?.deviceSerial) || null
  const fault = normalizeText(input?.fault)

  if (!allowedDeviceTypes.includes(deviceType) || !fault) return null

  return {
    deviceType: deviceType as OrderCreationInput["deviceType"],
    deviceBrand,
    deviceModel,
    deviceSerial,
    fault,
  }
}

export async function createOrderAction(input: OrderCreationInput): Promise<CreateOrderResult> {
  try {
    const session = await getSessionAction()
    if (!session || !session.active) {
      return { success: false, error: "Tu sesión expiró. Volvé a iniciar sesión." }
    }

    const details = normalizeOrderDetails(input)
    if (!details) {
      return { success: false, error: "Completá todos los datos del equipo y la falla." }
    }

    let orderInput: OrderCreationInput
    if (session.role === "cliente") {
      orderInput = {
        ...details,
        clientId: session.id,
        clientName: session.name,
        clientPhone: session.phone,
        clientEmail: session.email,
        assignedTo: null,
      }
    } else if (session.role === "admin" || session.role === "colaborador") {
      const clientName = normalizeText(input?.clientName)
      const clientPhone = normalizeText(input?.clientPhone)
      const clientEmail = normalizeText(input?.clientEmail)
      if (!clientName || !clientPhone || !clientEmail) {
        return { success: false, error: "Completá los datos del cliente." }
      }

      orderInput = {
        ...details,
        clientId: input.clientId || null,
        clientName,
        clientPhone,
        clientEmail,
        assignedTo: normalizeText(input.assignedTo) || null,
      }
    } else {
      return { success: false, error: "No tenés permisos para crear órdenes." }
    }

    const order = await insertOrderServer(orderInput)
    return order ? { success: true, order } : { success: false, error: "No se pudo crear la orden." }
  } catch (error) {
    console.error("Error al crear la orden:", error)
    return { success: false, error: "No se pudo crear la orden." }
  }
}

export async function fetchAvailableOrdersAction(): Promise<Order[]> {
  const session = await getSessionAction()
  if (!session || !session.active || !["admin", "colaborador"].includes(session.role)) return []
  return fetchAvailableOrdersForCollaborator()
}

export async function claimOrderAction(orderId: string): Promise<boolean> {
  const session = await getSessionAction()
  if (!session || !session.active || !["admin", "colaborador"].includes(session.role)) return false
  return claimOrderServer(orderId, session.name)
}

export async function assignOrderAction(orderId: string, collaboratorId: string): Promise<boolean> {
  const session = await getSessionAction()
  if (!session || !session.active || session.role !== "admin" || !orderId || !collaboratorId) return false

  const supabase = getSupabaseServerClient()
  const { data: collaborator, error } = await supabase
    .from("users")
    .select("name")
    .eq("id", collaboratorId)
    .eq("role", "colaborador")
    .eq("active", true)
    .maybeSingle()

  if (error || !collaborator) {
    if (error) console.error("Error al validar el colaborador destino:", error.message)
    return false
  }

  return claimOrderServer(orderId, collaborator.name as string)
}

export async function fetchOrdersAction() {
  const session = await getSessionAction()
  if (!session || !session.active) {
    return []
  }

  return fetchOrdersForUser(session.id, session.role, session.name)
}

export async function fetchCompletedOrdersAction(): Promise<Order[]> {
  const session = await getSessionAction()
  if (!session || !session.active || !["admin", "colaborador"].includes(session.role)) return []

  return fetchCompletedOrdersForUser(session.id, session.role, session.name)
}

export async function lookupOccasionalTicketAction(code: string): Promise<OccasionalTicketLookupResult> {
  if (typeof code !== "string" || !code.trim()) {
    return { success: false, error: "Ingresá el código de tu ticket." }
  }

  try {
    const ticket = await fetchOccasionalTicketStatus(code)
    if (!ticket) {
      return { success: false, error: "No encontramos un ticket ocasional con ese código." }
    }

    return { success: true, ticket }
  } catch {
    return { success: false, error: "No se pudo consultar el ticket. Intentá nuevamente." }
  }
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

