"use client"

import { useEffect, useState } from "react"
import { Loader2, Save } from "lucide-react"
import { fetchNotificationPreferencesAction, updateNotificationPreferencesAction } from "@/app/actions/notification-preferences"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import type { NotificationPreferences as NotificationPreferencesValue } from "@/lib/types"

const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferencesValue = {
  inAppEnabled: true,
  orderUpdates: true,
  budgetUpdates: true,
  assignmentUpdates: true,
}

const OPTIONS: Array<{ key: keyof Omit<NotificationPreferencesValue, "inAppEnabled">; label: string; description: string }> = [
  { key: "orderUpdates", label: "Actualizaciones de órdenes", description: "Cambios de estado y novedades del ticket." },
  { key: "budgetUpdates", label: "Presupuestos", description: "Presupuestos disponibles, aceptados o rechazados." },
  { key: "assignmentUpdates", label: "Asignaciones y tareas", description: "Órdenes tomadas, asignadas o reasignadas." },
]

export function NotificationPreferences() {
  const [preferences, setPreferences] = useState<NotificationPreferencesValue>(DEFAULT_NOTIFICATION_PREFERENCES)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    const loadTimer = window.setTimeout(() => {
      fetchNotificationPreferencesAction().then(setPreferences).finally(() => setLoading(false))
    }, 0)
    return () => window.clearTimeout(loadTimer)
  }, [])

  function updatePreference(key: keyof NotificationPreferencesValue, value: boolean) {
    setMessage(null)
    setPreferences((current) => ({ ...current, [key]: value }))
  }

  async function save() {
    setSaving(true)
    setMessage(null)
    const ok = await updateNotificationPreferencesAction(preferences)
    setMessage(ok ? "Preferencias guardadas." : "No se pudieron guardar las preferencias.")
    if (ok) window.dispatchEvent(new Event("utech:notification-preferences-updated"))
    setSaving(false)
  }

  if (loading) return <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" />Cargando preferencias…</div>

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4 rounded-lg border border-border bg-muted/20 p-3">
        <div className="space-y-1">
          <Label htmlFor="in-app-notifications" className="font-medium">Notificaciones in-app</Label>
          <p className="text-xs text-muted-foreground">Controlá qué aparece en la campanita.</p>
        </div>
        <input id="in-app-notifications" type="checkbox" className="mt-1 size-4 accent-primary" checked={preferences.inAppEnabled} onChange={(event) => updatePreference("inAppEnabled", event.target.checked)} />
      </div>

      <div className="space-y-2">
        {OPTIONS.map((option) => (
          <label key={option.key} className="flex cursor-pointer items-start justify-between gap-4 rounded-lg border border-border p-3 transition-colors hover:bg-muted/30">
            <span className="space-y-1">
              <span className="block text-sm font-medium text-foreground">{option.label}</span>
              <span className="block text-xs text-muted-foreground">{option.description}</span>
            </span>
            <input type="checkbox" className="mt-1 size-4 accent-primary" checked={preferences[option.key]} disabled={!preferences.inAppEnabled} onChange={(event) => updatePreference(option.key, event.target.checked)} />
          </label>
        ))}
      </div>

      {message && <p role="status" className="text-sm text-muted-foreground">{message}</p>}
      <Button type="button" className="w-full gap-2" disabled={saving} onClick={() => void save()}>
        {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
        {saving ? "Guardando…" : "Guardar preferencias"}
      </Button>
    </div>
  )
}
