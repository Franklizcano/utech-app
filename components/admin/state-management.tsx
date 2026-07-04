"use client"

import { useState } from "react"
import { Plus, Trash2, Edit2, GripVertical } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useStore } from "@/lib/store"
import { cn } from "@/lib/utils"
import type { OrderState } from "@/lib/types"

export function StateManagement() {
  const { states, addState, updateState, deleteState, reorderStates } = useStore()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingState, setEditingState] = useState<OrderState | null>(null)
  const [label, setLabel] = useState("")
  const [color, setColor] = useState("#8b5cf6")
  const [deleteTarget, setDeleteTarget] = useState<OrderState | null>(null)
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)

  function handleOpenDialog(state?: OrderState) {
    if (state) {
      setEditingState(state)
      setLabel(state.label)
      setColor(state.color)
    } else {
      setEditingState(null)
      setLabel("")
      setColor("#8b5cf6")
    }
    setDialogOpen(true)
  }

  function handleSave() {
    if (!label.trim()) return

    if (editingState) {
      updateState(editingState.id, label, color)
    } else {
      addState(label, color)
    }

    setDialogOpen(false)
    setLabel("")
    setColor("#8b5cf6")
  }

  function handleDelete(state: OrderState) {
    if (states.length === 1) return
    deleteState(state.id)
    setDeleteTarget(null)
  }

  function handleDragStart(e: React.DragEvent<HTMLDivElement>, stateId: string) {
    setDraggedId(stateId)
    e.dataTransfer.effectAllowed = "move"
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>, stateId: string) {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
    setDragOverId(stateId)
  }

  function handleDragLeave() {
    setDragOverId(null)
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>, targetId: string) {
    e.preventDefault()
    if (!draggedId || draggedId === targetId) {
      setDraggedId(null)
      setDragOverId(null)
      return
    }

    const sortedStates = [...states].sort((a, b) => a.position - b.position)
    const draggedIndex = sortedStates.findIndex((s) => s.id === draggedId)
    const targetIndex = sortedStates.findIndex((s) => s.id === targetId)

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedId(null)
      setDragOverId(null)
      return
    }

    const newOrder = [...sortedStates]
    const [draggedState] = newOrder.splice(draggedIndex, 1)
    newOrder.splice(targetIndex, 0, draggedState)

    const newStateIds = newOrder.map((s) => s.id)
    reorderStates(newStateIds)

    setDraggedId(null)
    setDragOverId(null)
  }

  const sortedStates = [...states].sort((a, b) => a.position - b.position)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Gestión de Estados</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Crea y personaliza los estados disponibles para las órdenes de reparación.
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()} className="gap-2">
              <Plus className="h-4 w-4" />
              Nuevo estado
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingState ? "Editar estado" : "Crear nuevo estado"}</DialogTitle>
              <DialogDescription>
                Define el nombre y color del estado. El color se mostrará en los badges de las órdenes.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="label">Nombre del estado</Label>
                <Input
                  id="label"
                  placeholder="Ej: En diagnóstico"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="color">Color</Label>
                <div className="flex items-center gap-2">
                  <input
                    id="color"
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="h-10 w-20 cursor-pointer rounded border border-border"
                  />
                  <span className="font-mono text-sm text-muted-foreground">{color}</span>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={!label.trim()}>
                {editingState ? "Guardar cambios" : "Crear estado"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Separator />

      <div className="space-y-2">
        {sortedStates.length === 0 ? (
          <div className="rounded-lg border border-border bg-card p-6 text-center">
            <p className="text-sm text-muted-foreground">No hay estados configurados aún.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {sortedStates.map((state) => (
              <div
                key={state.id}
                draggable
                onDragStart={(e) => handleDragStart(e, state.id)}
                onDragOver={(e) => handleDragOver(e, state.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, state.id)}
                className={cn(
                  "flex items-center justify-between gap-3 rounded-lg border transition-all cursor-move",
                  draggedId === state.id ? "opacity-50 border-primary/50 bg-primary/5" : "border-border bg-card",
                  dragOverId === state.id && draggedId !== state.id
                    ? "border-primary/70 bg-primary/10 ring-2 ring-primary/20"
                    : "hover:bg-secondary/30",
                )}
                style={{ padding: "0.75rem" }}
              >
                <div className="flex items-center gap-3 flex-1">
                  <div className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0">
                    <GripVertical className="h-4 w-4" />
                  </div>
                  <div
                    className="h-8 w-8 rounded-md border border-border flex-shrink-0"
                    style={{ backgroundColor: state.color }}
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{state.label}</p>
                    <p className="text-xs text-muted-foreground font-mono">{state.color}</p>
                  </div>
                  <div className="text-xs text-muted-foreground">Posición: {state.position + 1}</div>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleOpenDialog(state)}
                  >
                    <Edit2 className="h-4 w-4" />
                    <span className="sr-only">Editar</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:bg-destructive/10"
                    disabled={states.length === 1}
                    onClick={() => setDeleteTarget(state)}
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Eliminar</span>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar estado</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro que deseas eliminar "{deleteTarget?.label}"? Esta acción no se puede deshacer.
              {states.length === 1 && " No puedes eliminar el único estado disponible."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex justify-end gap-2">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && handleDelete(deleteTarget)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
