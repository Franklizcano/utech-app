import type { Announcement } from "@/lib/types"

const ANNOUNCEMENTS_CACHE_TTL_MS = 2 * 60 * 1000

interface CacheEntry {
  value: Announcement[]
  updatedAt: number
  inFlight?: Promise<Announcement[]>
}

const cache = new Map<string, CacheEntry>()

export function loadCachedAnnouncements(
  userId: string,
  loader: () => Promise<Announcement[]>,
): Promise<Announcement[]> {
  const current = cache.get(userId)
  if (current && Date.now() - current.updatedAt < ANNOUNCEMENTS_CACHE_TTL_MS) {
    return Promise.resolve(current.value)
  }
  if (current?.inFlight) return current.inFlight

  const request = loader().then(
    (value) => {
      cache.set(userId, { value, updatedAt: Date.now() })
      return value
    },
    (error: unknown) => {
      if (current) cache.set(userId, current)
      else cache.delete(userId)
      throw error
    },
  )

  cache.set(userId, {
    value: current?.value ?? [],
    updatedAt: current?.updatedAt ?? 0,
    inFlight: request,
  })
  return request
}

export function invalidateAnnouncementsCache(userId?: string): void {
  if (userId) cache.delete(userId)
  else cache.clear()
}
