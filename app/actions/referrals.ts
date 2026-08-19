"use server"

import { getSessionAction } from "@/app/actions/auth"
import { getSupabaseServerClient } from "@/lib/supabase"
import type { AdminReferralSummary, ReferralStats } from "@/lib/types"

export async function fetchReferralStatsAction(): Promise<ReferralStats | null> {
  const session = await getSessionAction()
  if (!session || !session.active || session.role !== "cliente") return null

  const supabase = getSupabaseServerClient()
  const { data: referredUsers, error: usersError } = await supabase
    .from("users")
    .select("id, name, email")
    .eq("referred_by", session.id)
    .eq("role", "cliente")
    .order("created_at", { ascending: false })

  if (usersError) {
    console.error("Error al cargar los referidos:", usersError.message)
    return null
  }

  const users = referredUsers ?? []
  const orderCounts = new Map<string, number>()
  if (users.length > 0) {
    const { data: orders, error: ordersError } = await supabase
      .from("orders")
      .select("client_id")
      .in("client_id", users.map((user) => user.id))

    if (ordersError) {
      console.error("Error al contar órdenes de referidos:", ordersError.message)
      return null
    }

    for (const order of orders ?? []) {
      const clientId = order.client_id as string
      orderCounts.set(clientId, (orderCounts.get(clientId) ?? 0) + 1)
    }
  }

  const detailedUsers = users.map((user) => ({
    id: user.id as string,
    name: user.name as string,
    email: user.email as string,
    orderCount: orderCounts.get(user.id as string) ?? 0,
  }))

  return {
    referralCode: session.referralCode,
    referredUsers: detailedUsers,
    totalReferredUsers: detailedUsers.length,
    totalOrders: detailedUsers.reduce((total, user) => total + user.orderCount, 0),
  }
}

export async function fetchAdminReferralSummariesAction(): Promise<AdminReferralSummary[]> {
  const session = await getSessionAction()
  if (!session || !session.active || session.role !== "admin") return []

  const supabase = getSupabaseServerClient()
  const { data: clients, error: clientsError } = await supabase
    .from("users")
    .select("id, name, email, referred_by")
    .eq("role", "cliente")
    .order("name", { ascending: true })

  if (clientsError) {
    console.error("Error al cargar los clientes para referidos:", clientsError.message)
    return []
  }

  const clientRows = clients ?? []
  const clientIds = clientRows.map((client) => client.id as string)
  const orderCounts = new Map<string, number>()

  if (clientIds.length > 0) {
    const { data: orders, error: ordersError } = await supabase
      .from("orders")
      .select("client_id")
      .in("client_id", clientIds)

    if (ordersError) {
      console.error("Error al contar órdenes de referidos para administración:", ordersError.message)
      return []
    }

    for (const order of orders ?? []) {
      const clientId = order.client_id as string
      orderCounts.set(clientId, (orderCounts.get(clientId) ?? 0) + 1)
    }
  }

  const referredBy = new Map<string, Array<{ id: string; name: string; email: string; orderCount: number }>>()
  for (const client of clientRows) {
    const referrerId = client.referred_by as string | null
    if (!referrerId) continue
    const referred = referredBy.get(referrerId) ?? []
    referred.push({
      id: client.id as string,
      name: client.name as string,
      email: client.email as string,
      orderCount: orderCounts.get(client.id as string) ?? 0,
    })
    referredBy.set(referrerId, referred)
  }

  return clientRows.map((client) => {
    const referredUsers = referredBy.get(client.id as string) ?? []
    return {
      referrerId: client.id as string,
      referredUsers,
      totalReferredUsers: referredUsers.length,
      totalOrders: referredUsers.reduce((total, user) => total + user.orderCount, 0),
    }
  })
}


