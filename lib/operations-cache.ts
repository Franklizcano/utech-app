import type { Order } from "@/lib/types"

const OPERATIONS_CACHE_TTL_MS = 2 * 60 * 1000

interface CacheEntry<T> {
  value: T
  updatedAt: number
  inFlight?: Promise<T>
}

const operationsCache = new Map<string, CacheEntry<unknown>>()

function key(userId: string, resource: string): string {
  return `${userId}:${resource}`
}

function loadCached<T>(cacheKey: string, loader: () => Promise<T>, force = false): Promise<T> {
  const current = operationsCache.get(cacheKey) as CacheEntry<T> | undefined
  if (!force && current && Date.now() - current.updatedAt < OPERATIONS_CACHE_TTL_MS) return Promise.resolve(current.value)
  if (current?.inFlight) return current.inFlight

  const request = loader().then(
    (value) => {
      operationsCache.set(cacheKey, { value, updatedAt: Date.now() })
      return value
    },
    (error: unknown) => {
      if (current) operationsCache.set(cacheKey, { value: current.value, updatedAt: current.updatedAt })
      else operationsCache.delete(cacheKey)
      throw error
    },
  )

  operationsCache.set(cacheKey, { value: current?.value, updatedAt: current?.updatedAt ?? 0, inFlight: request })
  return request
}

export function loadCachedAvailableOrdersCount(userId: string, loader: () => Promise<number>): Promise<number> {
  return loadCached(key(userId, "available-count"), loader)
}

export function loadCachedAvailableOrders(userId: string, loader: () => Promise<Order[]>, force = false): Promise<Order[]> {
  return loadCached(key(userId, "available-orders"), loader, force)
}

export function loadCachedBudgetOrders(userId: string, loader: () => Promise<Order[]>, force = false): Promise<Order[]> {
  return loadCached(key(userId, "budget-orders"), loader, force)
}

export function loadCachedBudgetOrdersCount(userId: string, loader: () => Promise<number>): Promise<number> {
  return loadCached(key(userId, "budget-count"), loader)
}

export function loadCachedCompletedOrders(userId: string, loader: () => Promise<Order[]>, force = false): Promise<Order[]> {
  return loadCached(key(userId, "completed-orders"), loader, force)
}

export function invalidateOperationsCache(userId: string): void {
  const scope = `${userId}:`
  for (const cacheKey of operationsCache.keys()) {
    if (cacheKey.startsWith(scope)) operationsCache.delete(cacheKey)
  }
}
