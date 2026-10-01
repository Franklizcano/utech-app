"use client"

import { useState } from "react"
import { BellRing } from "lucide-react"
import { saveOrderReminderAction } from "@/app/actions/order-history"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useStore } from "@/lib/store"
import { DEFAULT_ORDER_REMINDER_MESSAGE } from "@/lib/order-reminders"
import { invalidateOperationsCache } from "@/lib/operations-cache"
import type { Order } from "@/lib/types"

export function OrderReminderDialog({ order, open, onOpenChange }: { order: Order; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { currentUser, refreshOrders, loadOrderDetail } = useStore()
  const [enabled, setEnabled] = useState(Boolean(order.orderReminder?.active))
  const [interval, setInterval] = useState(String(order.orderReminder?.intervalMonths ?? 12))
  const [message, setMessage] = useState(order.orderReminder?.message ?? DEFAULT_ORDER_REMINDER_MESSAGE)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState(false)

  function markChanged() {
    setSaved(false)
    setError(false)
  }

  async function handleSave() {
    setSaving(true)
    const ok = await saveOrderReminderAction(order.id, enabled ? Number(interval) : null, message)
    setSaving(false)
    if (!ok) {
      setError(true)
      return
    }

    setSaved(true)
    if (currentUser) invalidateOperationsCache(currentUser.id)
    await refreshOrders()
    await loadOrderDetail(order.id, true)
  }

  const unchanged = enabled === Boolean(order.orderReminder?.active) && (
    !enabled || Number(interval) === (order.orderReminder?.intervalMonths ?? 12) && message === (order.orderReminder?.message ?? DEFAULT_ORDER_REMINDER_MESSAGE)
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><BellRing className="size-4" />Avisos recurrentes</DialogTitle>
          <DialogDescription>Configurá el mensaje y la frecuencia del recordatorio para esta orden.</DialogDescription>
        </DialogHeader>

        {order.clientId ? (
          <div className="space-y-4">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="size-4 accent-primary" checked={enabled} onChange={(event) => { setEnabled(event.target.checked); markChanged() }} />
              Activar recordatorio recurrente
            </label>
            {enabled && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="order-reminder-message">Mensaje para el cliente</Label>
                  <Textarea
                    id="order-reminder-message"
                    value={message}
                    maxLength={1000}
                    rows={4}
                    onChange={(event) => { setMessage(event.target.value); markChanged() }}
                    placeholder={DEFAULT_ORDER_REMINDER_MESSAGE}
                  />
                  <p className="text-right text-xs text-muted-foreground">{message.length}/1000</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="order-reminder-interval">Frecuencia</Label>
                  <select
                    id="order-reminder-interval"
                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={interval}
                    onChange={(event) => { setInterval(event.target.value); markChanged() }}
                  >
                    <option value="6">Cada 6 meses</option>
                    <option value="12">Cada 1 año (predeterminado)</option>
                    <option value="24">Cada 2 años</option>
                  </select>
                </div>
              </>
            )}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-3">
              <p className="text-xs text-muted-foreground">
                {order.orderReminder?.nextReminderAt
                  ? `Próximo aviso: ${new Date(order.orderReminder.nextReminderAt).toLocaleDateString("es-AR")}`
                  : "El ciclo comienza al marcar la orden como entregada."}
              </p>
              <Button type="button" variant="outline" disabled={saving || unchanged} onClick={() => void handleSave()}>
                {saving ? "Guardando…" : saved ? "Guardado" : "Guardar"}
              </Button>
            </div>
            {error && <p role="alert" className="text-sm text-destructive">No se pudo guardar el recordatorio. Intentá nuevamente.</p>}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Los clientes ocasionales consultan el estado manualmente y no reciben avisos in-app.</p>
        )}
      </DialogContent>
    </Dialog>
  )
}
