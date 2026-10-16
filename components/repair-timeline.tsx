"use client"

import { useSyncExternalStore } from "react"
import { Check, Clock3 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useStore } from "@/lib/store"
import { compactTimelineEvents, getStatusFlow, getStatusLabel, type Order } from "@/lib/types"

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function RepairTimeline({ order }: { order: Order }) {
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  )
  const { states } = useStore()


  // Pasos visibles del flujo (sin "entregado" salvo que el equipo ya fue entregado)
  const statusFlow = getStatusFlow(states)
  const steps = statusFlow.filter((s) => s !== "entregado" || order.status === "entregado")
  const currentIndex = steps.indexOf(order.status)

  return (
    <ol aria-label="Progreso de la orden" className="relative">
      {steps.map((step, index) => {
        const events = compactTimelineEvents(order.timeline.filter((event) => event.status === step))
        const completed = index < currentIndex
        const current = index === currentIndex
        const isLast = index === steps.length - 1

        return (
          <li
            key={step}
            aria-current={current ? "step" : undefined}
            className={cn(
              "animate-utech-enter relative grid grid-cols-[2rem_minmax(0,1fr)] gap-x-3 sm:gap-x-4",
              !isLast && "pb-6",
            )}
            style={{ animationDelay: `${index * 35}ms` }}
          >
            {!isLast && (
              <span
                className={cn(
                  "absolute top-9 bottom-1 left-4 z-0 w-px -translate-x-1/2",
                  completed ? "bg-primary/50" : "bg-border/80",
                )}
                aria-hidden="true"
              />
            )}
            <span
              className={cn(
                "z-10 flex size-8 items-center justify-center self-start rounded-full border text-xs font-semibold transition-colors",
                completed && "border-primary/40 bg-primary/10 text-primary",
                current && "border-primary bg-primary text-primary-foreground shadow-[0_0_0_4px] shadow-primary/15",
                !completed && !current && "border-border bg-background text-muted-foreground",
              )}
            >
              {completed ? <Check className="size-4" /> : index + 1}
            </span>
            <div className="min-w-0 pb-1">
              <div className="flex min-h-8 flex-wrap items-center gap-x-2 gap-y-1">
                <p
                  className={cn(
                    "text-sm font-semibold tracking-tight",
                    current ? "text-foreground" : completed ? "text-foreground/90" : "text-muted-foreground",
                  )}
                >
                  {getStatusLabel(step, states)}
                </p>
                {current && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                    <span className="size-1.5 rounded-full bg-primary" aria-hidden="true" />
                    Estado actual
                  </span>
                )}
              </div>
              {events.length > 0 ? (
                <div className="mt-2 space-y-2">
                  {events.map((event, eventIndex) => (
                    <div
                      key={`${event.id}-${eventIndex}`}
                      className={cn(
                        "rounded-lg border px-3 py-2.5 shadow-sm shadow-black/[0.02]",
                        current ? "border-primary/20 bg-primary/[0.035]" : "border-border/70 bg-card/70",
                      )}
                    >
                      {event.note && <p className="text-sm leading-relaxed text-foreground/80">{event.note}</p>}
                      {mounted && (
                        <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Clock3 className="size-3.5" aria-hidden="true" />
                          {formatDate(event.date)}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : current ? (
                <p className="mt-1 text-sm text-muted-foreground">En curso</p>
              ) : null}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
