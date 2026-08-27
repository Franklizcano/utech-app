"use client"

import { useEffect, useRef, useState } from "react"
import { Calculator, Inbox, Loader2, Plus } from "lucide-react"
import { claimBudgetOrderAction, fetchBudgetQueueAction, fetchBudgetQueueCountAction } from "@/app/actions/budget"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { StatusBadge } from "@/components/status-badge"
import { useStore } from "@/lib/store"
import { invalidateOperationsCache, loadCachedBudgetOrders, loadCachedBudgetOrdersCount } from "@/lib/operations-cache"
import type { Order } from "@/lib/types"
import { getOrderExpirationCardClass, getOrderExpirationLabel, getOrderExpirationState } from "@/lib/order-expiration"

export function BudgetOrdersInbox() {
  const { currentUser, orderExpirationDays, refreshOrders } = useStore()
  const [open, setOpen] = useState(false)
  const [orders, setOrders] = useState<Order[]>([])
  const [ordersCount, setOrdersCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [claiming, setClaiming] = useState<string | null>(null)
  const countCheckKey = useRef<string | null>(null)

  useEffect(() => {
    if (!currentUser || !["admin", "presupuestador"].includes(currentUser.role)) {
      countCheckKey.current = null
      return
    }

    const key = `${currentUser.id}:${currentUser.role}`
    if (countCheckKey.current === key) return
    countCheckKey.current = key
    void loadCachedBudgetOrdersCount(currentUser.id, fetchBudgetQueueCountAction)
      .then((count) => setOrdersCount(count))
      .catch((error: unknown) => console.error("No se pudo contar el buzón de presupuestos:", error))
  }, [currentUser])

  async function openInbox() {
    setOpen(true)
    setLoading(true)
    try {
      if (currentUser) {
        const nextOrders = await loadCachedBudgetOrders(currentUser.id, fetchBudgetQueueAction)
        setOrders(nextOrders)
        setOrdersCount(nextOrders.length)
      }
    } finally { setLoading(false) }
  }

  async function claim(orderId: string) {
    setClaiming(orderId)
    try {
      if (await claimBudgetOrderAction(orderId)) {
        setOrders((current) => current.filter((order) => order.id !== orderId))
        setOrdersCount((current) => Math.max(0, current - 1))
        if (currentUser) invalidateOperationsCache(currentUser.id)
        await refreshOrders()
      }
    } finally { setClaiming(null) }
  }

  if (!currentUser || !["admin", "presupuestador"].includes(currentUser.role)) return null

  return <Dialog open={open} onOpenChange={setOpen}>
    <Button type="button" variant="outline" className="gap-2" onClick={() => void openInbox()}>
      <Calculator className="size-4" /> Buzón de presupuestos
      {ordersCount > 0 && <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">{ordersCount}</span>}
    </Button>
    <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
      <DialogHeader><DialogTitle>Buzón de presupuestos</DialogTitle><DialogDescription>Órdenes que requieren definir o actualizar un presupuesto.</DialogDescription></DialogHeader>
      {loading ? <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" />Cargando…</div> : orders.length === 0 ? <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground"><Inbox className="size-4" />No hay órdenes pendientes.</div> : <div className="grid gap-3 md:grid-cols-2">{orders.map((order) => { const expirationState = getOrderExpirationState(order, orderExpirationDays); return <div key={order.id} className={`rounded-lg border p-4 ${getOrderExpirationCardClass(expirationState)}`}><div className="flex items-start justify-between gap-3"><div><p className="font-medium">{order.clientName}</p><p className="font-mono text-xs text-muted-foreground">{order.code}</p></div><StatusBadge status={order.status} /></div><p className="mt-3 text-sm text-muted-foreground">{order.deviceType} · {order.deviceBrand} {order.deviceModel}</p><p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{order.fault}</p><p className="mt-2 text-xs font-medium">{getOrderExpirationLabel(order, orderExpirationDays)}</p><Button type="button" className="mt-4 w-full gap-2" disabled={claiming !== null} onClick={() => void claim(order.id)}>{claiming === order.id ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}{claiming === order.id ? "Tomando…" : "Tomar presupuesto"}</Button></div> })}</div>}
    </DialogContent>
  </Dialog>
}

