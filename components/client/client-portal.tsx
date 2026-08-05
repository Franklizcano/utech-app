"use client"

import { useState } from "react"
import { Search, LogOut, Bell, Receipt, Wrench, KeyRound } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { StatusBadge } from "@/components/status-badge"
import { RepairTimeline } from "@/components/repair-timeline"
import { useStore, formatCurrency } from "@/lib/store"
import { budgetTotal } from "@/lib/types"
import { cn } from "@/lib/utils"

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
}

function ClientLogin() {
  const { orders, setActiveClientOrderId, markNotificationsRead } = useStore()
  const [code, setCode] = useState("")
  const [error, setError] = useState("")

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const match = orders.find((o) => o.code.toLowerCase() === code.trim().toLowerCase())
    if (!match) {
      setError("No encontramos una orden asociada a tu cuenta con ese código.")
      return
    }
    setError("")
    markNotificationsRead(match.id)
    setActiveClientOrderId(match.id)
  }

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col justify-center">
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <KeyRound className="size-6" />
          </div>
          <CardTitle>Portal de seguimiento</CardTitle>
          <p className="text-sm text-muted-foreground">Ingresá el código de tu orden para ver el estado de tu reparación.</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
               <Label htmlFor="code">Código de tu orden</Label>
              <Input
                id="code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Ej: TF-1024"
                aria-invalid={!!error}
              />
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
            <Button type="submit" className="w-full gap-2">
              <Search className="size-4" />
              Ver mi reparación
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export function ClientPortal() {
  const { orders, activeClientOrderId, setActiveClientOrderId } = useStore()
  const order = orders.find((o) => o.id === activeClientOrderId) ?? null

  if (!order) return <ClientLogin />

  const total = budgetTotal(order)
  const notifications = [...order.notifications].reverse()

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Bienvenido</p>
          <h2 className="text-2xl font-bold text-foreground">{order.clientName}</h2>
          <p className="text-sm text-muted-foreground">📞 {order.clientPhone}</p>
          <p className="text-sm text-foreground">
            {order.deviceBrand} {order.deviceModel}{" "}
            <span className="font-mono text-xs text-muted-foreground">· {order.code}</span>
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-2 self-start" onClick={() => setActiveClientOrderId(null)}>
          <LogOut className="size-4" />
          Salir
        </Button>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center justify-center gap-4 sm:flex-row sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <Wrench className="size-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Estado actual</p>
              <p className="font-medium text-foreground">Reparación en curso</p>
            </div>
          </div>
          <StatusBadge status={order.status} className="text-sm" />
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Seguimiento</CardTitle>
          </CardHeader>
          <CardContent>
            <RepairTimeline order={order} />
          </CardContent>
        </Card>

        <div className="space-y-6">
          {/* Presupuesto */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Receipt className="size-4 text-primary" />
                Presupuesto
              </CardTitle>
            </CardHeader>
            <CardContent>
              {order.budget.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Tu presupuesto todavía no está disponible. Te avisaremos cuando esté listo.
                </p>
              ) : (
                <div className="space-y-3">
                  {order.budget.map((item) => (
                    <div key={item.id} className="flex items-start justify-between gap-3 text-sm">
                      <span className="text-muted-foreground">{item.description}</span>
                      <span className="font-medium tabular-nums text-foreground">{formatCurrency(item.amount)}</span>
                    </div>
                  ))}
                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">Total a pagar</span>
                    <span className="text-lg font-semibold tabular-nums text-primary">{formatCurrency(total)}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notificaciones */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Bell className="size-4 text-primary" />
                Notificaciones
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={cn(
                    "rounded-md border p-3",
                    n.read ? "border-border bg-card" : "border-primary/30 bg-primary/5",
                  )}
                >
                  <p className="text-sm text-foreground">{n.message}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{formatDate(n.date)}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
