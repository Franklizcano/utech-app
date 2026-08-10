"use client"

import { useState, useMemo } from "react"
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
import { OrderForm } from "@/components/employee/order-form"
import { OrderDetail } from "@/components/employee/order-detail"
import { useStore, formatCurrency } from "@/lib/store"
import { budgetTotal } from "@/lib/types"
import { cn, normalizeOrderCode } from "@/lib/utils"

export function ServiceWorkspace() {
  const { role, orders, ordersLoading } = useStore()
  const [selectedId, setSelectedId] = useState<string | null>(orders[0]?.id ?? null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  // Filtrar órdenes por código o nombre de cliente
  const filteredOrders = useMemo(() => {
    if (!searchQuery.trim()) return orders

    const normalizedQuery = normalizeOrderCode(searchQuery.trim())
    const lowerQuery = searchQuery.trim().toLowerCase()

    return orders.filter((order) => {
      const matchesCode = normalizeOrderCode(order.code).includes(normalizedQuery)
      const matchesClient = order.clientName.toLowerCase().includes(lowerQuery)
      return matchesCode || matchesClient
    })
  }, [orders, searchQuery])

  const selected = orders.find((o) => o.id === selectedId) ?? (!ordersLoading ? orders[0] ?? null : null)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Pedidos</h2>
          <p className="text-sm text-muted-foreground">{orders.length} órdenes de reparación en el sistema</p>
        </div>
        <Button className="gap-2" onClick={() => setDialogOpen(true)} disabled={ordersLoading}>
          <Plus className="size-4" />
          Nuevo pedido
        </Button>
      </div>

      <UnassignedOrdersInbox />

      <div className="grid gap-5 lg:grid-cols-[340px_1fr]">
        {/* Lista de pedidos */}
        <div className="space-y-3">
          {/* Buscador */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Buscar por código o cliente..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              disabled={ordersLoading}
              className="pl-9"
            />
          </div>

          {/* Lista filtrada */}
          {ordersLoading ? (
            <div role="status" aria-live="polite" className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border py-8 text-center">
              <Loader2 className="size-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Cargando órdenes…</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border py-8 text-center">
              <Search className="size-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No se encontraron órdenes</p>
            </div>
          ) : (
            filteredOrders.map((order) => {
              const total = budgetTotal(order)
              const isActive = order.id === selected?.id
              return (
                <button
                  key={order.id}
                  type="button"
                  onClick={() => setSelectedId(order.id)}
                  className={cn(
                    "w-full rounded-lg border bg-card p-4 text-left transition-colors",
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

        {/* Detalle */}
        <Card>
          <CardContent className="pt-6">
            {selected ? (
              <OrderDetail key={selected.id} order={selected} />
            ) : (
              <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                <Inbox className="size-10 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Seleccioná un pedido para ver el detalle.</p>
              </div>
            )}
          </CardContent>
        </Card>
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
