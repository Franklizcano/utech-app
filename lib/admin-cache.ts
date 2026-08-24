import type { Company, User } from "@/lib/types"

const ADMIN_CACHE_TTL_MS = 2 * 60 * 1000

interface CacheEntry<T> {
  value: T
  updatedAt: number
  inFlight?: Promise<T>
}

const userPagesCache = new Map<string, CacheEntry<{ users: User[]; hasMore: boolean }>>()
const companyPagesCache = new Map<string, CacheEntry<{ companies: Company[]; hasMore: boolean }>>()

function normalizeSearch(search: string): string {
  return search.trim().toLocaleLowerCase()
}

function isFresh<T>(entry: CacheEntry<T> | undefined): entry is CacheEntry<T> {
  return Boolean(entry && Date.now() - entry.updatedAt < ADMIN_CACHE_TTL_MS)
}

function loadCached<T>(cache: Map<string, CacheEntry<T>>, key: string, loader: () => Promise<T>, force = false): Promise<T> {
  const current = cache.get(key)
  if (!force && isFresh(current)) return Promise.resolve(current.value)
  if (current?.inFlight) return current.inFlight

  const request = loader().then(
    (value) => {
      cache.set(key, { value, updatedAt: Date.now() })
      return value
    },
    (error: unknown) => {
      if (current) cache.set(key, { value: current.value, updatedAt: current.updatedAt })
      else cache.delete(key)
      throw error
    },
  )

  cache.set(key, {
    value: current?.value ?? (undefined as T),
    updatedAt: current?.updatedAt ?? 0,
    inFlight: request,
  })

  return request
}

function userScope(userId: string): string {
  return `users:${userId}:`
}

function companyScope(userId: string): string {
  return `companies:${userId}:`
}

export function loadCachedUsersPage(
  userId: string,
  page: number,
  search: string,
  loader: () => Promise<{ users: User[]; hasMore: boolean }>,
  force = false,
): Promise<{ users: User[]; hasMore: boolean }> {
  return loadCached(userPagesCache, `${userScope(userId)}${page}:${normalizeSearch(search)}`, loader, force)
}

export function invalidateCachedUsers(userId: string): void {
  for (const key of userPagesCache.keys()) {
    if (key.startsWith(userScope(userId))) userPagesCache.delete(key)
  }
}

export function loadCachedCompaniesPage(
  userId: string,
  page: number,
  loader: () => Promise<{ companies: Company[]; hasMore: boolean }>,
  force = false,
): Promise<{ companies: Company[]; hasMore: boolean }> {
  return loadCached(companyPagesCache, `${companyScope(userId)}${page}`, loader, force)
}

export function invalidateCachedCompanies(userId: string): void {
  for (const key of companyPagesCache.keys()) {
    if (key.startsWith(companyScope(userId))) companyPagesCache.delete(key)
  }
}
