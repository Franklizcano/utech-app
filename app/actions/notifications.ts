"use server"

import { getSessionAction } from "@/app/actions/auth"
import { fetchNotificationPreferencesForUser, isNotificationEnabled } from "@/lib/notification-preferences"
import { getSupabaseServerClient } from "@/lib/supabase"
import type { AppNotification } from "@/lib/types"

function rowToNotification(row: Record<string, unknown>): AppNotification {
  return {
    id: row.id as string,
    orderId: (row.order_id as string | null) ?? undefined,
    title: (row.title as string | null) ?? undefined,
    message: row.message as string,
    type: (row.notification_type as string | null) ?? undefined,
    priority: row.priority === "important" ? "important" : "normal",
    date: row.notification_date as string,
    read: Boolean(row.read),
    readAt: (row.read_at as string | null) ?? null,
  }
}

export async function fetchNotificationsAction(limit = 40): Promise<AppNotification[]> {
  const session = await getSessionAction()
  if (!session || !session.active) return []

  const safeLimit = Math.min(100, Math.max(1, Math.trunc(limit)))
  const preferences = await fetchNotificationPreferencesForUser(session.id)
  const supabase = getSupabaseServerClient()
  const { data, error } = await supabase
    .from("notifications")
    .select("id, order_id, title, message, notification_type, priority, read, read_at, notification_date")
    .eq("recipient_user_id", session.id)
    .order("notification_date", { ascending: false })
    .limit(safeLimit)

  if (error) {
    console.error("Error al cargar notificaciones:", error.message)
    return []
  }

  return (data ?? [])
    .filter((row) => isNotificationEnabled(preferences, row.notification_type as string | null))
    .map((row) => rowToNotification(row as Record<string, unknown>))
}

export async function fetchUnreadNotificationsCountAction(): Promise<number> {
  const session = await getSessionAction()
  if (!session || !session.active) return 0

  const preferences = await fetchNotificationPreferencesForUser(session.id)
  const supabase = getSupabaseServerClient()
  const { data, error } = await supabase
    .from("notifications")
    .select("id, notification_type")
    .eq("recipient_user_id", session.id)
    .eq("read", false)

  if (error) {
    console.error("Error al contar notificaciones:", error.message)
    return 0
  }

  return (data ?? []).filter((row) => isNotificationEnabled(preferences, row.notification_type as string | null)).length
}

export async function markNotificationReadAction(notificationId: string): Promise<boolean> {
  const session = await getSessionAction()
  if (!session || !session.active || !notificationId) return false

  const now = new Date().toISOString()
  const supabase = getSupabaseServerClient()
  const { data, error } = await supabase
    .from("notifications")
    .update({ read: true, read_at: now })
    .eq("id", notificationId)
    .eq("recipient_user_id", session.id)
    .select("id")
    .maybeSingle()

  return !error && Boolean(data)
}

export async function markAllNotificationsReadAction(): Promise<boolean> {
  const session = await getSessionAction()
  if (!session || !session.active) return false

  const now = new Date().toISOString()
  const supabase = getSupabaseServerClient()
  const { error } = await supabase
    .from("notifications")
    .update({ read: true, read_at: now })
    .eq("recipient_user_id", session.id)
    .eq("read", false)

  return !error
}
