import type { Order } from "@/lib/types"

export type OrderExpirationState = "normal" | "warning" | "urgent" | "expired"

export function getOrderExpirationDate(order: Pick<Order, "createdAt">, expirationDays: number): Date {
  const createdAt = new Date(order.createdAt).getTime()
  return new Date(createdAt + Math.max(1, expirationDays) * 24 * 60 * 60 * 1000)
}

export function getOrderExpirationState(
  order: Pick<Order, "createdAt" | "status">,
  expirationDays: number,
  now = Date.now(),
): OrderExpirationState {
  if (order.status === "entregado") return "normal"

  const createdAt = new Date(order.createdAt).getTime()
  const expiresAt = getOrderExpirationDate(order, expirationDays).getTime()
  const duration = Math.max(1, expiresAt - createdAt)
  const remaining = expiresAt - now
  if (remaining <= 0) return "expired"
  if (remaining / duration <= 0.2) return "urgent"
  if (remaining / duration <= 0.5) return "warning"
  return "normal"
}

export function getOrderExpirationDaysRemaining(order: Pick<Order, "createdAt">, expirationDays: number, now = Date.now()): number {
  const remaining = getOrderExpirationDate(order, expirationDays).getTime() - now
  return Math.ceil(remaining / (24 * 60 * 60 * 1000))
}

export function getOrderExpirationCardClass(state: OrderExpirationState): string {
  switch (state) {
    case "expired":
      return "border-rose-500/70 bg-rose-500/10 hover:border-rose-500"
    case "urgent":
      return "border-orange-500/70 bg-orange-500/10 hover:border-orange-500"
    case "warning":
      return "border-amber-400/70 bg-amber-400/10 hover:border-amber-500"
    default:
      return ""
  }
}

export function getOrderExpirationLabel(order: Pick<Order, "createdAt" | "status">, expirationDays: number, now = Date.now()): string {
  if (order.status === "entregado") return "Orden entregada"
  const daysRemaining = getOrderExpirationDaysRemaining(order, expirationDays, now)
  if (daysRemaining < 0) return `Vencida hace ${Math.abs(daysRemaining)} días`
  if (daysRemaining === 0) return "Vence hoy"
  if (daysRemaining === 1) return "Vence mañana"
  return `Vence en ${daysRemaining} días`
}
