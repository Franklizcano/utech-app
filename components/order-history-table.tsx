"use client"

import { useSyncExternalStore } from "react"
import { getStatusLabel, type Order, type OrderHistoryEvent } from "@/lib/types"
import { useStore } from "@/lib/store"

const EVENT_LABELS: Record<OrderHistoryEvent["eventType"], string> = {
  order_created: "Orden creada",
  status_changed: "Estado actualizado",
  assignee_changed: "Colaborador asignado",
  budget_assignee_changed: "Presupuestador asignado",
  order_details_changed: "Datos técnicos modificados",
  budget_item_added: "Ítem de presupuesto agregado",
  budget_item_updated: "Ítem de presupuesto actualizado",
  budget_item_deleted: "Ítem de presupuesto eliminado",
  budget_submitted: "Enviada a revisión de presupuesto",
  budget_sent: "Presupuesto enviado al cliente",
  budget_decided: "Decisión del cliente sobre el presupuesto",
  order_reminder_updated: "Recordatorio de orden actualizado",
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function formatValue(value: unknown, states: ReturnType<typeof useStore>["states"]): string {
  if (value === null || value === undefined || value === "") return "—"
  if (typeof value === "string") {
    const state = states.find((candidate) => candidate.id === value)
    return state ? getStatusLabel(value, states) : value
  }
  if (typeof value === "number" || typeof value === "boolean") return String(value)
  try {
    return JSON.stringify(value)
  } catch {
    return "—"
  }
}

function getChangeText(event: OrderHistoryEvent, states: ReturnType<typeof useStore>["states"]): string {
  if (event.eventType === "order_details_changed" && event.metadata.changes) {
    const changes = event.metadata.changes as Array<{ field?: string; oldValue?: unknown; newValue?: unknown }>
    return changes.map((change) => `${change.field ?? "Campo"}: ${formatValue(change.oldValue, states)} → ${formatValue(change.newValue, states)}`).join(" · ")
  }

  if (event.oldValue !== null || event.newValue !== null) {
    return `${formatValue(event.oldValue, states)} → ${formatValue(event.newValue, states)}`
  }

  return event.summary
}

export function OrderHistoryTable({ order }: { order: Order }) {
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  )
  const { states } = useStore()
  const events = [...order.history].reverse()

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      {events.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-muted-foreground">Todavía no hay cambios registrados.</p>
      ) : (
        <table className="w-full min-w-[680px] text-sm">
          <thead className="bg-secondary/30 text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Fecha</th>
              <th className="px-3 py-2 font-medium">Acción</th>
              <th className="px-3 py-2 font-medium">Usuario</th>
              <th className="px-3 py-2 font-medium">Cambio</th>
            </tr>
          </thead>
          <tbody>
            {events.map((event) => (
              <tr key={event.id} className="border-t border-border/70 align-top">
                <td className="whitespace-nowrap px-3 py-3 text-xs text-muted-foreground">{mounted ? formatDate(event.date) : ""}</td>
                <td className="px-3 py-3 font-medium text-foreground">{EVENT_LABELS[event.eventType] ?? event.eventType}</td>
                <td className="px-3 py-3 text-muted-foreground">{event.actorName ?? "Sistema"}</td>
                <td className="max-w-md px-3 py-3 text-muted-foreground">
                  <p>{getChangeText(event, states)}</p>
                  {getChangeText(event, states) !== event.summary && <p className="mt-1 text-xs text-muted-foreground/75">{event.summary}</p>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
