import { advanceReminderDate } from "@/lib/order-reminders"
import { getSupabaseServerClient } from "@/lib/supabase"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = getSupabaseServerClient()
  const now = new Date()
  const { data: dueReminders, error } = await supabase
    .from("order_reminders")
    .select("id, order_id, recipient_user_id, interval_months, message, next_reminder_at")
    .eq("active", true)
    .not("next_reminder_at", "is", null)
    .lte("next_reminder_at", now.toISOString())
    .order("next_reminder_at", { ascending: true })
    .limit(500)

  if (error) {
    console.error("Error al buscar recordatorios vencidos:", error.message)
    return Response.json({ error: "No se pudieron procesar los recordatorios." }, { status: 500 })
  }

  let processed = 0
  let failed = 0
  for (const reminder of dueReminders ?? []) {
    const dueAt = reminder.next_reminder_at as string
    const recipientUserId = reminder.recipient_user_id as string | null
    const intervalMonths = Number(reminder.interval_months)
    if (!recipientUserId || ![6, 12, 24].includes(intervalMonths)) {
      await supabase.from("order_reminders").update({
        active: false,
        next_reminder_at: null,
        updated_at: now.toISOString(),
      }).eq("id", reminder.id).eq("next_reminder_at", dueAt)
      continue
    }

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, code, status, client_id")
      .eq("id", reminder.order_id)
      .maybeSingle()
    if (orderError || !order || order.client_id !== recipientUserId || order.status !== "entregado") {
      failed += 1
      continue
    }

    const dedupeKey = `maintenance:${reminder.id}:${new Date(dueAt).getTime()}`
    const { error: notificationError } = await supabase.from("notifications").upsert({
      order_id: order.id,
      recipient_user_id: recipientUserId,
      notification_type: "order_reminder",
      title: "Recordatorio sobre tu orden",
      message: reminder.message as string,
      notification_date: now.toISOString(),
      read: false,
      dedupe_key: dedupeKey,
      metadata: { intervalMonths, scheduledFor: dueAt, channel: "in_app" },
    }, { onConflict: "dedupe_key", ignoreDuplicates: true })
    if (notificationError) {
      console.error("Error al crear el aviso de la orden:", notificationError.message)
      failed += 1
      continue
    }

    const { data: notification, error: lookupError } = await supabase
      .from("notifications")
      .select("id")
      .eq("dedupe_key", dedupeKey)
      .maybeSingle()
    if (lookupError || !notification) {
      if (lookupError) console.error("Error al recuperar el aviso de la orden:", lookupError.message)
      failed += 1
      continue
    }
    const { error: deliveryError } = await supabase.from("notification_deliveries").upsert({
      notification_id: notification.id,
      channel: "in_app",
      status: "sent",
      attempt_count: 1,
      sent_at: now.toISOString(),
      updated_at: now.toISOString(),
    }, { onConflict: "notification_id,channel", ignoreDuplicates: true })
    if (deliveryError) {
      console.error("Error al registrar la entrega in-app del aviso:", deliveryError.message)
      failed += 1
      continue
    }

    const nextReminderAt = advanceReminderDate(new Date(dueAt), intervalMonths, now).toISOString()
    const { data: advancedReminder, error: advanceError } = await supabase.from("order_reminders").update({
      next_reminder_at: nextReminderAt,
      last_sent_at: now.toISOString(),
      updated_at: now.toISOString(),
    }).eq("id", reminder.id).eq("next_reminder_at", dueAt).select("id").maybeSingle()
    if (advanceError) {
      console.error("Error al avanzar el próximo recordatorio:", advanceError.message)
      failed += 1
      continue
    }
    if (advancedReminder) processed += 1
  }

  return Response.json({ processed, failed })
}
