import { Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { STATUS_FLOW, STATUS_LABELS, type Order } from "@/lib/types"

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function RepairTimeline({ order }: { order: Order }) {
  // Pasos visibles del flujo (sin "entregado" salvo que el equipo ya fue entregado)
  const steps = STATUS_FLOW.filter((s) => s !== "entregado" || order.status === "entregado")
  const currentIndex = steps.indexOf(order.status)

  return (
    <ol className="relative space-y-6">
      {steps.map((step, index) => {
        const event = [...order.timeline].reverse().find((e) => e.status === step)
        const completed = index < currentIndex
        const current = index === currentIndex
        const isLast = index === steps.length - 1

        return (
          <li key={step} className="relative flex gap-4 pl-1">
            {!isLast && (
              <span
                className={cn(
                  "absolute left-[15px] top-8 h-[calc(100%+0px)] w-px",
                  completed ? "bg-primary/60" : "bg-border",
                )}
                aria-hidden="true"
              />
            )}
            <span
              className={cn(
                "z-10 flex size-8 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                completed && "border-primary/50 bg-primary/20 text-primary",
                current && "border-primary bg-primary text-primary-foreground shadow-[0_0_0_4px] shadow-primary/15",
                !completed && !current && "border-border bg-card text-muted-foreground",
              )}
            >
              {completed ? <Check className="size-4" /> : index + 1}
            </span>
            <div className="flex-1 pb-1">
              <p
                className={cn(
                  "text-sm font-medium",
                  current ? "text-foreground" : completed ? "text-foreground/90" : "text-muted-foreground",
                )}
              >
                {STATUS_LABELS[step]}
              </p>
              {event?.note && <p className="mt-0.5 text-sm text-muted-foreground">{event.note}</p>}
              {event && <p className="mt-1 text-xs text-muted-foreground/70">{formatDate(event.date)}</p>}
              {!event && current && <p className="mt-0.5 text-sm text-muted-foreground">En curso...</p>}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
