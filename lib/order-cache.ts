import type { Order } from "@/lib/types"

interface OrdersCacheEntry {
  orders: Order[]
  updatedAt: number
  inFlight?: Promise<Order[]>
}

const ordersCache = new Map<string, OrdersCacheEntry>()

export function getOrdersCacheKey(userId: string, role: string, search = ""): string {
  return `${role === "cliente" ? "client" : "staff"}:${userId}:${search.trim().toLowerCase()}`
}

export function getOrdersCache(key: string): Order[] | undefined {
  return ordersCache.get(key)?.orders
}

export function setOrdersCache(key: string, orders: Order[]): void {
  const current = ordersCache.get(key)
  ordersCache.set(key, {
    orders,
    updatedAt: Date.now(),
    inFlight: current?.inFlight,
  })
}

export function isOrdersCacheStale(key: string, maxAgeMs: number): boolean {
  const entry = ordersCache.get(key)
  return !entry || Date.now() - entry.updatedAt >= maxAgeMs
}

/**
 * Revalida una entrada conservando los datos actuales mientras llega la respuesta.
 * Las solicitudes concurrentes para la misma sesión comparten la misma promesa.
 */
export function revalidateOrdersCache(key: string, loader: () => Promise<Order[]>): Promise<Order[]> {
  const current = ordersCache.get(key)
  if (current?.inFlight) return current.inFlight

  const request = Promise.resolve()
    .then(loader)
    .then(
      (orders) => {
        ordersCache.set(key, { orders, updatedAt: Date.now() })
        return orders
      },
      (error: unknown) => {
        if (current) {
          ordersCache.set(key, { orders: current.orders, updatedAt: current.updatedAt })
        } else {
          ordersCache.delete(key)
        }
        throw error
      },
    )

  ordersCache.set(key, {
    orders: current?.orders ?? [],
    updatedAt: current?.updatedAt ?? 0,
    inFlight: request,
  })

  return request
}

export function clearOrdersCache(key: string): void {
  ordersCache.delete(key)
}


