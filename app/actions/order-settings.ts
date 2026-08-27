"use server"

import { getSessionAction } from "@/app/actions/auth"
import { fetchOrderExpirationDaysServer, updateOrderExpirationDaysServer } from "@/lib/queries/order-settings-server"

export async function fetchOrderExpirationDaysAction(): Promise<number> {
  const session = await getSessionAction()
  if (!session?.active) return 30
  return fetchOrderExpirationDaysServer()
}

export async function updateOrderExpirationDaysAction(daysInput: number): Promise<{ success: boolean; days?: number; error?: string }> {
  const session = await getSessionAction()
  if (!session?.active || session.role !== "admin") return { success: false, error: "No tenés permisos para cambiar esta configuración." }

  const days = Number(daysInput)
  if (!Number.isInteger(days) || days < 1 || days > 3650) {
    return { success: false, error: "Ingresá una cantidad entera de días entre 1 y 3650." }
  }

  const success = await updateOrderExpirationDaysServer(days, session.id)
  return success ? { success: true, days } : { success: false, error: "No se pudo guardar la configuración." }
}
