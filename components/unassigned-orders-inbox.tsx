"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Inbox, Loader2, Plus } from "lucide-react"
import { assignOrderAction, claimOrderAction, fetchAvailableOrdersAction, fetchAvailableOrdersCountAction } from "@/app/actions/orders"
import { StatusBadge } from "@/components/status-badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useStore } from "@/lib/store"
import { invalidateOperationsCache, loadCachedAvailableOrders, loadCachedAvailableOrdersCount } from "@/lib/operations-cache"
import type { Order } from "@/lib/types"

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function UnassignedOrdersInbox() {
  const { currentUser, employees, ordersLoading, refreshOrders } = useStore()
  const [open, setOpen] = useState(false)
  const [availableOrders, setAvailableOrders] = useState<Order[]>([])
  const [availableOrdersCount, setAvailableOrdersCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [claimingOrderId, setClaimingOrderId] = useState<string | null>(null)
  const [assigningOrderId, setAssigningOrderId] = useState<string | null>(null)
  const [selectedAssignees, setSelectedAssignees] = useState<Record<string, string>>({})
  const [error, setError] = useState("")
  const countCheckKey = useRef<string | null>(null)

  useEffect(() => {
    const role = currentUser?.role
    if (!currentUser || !currentUser.active || (role !== "admin" && role !== "colaborador")) {
      countCheckKey.current = null
      return
    }

    const key = `${currentUser.id}:${role}`
    if (countCheckKey.current === key) return
    countCheckKey.current = key

    void loadCachedAvailableOrdersCount(currentUser.id, fetchAvailableOrdersCountAction)
      .then((count: number) => setAvailableOrdersCount(count))
      .catch((countError: unknown) => {
        console.error("No se pudo contar el buzón de órdenes:", countError)
      })
  }, [currentUser])

  const refreshInbox = useCallback(async (force = false) => {
    if (!currentUser) return
    setLoading(true)
    try {
      const nextOrders = await loadCachedAvailableOrders(currentUser.id, fetchAvailableOrdersAction, force)
      setAvailableOrders(nextOrders)
      setAvailableOrdersCount(nextOrders.length)
    } catch (refreshError) {
      console.error("No se pudieron cargar las órdenes disponibles:", refreshError)
      setError("No se pudo actualizar el buzón.")
    } finally {
      setLoading(false)
    }
  }, [currentUser])

  if (!currentUser || !["admin", "colaborador"].includes(currentUser.role)) return null

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen)
    if (nextOpen) {
      setError("")
      void refreshInbox()
    }
  }

  async function handleClaim(orderId: string) {
    setError("")
    setClaimingOrderId(orderId)

    try {
      const claimed = await claimOrderAction(orderId)
      if (!claimed) {
        setError("La orden ya fue tomada por otro usuario o dejó de estar disponible.")
        if (currentUser) invalidateOperationsCache(currentUser.id)
        await refreshInbox(true)
        return
      }

      if (currentUser) invalidateOperationsCache(currentUser.id)
      await Promise.all([refreshInbox(true), refreshOrders()])
    } catch (claimError) {
      console.error("No se pudo tomar la orden:", claimError)
      setError("No se pudo tomar la orden. Intentá nuevamente.")
    } finally {
      setClaimingOrderId(null)
    }
  }

  async function handleAssign(orderId: string) {
    const collaboratorId = selectedAssignees[orderId]
    if (!collaboratorId) return

    setError("")
    setAssigningOrderId(orderId)
    try {
      const assigned = await assignOrderAction(orderId, collaboratorId)
      if (!assigned) {
        setError("La orden ya fue tomada o el colaborador seleccionado no está disponible.")
        if (currentUser) invalidateOperationsCache(currentUser.id)
        await refreshInbox(true)
        return
      }

      setSelectedAssignees((current) => {
        const next = { ...current }
        delete next[orderId]
        return next
      })
      if (currentUser) invalidateOperationsCache(currentUser.id)
      await Promise.all([refreshInbox(true), refreshOrders()])
    } catch (assignError) {
      console.error("No se pudo asignar la orden:", assignError)
      setError("No se pudo asignar la orden. Intentá nuevamente.")
    } finally {
      setAssigningOrderId(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <Button type="button" variant="outline" className="gap-2" onClick={() => handleOpenChange(true)}>
        <Inbox className="size-4" />
        Buzón de órdenes
        {availableOrdersCount > 0 && (
          <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
            {availableOrdersCount}
          </span>
        )}
      </Button>

      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Buzón de órdenes sin asignar</DialogTitle>
          <DialogDescription>
            Solicitudes de clientes registrados que todavía esperan un colaborador.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">{error}</p>}

          {loading ? (
            <div role="status" aria-live="polite" className="flex items-center gap-2 rounded-lg border border-dashed border-border px-4 py-8 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin text-primary" />
              Actualizando el buzón…
            </div>
          ) : availableOrders.length === 0 ? (
            <div className="flex items-center gap-3 rounded-lg border border-dashed border-border px-4 py-8 text-sm text-muted-foreground">
              <Inbox className="size-5" />
              No hay órdenes nuevas para tomar.
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {availableOrders.map((order) => (
                <div key={order.id} className="rounded-lg border border-border bg-secondary/20 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">{order.clientName}</p>
                      <p className="font-mono text-xs text-muted-foreground">{order.code}</p>
                    </div>
                    <StatusBadge status={order.status} />
                  </div>
                  <p className="mt-3 truncate text-sm text-muted-foreground">{order.deviceType} · {order.deviceBrand} {order.deviceModel}</p>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground/80">{order.fault}</p>
                  <p className="mt-2 text-xs text-muted-foreground/70">Creada {formatDate(order.createdAt)}</p>
                  <Button
                    type="button"
                    className="mt-4 w-full gap-2"
                    disabled={claimingOrderId !== null || assigningOrderId !== null || ordersLoading}
                    onClick={() => void handleClaim(order.id)}
                  >
                    {claimingOrderId === order.id ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                    {claimingOrderId === order.id ? "Tomando..." : "Tomar orden"}
                  </Button>
                  {currentUser?.role === "admin" && (
                    <div className="mt-3 space-y-2 border-t border-border pt-3">
                      <p className="text-xs font-medium text-muted-foreground">Asignar a un colaborador</p>
                      {employees.filter((employee) => employee.role === "colaborador" && employee.active).length === 0 ? (
                        <p className="text-xs text-muted-foreground">No hay colaboradores activos disponibles.</p>
                      ) : (
                        <>
                          <Select
                            value={selectedAssignees[order.id] ?? ""}
                            onValueChange={(value) => {
                              if (value) {
                                setSelectedAssignees((current) => ({ ...current, [order.id]: value }))
                              }
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar colaborador" />
                            </SelectTrigger>
                            <SelectContent>
                              {employees
                                .filter((employee) => employee.role === "colaborador" && employee.active)
                                .map((employee) => (
                                  <SelectItem key={employee.id} value={employee.id}>
                                    {employee.name}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                          <Button
                            type="button"
                            variant="secondary"
                            className="w-full gap-2"
                            disabled={!selectedAssignees[order.id] || claimingOrderId !== null || assigningOrderId !== null || ordersLoading}
                            onClick={() => void handleAssign(order.id)}
                          >
                            {assigningOrderId === order.id && <Loader2 className="size-4 animate-spin" />}
                            {assigningOrderId === order.id ? "Asignando..." : "Asignar orden"}
                          </Button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}


