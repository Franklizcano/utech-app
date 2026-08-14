import { getSupabaseServerClient } from "@/lib/supabase"
import type { AdminStatsFilters, AdminStatsResult, OrderStatus } from "@/lib/types"

function parseDate(value: string, endOfDay = false): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null

  const date = new Date(`${value}T00:00:00.000Z`)
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) return null
  if (endOfDay) date.setUTCDate(date.getUTCDate() + 1)
  return date.toISOString()
}

export async function fetchAdminStats(filters: AdminStatsFilters = {}): Promise<AdminStatsResult> {
  const from = filters.from ? parseDate(filters.from) : null
  const to = filters.to ? parseDate(filters.to, true) : null

  if ((filters.from && !from) || (filters.to && !to)) {
    throw new Error("El rango de fechas no es válido.")
  }
  if (from && to && from >= to) {
    throw new Error("La fecha inicial debe ser anterior o igual a la fecha final.")
  }

  const supabase = getSupabaseServerClient()
  let ordersQuery = supabase
    .from("orders")
    .select("status, assigned_to, created_at, budget_items(amount)")
    .order("created_at", { ascending: false })

  if (filters.assignedTo) {
    ordersQuery = ordersQuery.eq("assigned_to", filters.assignedTo)
  } else {
    ordersQuery = ordersQuery.not("assigned_to", "is", null)
  }
  if (from) ordersQuery = ordersQuery.gte("created_at", from)
  if (to) ordersQuery = ordersQuery.lt("created_at", to)

  const { data, error } = await ordersQuery
  if (error) {
    console.error("Error al traer estadísticas administrativas:", error.message)
    throw new Error("No se pudieron cargar las estadísticas.")
  }

  const countsByStatus: Record<OrderStatus, number> = {}
  let revenue = 0

  for (const row of (data ?? []) as Array<Record<string, unknown>>) {
    const status = row.status as OrderStatus
    countsByStatus[status] = (countsByStatus[status] ?? 0) + 1

    const budgetItems = Array.isArray(row.budget_items) ? row.budget_items : []
    revenue += budgetItems.reduce((sum, item) => {
      if (!item || typeof item !== "object") return sum
      return sum + Number((item as { amount?: unknown }).amount ?? 0)
    }, 0)
  }

  return {
    total: data?.length ?? 0,
    revenue,
    countsByStatus,
  }
}

