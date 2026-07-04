"use client"

import { useState } from "react"
import { Plus, Trash2, Send, ArrowRight, Phone, Mail, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { StatusBadge } from "@/components/status-badge"
import { RepairTimeline } from "@/components/repair-timeline"
import { useStore, formatCurrency } from "@/lib/store"
import { STATUS_FLOW, STATUS_LABELS, budgetTotal, type Order, type OrderStatus } from "@/lib/types"

export function OrderDetail({ order }: { order: Order }) {
  const { addBudgetItem, removeBudgetItem, advanceStatus, reassignOrder, sendBudgetNotification, employees } = useStore()
  const [desc, setDesc] = useState("")
  const [amount, setAmount] = useState("")
  const [nextStatus, setNextStatus] = useState<OrderStatus>(order.status)
  const [statusNote, setStatusNote] = useState("")
  const [newAssignee, setNewAssignee] = useState(order.assignedTo)

  const total = budgetTotal(order)

  function handleAddItem(e: React.FormEvent) {
    e.preventDefault()
    const value = Number.parseFloat(amount)
    if (!desc.trim() || Number.isNaN(value) || value <= 0) return
    addBudgetItem(order.id, desc.trim(), value)
    setDesc("")
    setAmount("")
  }

  function handleAdvance() {
    if (nextStatus === order.status) return
    advanceStatus(order.id, nextStatus, statusNote.trim() || undefined)
    setStatusNote("")
  }

  function handleReassign() {
    if (newAssignee === order.assignedTo) return
    reassignOrder(order.id, newAssignee)
  }

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-foreground">{order.clientName}</h3>
            <span className="rounded-md bg-secondary px-2 py-0.5 font-mono text-xs text-secondary-foreground">
              {order.code}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {order.deviceType} · {order.deviceBrand} {order.deviceModel}
          </p>
        </div>
        <StatusBadge status={order.status} />
      </div>

      <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
        {order.clientPhone && (
          <span className="inline-flex items-center gap-1.5">
            <Phone className="size-3.5" /> {order.clientPhone}
          </span>
        )}
        {order.clientEmail && (
          <span className="inline-flex items-center gap-1.5">
            <Mail className="size-3.5" /> {order.clientEmail}
          </span>
        )}
      </div>

      <div className="rounded-lg border border-border bg-secondary/30 p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Falla reportada</p>
        <p className="mt-1 text-sm text-foreground">{order.fault}</p>
      </div>

      <div className="space-y-3 rounded-lg border border-border/50 bg-gradient-to-br from-primary/5 to-transparent p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-md bg-primary/20">
              <User className="size-4 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Técnico asignado</p>
              <p className="mt-0.5 text-sm font-medium text-foreground">{order.assignedTo}</p>
            </div>
          </div>
        </div>

        {newAssignee !== order.assignedTo && (
          <div className="flex items-center gap-2 rounded-md bg-accent/10 px-2 py-1.5">
            <div className="size-1.5 rounded-full bg-accent" />
            <p className="text-xs text-accent">Nuevo asignee: <span className="font-medium">{newAssignee}</span></p>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Select value={newAssignee} onValueChange={setNewAssignee}>
            <SelectTrigger className="flex-1 min-w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {employees.map((emp) => (
                <SelectItem key={emp.id} value={emp.name}>
                  {emp.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            size="sm"
            disabled={newAssignee === order.assignedTo}
            onClick={handleReassign}
            className="gap-1"
          >
            <ArrowRight className="size-4" />
            Reasignar
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Presupuesto */}
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-foreground">Presupuesto</h4>

          <div className="space-y-2">
            {order.budget.length === 0 && (
              <p className="rounded-md border border-dashed border-border px-3 py-4 text-center text-sm text-muted-foreground">
                Todavía no hay ítems cargados.
              </p>
            )}
            {order.budget.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-2 rounded-md border border-border bg-card px-3 py-2">
                <span className="text-sm text-foreground">{item.description}</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium tabular-nums text-foreground">{formatCurrency(item.amount)}</span>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="size-7 text-muted-foreground hover:text-destructive"
                    onClick={() => removeBudgetItem(order.id, item.id)}
                    aria-label="Eliminar ítem"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {order.budget.length > 0 && (
            <div className="flex items-center justify-between rounded-md bg-primary/10 px-3 py-2">
              <span className="text-sm font-medium text-foreground">Total</span>
              <span className="text-base font-semibold tabular-nums text-primary">{formatCurrency(total)}</span>
            </div>
          )}

          <form onSubmit={handleAddItem} className="space-y-3 rounded-lg border border-border p-3">
            <div className="space-y-2">
              <Label htmlFor="bi-desc" className="text-xs">
                Detalle del ítem
              </Label>
              <Input
                id="bi-desc"
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                placeholder="Ej: Cambio de módulo HDMI de PS5"
              />
            </div>
            <div className="flex items-end gap-2">
              <div className="flex-1 space-y-2">
                <Label htmlFor="bi-amount" className="text-xs">
                  Importe (ARS)
                </Label>
                <Input
                  id="bi-amount"
                  type="number"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0"
                />
              </div>
              <Button type="submit" variant="secondary" className="gap-1">
                <Plus className="size-4" />
                Agregar
              </Button>
            </div>
          </form>

          <Button
            type="button"
            variant="outline"
            className="w-full gap-2"
            disabled={order.budget.length === 0}
            onClick={() => sendBudgetNotification(order.id)}
          >
            <Send className="size-4" />
            Notificar presupuesto al cliente
          </Button>
        </div>

        {/* Estado + timeline */}
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-foreground">Gestión de estado</h4>

          <div className="space-y-3 rounded-lg border border-border p-3">
            <div className="space-y-2">
              <Label className="text-xs">Cambiar estado</Label>
              <Select value={nextStatus} onValueChange={(v) => setNextStatus(v as OrderStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_FLOW.map((s) => (
                    <SelectItem key={s} value={s}>
                      {STATUS_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status-note" className="text-xs">
                Nota (opcional)
              </Label>
              <Input
                id="status-note"
                value={statusNote}
                onChange={(e) => setStatusNote(e.target.value)}
                placeholder="Ej: Llegó el repuesto, iniciamos reparación"
              />
            </div>
            <Button type="button" className="w-full gap-2" disabled={nextStatus === order.status} onClick={handleAdvance}>
              <ArrowRight className="size-4" />
              Actualizar estado
            </Button>
          </div>

          <Separator />

          <div>
            <h4 className="mb-4 text-sm font-semibold text-foreground">Historial</h4>
            <RepairTimeline order={order} />
          </div>
        </div>
      </div>
    </div>
  )
}
