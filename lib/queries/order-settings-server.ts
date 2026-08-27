import { getSupabaseServerClient } from "@/lib/supabase"

export const DEFAULT_ORDER_EXPIRATION_DAYS = 30

export async function fetchOrderExpirationDaysServer(): Promise<number> {
  const supabase = getSupabaseServerClient()
  const { data, error } = await supabase
    .from("app_settings")
    .select("value_integer")
    .eq("key", "order_expiration_days")
    .maybeSingle()

  if (error) {
    console.error("Error al traer la configuración de expiración:", error.message)
    return DEFAULT_ORDER_EXPIRATION_DAYS
  }

  const value = Number(data?.value_integer)
  return Number.isInteger(value) && value >= 1 && value <= 3650 ? value : DEFAULT_ORDER_EXPIRATION_DAYS
}

export async function updateOrderExpirationDaysServer(days: number, userId: string): Promise<boolean> {
  const supabase = getSupabaseServerClient()
  const { error } = await supabase.from("app_settings").upsert({
    key: "order_expiration_days",
    value_integer: days,
    updated_by: userId,
    updated_at: new Date().toISOString(),
  })
  if (error) {
    console.error("Error al actualizar la configuración de expiración:", error.message)
    return false
  }
  return true
}
