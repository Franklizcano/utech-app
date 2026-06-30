import { cn } from "@/lib/utils"
import { STATUS_LABELS, type OrderStatus } from "@/lib/types"

const STATUS_STYLES: Record<OrderStatus, string> = {
  recibido: "bg-slate-500/15 text-slate-300 border-slate-500/30",
  en_diagnostico: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  esperando_repuestos: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  en_reparacion: "bg-violet-500/15 text-violet-300 border-violet-500/30",
  listo: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  entregado: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
}

export function StatusBadge({ status, className }: { status: OrderStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        STATUS_STYLES[status],
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
      {STATUS_LABELS[status]}
    </span>
  )
}
