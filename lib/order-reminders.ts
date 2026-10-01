export const ORDER_REMINDER_INTERVALS = [6, 12, 24] as const
export type OrderReminderInterval = (typeof ORDER_REMINDER_INTERVALS)[number]
export const DEFAULT_ORDER_REMINDER_MESSAGE = "Te recordamos que es momento de realizar el mantenimiento de tu equipo."

export function addMonthsClamped(date: Date, months: number): Date {
  const result = new Date(date)
  const day = result.getUTCDate()
  result.setUTCDate(1)
  result.setUTCMonth(result.getUTCMonth() + months)
  const lastDay = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate()
  result.setUTCDate(Math.min(day, lastDay))
  return result
}

export function advanceReminderDate(date: Date, intervalMonths: number, now = new Date()): Date {
  let next = addMonthsClamped(date, intervalMonths)
  while (next <= now) next = addMonthsClamped(next, intervalMonths)
  return next
}
