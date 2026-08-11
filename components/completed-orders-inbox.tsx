"use client"

import { useCallback, useState } from "react"
import { Archive, ArrowUpRight, CheckCircle2, Loader2 } from "lucide-react"
import { fetchCompletedOrdersAction } from "@/app/actions/orders"
import { StatusBadge } from "@/components/status-badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useStore, formatCurrency } from "@/lib/store"
import { budgetTotal, type Order } from "@/lib/types"

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

function getCompletionDate(order: Order) {
  return order.timeline.findLast((event) => event.status === "entregado")?.date ?? order.createdAt
}

export function CompletedOrdersInbox({ onSelectOrderAction }: { onSelectOrderAction: (orderId: string) => void }) {
  const { currentUser } = useStore()
  const [open, setOpen] = useState(false)
  const [completedOrders, setCompletedOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const isCollaborator = currentUser?.role === "colaborador"

  const refreshInbox = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      setCompletedOrders(await fetchCompletedOrdersAction())
    } catch (refreshError) {
      console.error("No se pudieron cargar las órdenes finalizadas:", refreshError)
      setError("No se pudo actualizar el buzón.")
    } finally {
      setLoading(false)
    }
  }, [])

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen)
    if (nextOpen) void refreshInbox()
  }

  function handleSelectOrder(orderId: string) {
    setOpen(false)
    onSelectOrderAction(orderId)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <Button type="button" variant="outline" className="gap-2" onClick={() => handleOpenChange(true)}>
        <Archive className="size-4" />
        Órdenes finalizadas
        {completedOrders.length > 0 && (
          <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
            {completedOrders.length}
          </span>
        )}
      </Button>

      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Archive className="size-5 text-primary" />
            Órdenes finalizadas
          </DialogTitle>
          <DialogDescription>
            {isCollaborator
              ? "Órdenes entregadas durante el último mes. El panel principal conserva solo el trabajo activo."
              : "Órdenes entregadas que ya no requieren seguimiento operativo."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">{error}</p>}

          {loading ? (
            <div role="status" aria-live="polite" className="flex items-center gap-2 rounded-xl border border-dashed border-border px-4 py-8 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin text-primary" />
              Actualizando el buzón…
            </div>
          ) : completedOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border px-4 py-10 text-center">
              <CheckCircle2 className="size-8 text-muted-foreground" />
              <p className="text-sm font-medium text-foreground">No hay órdenes finalizadas recientes</p>
              <p className="text-xs text-muted-foreground">
                {isCollaborator ? "Las entregadas se conservan visibles durante 30 días." : "Las órdenes entregadas aparecerán en este buzón."}
              </p>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {completedOrders.map((order) => {
                const total = budgetTotal(order)
                return (
                  <div key={order.id} className="rounded-xl border border-border bg-secondary/20 p-4 transition-[background-color,border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:bg-secondary/35 hover:shadow-lg hover:shadow-black/10">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground">{order.clientName}</p>
                        <p className="font-mono text-xs text-muted-foreground">{order.code}</p>
                      </div>
                      <StatusBadge status={order.status} />
                    </div>
                    <p className="mt-3 truncate text-sm text-muted-foreground">{order.deviceType} · {order.deviceBrand} {order.deviceModel}</p>
                    <div className="mt-3 flex items-center justify-between gap-3 border-t border-border/70 pt-3 text-xs text-muted-foreground">
                      <span>Entregada {formatDate(getCompletionDate(order))}</span>
                      {total > 0 && <span className="font-medium tabular-nums text-foreground">{formatCurrency(total)}</span>}
                    </div>
                    <Button type="button" variant="secondary" className="mt-4 w-full gap-2" onClick={() => handleSelectOrder(order.id)}>
                      Ver detalle
                      <ArrowUpRight className="size-4" />
                    </Button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}



