"use client"

import { useMemo, useState } from "react"
import { Bell, Inbox, Loader2, Plus, Receipt, Search, Wrench } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { StatusBadge } from "@/components/status-badge"
import { RepairTimeline } from "@/components/repair-timeline"
import { ClientOrderForm } from "@/components/client/client-order-form"
import { useStore, formatCurrency } from "@/lib/store"
import { budgetTotal, type Order } from "@/lib/types"
import { cn, normalizeOrderCode } from "@/lib/utils"

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
}
function ClientOrderDetail({ order }: { order: Order }) {
  const total = budgetTotal(order)
  const notifications = [...order.notifications].reverse()

  return (
    <div className="animate-utech-enter space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold text-foreground">{order.deviceBrand} {order.deviceModel}</h3>
            <span className="rounded-md bg-secondary px-2 py-0.5 font-mono text-xs text-secondary-foreground">{order.code}</span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {order.deviceType} · Creado el {formatDate(order.createdAt)}
            {order.deviceSerial && ` · Serial: ${order.deviceSerial}`}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">📞 {order.clientPhone}</p>
        </div>
        <StatusBadge status={order.status} className="self-start text-sm" />
      </div>

      <Card>
        <CardContent className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <Wrench className="size-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Estado actual</p>
            <p className="font-medium text-foreground">Seguimiento de reparación</p>
          </div>
        </CardContent>
      </Card>

      <div className="rounded-lg border border-border bg-secondary/30 p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Falla reportada</p>
        <p className="mt-1 text-sm text-foreground">{order.fault}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Seguimiento</CardTitle>
          </CardHeader>
          <CardContent>
            <RepairTimeline order={order} />
          </CardContent>
        </Card>

        <div className="space-y-6">
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

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Bell className="size-4 text-primary" />
                Notificaciones
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {notifications.length === 0 ? (
                <p className="text-sm text-muted-foreground">Todavía no tenés notificaciones.</p>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={cn(
                      "rounded-md border p-3",
                      notification.read ? "border-border bg-card" : "border-primary/30 bg-primary/5",
                    )}
                  >
                    <p className="text-sm text-foreground">{notification.message}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{formatDate(notification.date)}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export function ClientPortal() {
  const { orders, ordersLoading, markNotificationsRead } = useStore()
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)

  const filteredOrders = useMemo(() => {
    const query = searchQuery.trim()
    if (!query) return orders

    const normalizedCode = normalizeOrderCode(query)
    const lowerQuery = query.toLowerCase()
    return orders.filter((order) => {
      const matchesCode = normalizeOrderCode(order.code).includes(normalizedCode)
      const matchesDevice = `${order.deviceBrand} ${order.deviceModel}`.toLowerCase().includes(lowerQuery)
      const matchesSerial = order.deviceSerial?.toLowerCase().includes(lowerQuery) ?? false
      const matchesStatus = order.status.toLowerCase().includes(lowerQuery)
      return matchesCode || matchesDevice || matchesSerial || matchesStatus
    })
  }, [orders, searchQuery])

  const selectedOrder = orders.find((order) => order.id === selectedOrderId) ?? orders[0] ?? null

  function handleSelectOrder(orderId: string) {
    setSelectedOrderId(orderId)
    markNotificationsRead(orderId)
  }

  return (
    <div className="animate-utech-enter space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">Mis órdenes</h2>
          <p className="text-sm text-muted-foreground">
            {orders.length} {orders.length === 1 ? "orden asociada" : "órdenes asociadas"} a tu cuenta
          </p>
        </div>
        <Button className="gap-2" onClick={() => setDialogOpen(true)} disabled={ordersLoading}>
          <Plus className="size-4" />
          Nueva orden
        </Button>
      </div>

      <div className="grid gap-5 lg:grid-cols-[340px_1fr]">
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Buscar por código, equipo, serial o estado..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              disabled={ordersLoading}
              className="pl-9"
            />
          </div>

          {ordersLoading ? (
            <div role="status" aria-live="polite" className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border py-8 text-center">
              <Loader2 className="size-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Cargando tus órdenes…</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border py-8 text-center">
              <Inbox className="size-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {orders.length === 0 ? "Todavía no tenés órdenes asociadas." : "No se encontraron órdenes."}
              </p>
            </div>
          ) : (
            filteredOrders.map((order) => (
              <Button
                key={order.id}
                type="button"
                variant="ghost"
                onClick={() => handleSelectOrder(order.id)}
                className={cn(
                  "h-auto w-full justify-start rounded-xl border bg-card p-4 text-left transition-[background-color,border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:bg-secondary/40 hover:shadow-lg hover:shadow-black/10",
                  order.id === selectedOrder?.id ? "border-primary/60 ring-1 ring-primary/40" : "border-border",
                )}
              >
                <span className="flex w-full flex-col items-stretch gap-2">
                  <span className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-medium text-foreground">{order.code}</span>
                    <StatusBadge status={order.status} />
                  </span>
                  <span className="truncate text-sm text-muted-foreground">
                    {order.deviceType} · {order.deviceBrand} {order.deviceModel}
                    {order.deviceSerial && ` · Serial: ${order.deviceSerial}`}
                  </span>
                  <span className="text-xs text-muted-foreground/70">Creado {formatDate(order.createdAt)}</span>
                </span>
              </Button>
            ))
          )}
        </div>

        <Card>
          <CardContent className="pt-6">
            {selectedOrder ? (
              <ClientOrderDetail key={selectedOrder.id} order={selectedOrder} />
            ) : (
              <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                <Inbox className="size-10 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Seleccioná una orden para ver su detalle.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nueva orden de reparación</DialogTitle>
            <DialogDescription>
              Completá los datos de tu equipo. Un colaborador revisará la solicitud y la tomará para comenzar el trabajo.
            </DialogDescription>
          </DialogHeader>
          <ClientOrderForm
            onCreatedAction={(id) => {
              setSelectedOrderId(id)
              setDialogOpen(false)
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
