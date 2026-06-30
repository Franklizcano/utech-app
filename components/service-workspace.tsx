"use client"

import { useState } from "react"
import { Plus, Inbox } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { StatusBadge } from "@/components/status-badge"
import { OrderForm } from "@/components/employee/order-form"
import { OrderDetail } from "@/components/employee/order-detail"
import { useStore, formatCurrency } from "@/lib/store"
import { budgetTotal } from "@/lib/types"
import { cn } from "@/lib/utils"

export function ServiceWorkspace() {
  const { orders } = useStore()
  const [selectedId, setSelectedId] = useState<string | null>(orders[0]?.id ?? null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const selected = orders.find((o) => o.id === selectedId) ?? null

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Pedidos</h2>
          <p className="text-sm text-muted-foreground">{orders.length} órdenes de reparación en el sistema</p>
        </div>
        <Button className="gap-2" onClick={() => setDialogOpen(true)}>
          <Plus className="size-4" />
          Nuevo pedido
        </Button>
      </div>

      <div className="grid gap-5 lg:grid-cols-[340px_1fr]">
        {/* Lista de pedidos */}
        <div className="space-y-3">
          {orders.map((order) => {
            const total = budgetTotal(order)
            const isActive = order.id === selectedId
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
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-foreground">{order.clientName}</span>
                  <span className="font-mono text-xs text-muted-foreground">{order.code}</span>
                </div>
                <p className="mt-0.5 truncate text-sm text-muted-foreground">
                  {order.deviceBrand} {order.deviceModel}
                </p>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <StatusBadge status={order.status} />
                  {total > 0 && (
                    <span className="text-xs font-medium tabular-nums text-foreground">{formatCurrency(total)}</span>
                  )}
                </div>
              </button>
            )
          })}
        </div>

        {/* Detalle */}
        <Card>
          <CardContent className="pt-6">
            {selected ? (
              <OrderDetail order={selected} />
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
            onCreated={(id) => {
              setSelectedId(id)
              setDialogOpen(false)
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
