"use server"

import { getSessionAction } from "@/app/actions/auth"
import { fetchNotificationPreferencesForUser, DEFAULT_NOTIFICATION_PREFERENCES } from "@/lib/notification-preferences"
import { getSupabaseServerClient } from "@/lib/supabase"
import type { NotificationPreferences } from "@/lib/types"

export async function fetchNotificationPreferencesAction(): Promise<NotificationPreferences> {
  const session = await getSessionAction()
  if (!session || !session.active) return DEFAULT_NOTIFICATION_PREFERENCES
  return fetchNotificationPreferencesForUser(session.id)
}

export async function updateNotificationPreferencesAction(input: Partial<NotificationPreferences>): Promise<boolean> {
  const session = await getSessionAction()
  if (!session || !session.active) return false

  const current = await fetchNotificationPreferencesForUser(session.id)
  const preferences: NotificationPreferences = {
    inAppEnabled: typeof input.inAppEnabled === "boolean" ? input.inAppEnabled : current.inAppEnabled,
    orderUpdates: typeof input.orderUpdates === "boolean" ? input.orderUpdates : current.orderUpdates,
    budgetUpdates: typeof input.budgetUpdates === "boolean" ? input.budgetUpdates : current.budgetUpdates,
    assignmentUpdates: typeof input.assignmentUpdates === "boolean" ? input.assignmentUpdates : current.assignmentUpdates,
  }

  const supabase = getSupabaseServerClient()
  const { error } = await supabase.from("notification_preferences").upsert({
    user_id: session.id,
    in_app_enabled: preferences.inAppEnabled,
    order_updates: preferences.orderUpdates,
    budget_updates: preferences.budgetUpdates,
    assignment_updates: preferences.assignmentUpdates,
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id" })

  if (error) {
    console.error("Error al guardar preferencias de notificaciones:", error.message)
    return false
  }
  return true
}
