"use client"

import { useState, type FormEvent } from "react"
import { Loader2, Save } from "lucide-react"
import { updateOrderExpirationDaysAction } from "@/app/actions/order-settings"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useStore } from "@/lib/store"

export function OrderSettings() {
  const { orderExpirationDays, setOrderExpirationDays } = useStore()
  const [days, setDays] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setMessage("")
    setError("")
    const result = await updateOrderExpirationDaysAction(Number(days ?? orderExpirationDays))
    if (result.success) {
      setOrderExpirationDays(result.days ?? Number(days ?? orderExpirationDays))
      setMessage("Configuración guardada.")
    }
    else setError(result.error ?? "No se pudo guardar la configuración.")
    setSaving(false)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Expiración de órdenes</CardTitle>
        <CardDescription>Definí cuántos días después de su creación una orden se considera vencida.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="max-w-md space-y-4" onSubmit={(event) => void handleSubmit(event)}>
          <div className="space-y-2">
            <Label htmlFor="order-expiration-days">Días hasta la expiración</Label>
            <Input id="order-expiration-days" type="number" min={1} max={3650} step={1} value={days ?? orderExpirationDays} disabled={saving} onChange={(event) => setDays(event.target.value)} />
            <p className="text-xs text-muted-foreground">El color de las tarjetas cambia gradualmente al acercarse la fecha. Las órdenes entregadas quedan fuera del cálculo.</p>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          {message && <p className="text-sm text-emerald-600">{message}</p>}
          <Button type="submit" disabled={saving} className="gap-2">
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            Guardar configuración
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
