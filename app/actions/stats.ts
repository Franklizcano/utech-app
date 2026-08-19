"use server"

import { getSessionAction } from "@/app/actions/auth"
import { fetchAdminStats } from "@/lib/queries/stats-server"
import type { AdminStatsFilters, AdminStatsResult } from "@/lib/types"

export async function fetchAdminStatsAction(filters: AdminStatsFilters = {}): Promise<AdminStatsResult> {
  const session = await getSessionAction()
  if (!session || !session.active || session.role !== "admin") {
    throw new Error("No tenés permisos para consultar estas estadísticas.")
  }

  return fetchAdminStats(filters)
}
