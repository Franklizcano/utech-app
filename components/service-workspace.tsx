"use client"

import { useState, useEffect, useRef } from "react"
import { Plus, Inbox, Loader2, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { StatusBadge } from "@/components/status-badge"
import { UnassignedOrdersInbox } from "@/components/unassigned-orders-inbox"
import { CompletedOrdersInbox } from "@/components/completed-orders-inbox"
import { OrderForm } from "@/components/employee/order-form"
import { OrderDetail } from "@/components/employee/order-detail"
import { useStore, formatCurrency } from "@/lib/store"
import { budgetTotal, type Order } from "@/lib/types"
import { cn } from "@/lib/utils"

export function ServiceWorkspace() {
  const { role, orders, ordersLoading, ordersLoadingMore, ordersHasMore, loadMoreOrders, searchOrders, loadOrderDetail } = useStore()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedDetail, setSelectedDetail] = useState<Order | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const initialSearchEffect = useRef(true)

  useEffect(() => {
    if (initialSearchEffect.current) {
      initialSearchEffect.current = false
      return
    }

    const timeoutId = window.setTimeout(() => {
      void searchOrders(searchQuery.trim())
    }, 350)
    return () => window.clearTimeout(timeoutId)
  }, [searchQuery, searchOrders])

  const selected = orders.find((o) => o.id === selectedId) ?? null

  useEffect(() => {
    if (!selected?.id) {
      return
    }

    let cancelled = false
    loadOrderDetail(selected.id).then((detail) => {
      if (cancelled) return
      setSelectedDetail(detail)
    }).catch((error: unknown) => {
      if (cancelled) return
      console.error("No se pudo cargar el detalle de la orden:", error)
      setSelectedDetail(null)
    })

    return () => {
      cancelled = true
    }
  }, [selected?.id, loadOrderDetail])

  const displayedDetail = selected?.fault
    ? selected
    : selected?.id === selectedDetail?.id
      ? selectedDetail
      : null
  const detailLoading = Boolean(selected?.id && !displayedDetail)

  return (
    <div className="animate-utech-enter space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">Pedidos</h2>
          <p className="text-sm text-muted-foreground">{orders.length} órdenes cargadas</p>
        </div>
        <Button className="gap-2" onClick={() => setDialogOpen(true)} disabled={ordersLoading}>
          <Plus className="size-4" />
          Nuevo pedido
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <UnassignedOrdersInbox />
        <CompletedOrdersInbox onSelectOrderAction={setSelectedId} />
      </div>

      <div className={cn("grid gap-5", selected ? "lg:grid-cols-[340px_1fr]" : "grid-cols-1")}>
        {/* Lista de pedidos */}
        <div className="space-y-4">
          {/* Buscador */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Buscar por código, cliente o serial..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              disabled={ordersLoading}
              className="pl-9"
            />
          </div>

          {/* Lista filtrada */}
          <div className={cn("space-y-4", !selected && "grid gap-4 space-y-0 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4")}>
          {ordersLoading ? (
            <div role="status" aria-live="polite" className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border py-8 text-center">
              <Loader2 className="size-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Cargando órdenes…</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border py-8 text-center">
              <Search className="size-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No se encontraron órdenes</p>
            </div>
          ) : (
            orders.map((order) => {
              const total = budgetTotal(order)
              const isActive = order.id === selected?.id
              return (
                <button
                  key={order.id}
                  type="button"
                  onClick={() => setSelectedId(order.id)}
                  className={cn(
                    "w-full rounded-xl border bg-card p-4 text-left transition-[background-color,border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/10",
                    isActive
                      ? "border-primary/60 ring-1 ring-primary/40"
                      : "border-border hover:border-primary/30 hover:bg-secondary/40",
                  )}
                >
                  {role === "colaborador" ? (
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-sm font-medium text-foreground">{order.code}</span>
                      <StatusBadge status={order.status} />
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-foreground">{order.clientName}</span>
                        <span className="font-mono text-xs text-muted-foreground">{order.code}</span>
                      </div>
                      <p className="mt-0.5 truncate text-sm text-muted-foreground">
                        {order.deviceType} · {order.deviceBrand} {order.deviceModel}
                        {order.deviceSerial && ` · Serial: ${order.deviceSerial}`}
                      </p>
                      <div className="mt-3 flex items-center justify-between gap-2">
                        <StatusBadge status={order.status} />
                        {total > 0 && (
                          <span className="text-xs font-medium tabular-nums text-foreground">{formatCurrency(total)}</span>
                        )}
                      </div>
                    </>
                  )}
                </button>
              )
            })
          )}
          </div>
          {ordersHasMore && !ordersLoading && (
            <Button type="button" variant="outline" className="w-full" disabled={ordersLoadingMore} onClick={() => void loadMoreOrders(searchQuery.trim())}>
              {ordersLoadingMore ? "Cargando más…" : "Cargar más órdenes"}
            </Button>
          )}
        </div>

        {/* Detalle */}
        {selected && <Card>
          <CardContent className="pt-6">
            {detailLoading ? (
              <div role="status" aria-live="polite" className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
                <Loader2 className="size-5 animate-spin text-primary" />
                Cargando detalle…
              </div>
            ) : displayedDetail ? (
              <OrderDetail key={displayedDetail.id} order={displayedDetail} />
            ) : (
              <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                <Inbox className="size-10 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Seleccioná un pedido para ver el detalle.</p>
              </div>
            )}
          </CardContent>
        </Card>}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nuevo pedido</DialogTitle>
            <DialogDescription>Cargá los datos del cliente, el equipo y la falla reportada.</DialogDescription>
          </DialogHeader>
          <OrderForm
            onCreatedAction={(id: string) => {
              setSelectedId(id)
              setDialogOpen(false)
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
