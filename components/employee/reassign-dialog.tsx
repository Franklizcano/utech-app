"use client"

import { useState } from "react"
import { ArrowRight, User } from "lucide-react"
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
import type { Order } from "@/lib/types"

interface ReassignDialogProps {
  order: Order
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ReassignDialog({ order, open, onOpenChange }: ReassignDialogProps) {
  const { reassignOrder, employees } = useStore()
  const [newAssignee, setNewAssignee] = useState(order.assignedTo)

  function handleReassign() {
    if (newAssignee === order.assignedTo) return
    reassignOrder(order.id, newAssignee)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/20">
              <User className="size-4 text-primary" />
            </div>
            Reasignar técnico
          </DialogTitle>
          <DialogDescription>
            Cambia el técnico asignado a este pedido. Se notificará al cliente del cambio.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="rounded-lg border border-border bg-secondary/20 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Técnico actual</p>
            <p className="mt-1 text-sm font-medium text-foreground">{order.assignedTo}</p>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Nuevo técnico
            </label>
            <Select
              value={newAssignee}
              onValueChange={(value) => {
                if (value !== null) setNewAssignee(value)
              }}
            >
              <SelectTrigger>
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
          </div>

          {newAssignee !== order.assignedTo && (
            <div className="flex items-center gap-2 rounded-md bg-accent/10 px-3 py-2">
              <div className="size-1.5 rounded-full bg-accent" />
              <p className="text-xs text-accent">
                Se cambiará de <span className="font-medium">{order.assignedTo}</span> a{" "}
                <span className="font-medium">{newAssignee}</span>
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={newAssignee === order.assignedTo}
            onClick={handleReassign}
            className="flex-1 gap-1"
          >
            <ArrowRight className="size-4" />
            Confirmar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
