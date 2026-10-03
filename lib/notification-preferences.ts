import { getSupabaseServerClient } from "@/lib/supabase"
import type { NotificationPreferences } from "@/lib/types"

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  inAppEnabled: true,
  orderUpdates: true,
  budgetUpdates: true,
  assignmentUpdates: true,
}

export type NotificationCategory = "order" | "budget" | "assignment"

export function notificationCategory(type: string | null | undefined): NotificationCategory {
  if (type?.startsWith("budget_")) return "budget"
  if (type?.includes("assigned") || type === "order_reassigned") return "assignment"
  return "order"
}

export function isNotificationEnabled(preferences: NotificationPreferences, type: string | null | undefined) {
  if (!preferences.inAppEnabled) return false
  const category = notificationCategory(type)
  if (category === "budget") return preferences.budgetUpdates
  if (category === "assignment") return preferences.assignmentUpdates
  return preferences.orderUpdates
}

export async function fetchNotificationPreferencesForUser(userId: string): Promise<NotificationPreferences> {
  if (!userId) return DEFAULT_NOTIFICATION_PREFERENCES

  const supabase = getSupabaseServerClient()
  const { data, error } = await supabase
    .from("notification_preferences")
    .select("in_app_enabled, order_updates, budget_updates, assignment_updates")
    .eq("user_id", userId)
    .maybeSingle()

  if (error || !data) return DEFAULT_NOTIFICATION_PREFERENCES
  return {
    inAppEnabled: data.in_app_enabled as boolean,
    orderUpdates: data.order_updates as boolean,
    budgetUpdates: data.budget_updates as boolean,
    assignmentUpdates: data.assignment_updates as boolean,
  }
}
