"use client"

import { cn } from "@/lib/utils"
import { useStore } from "@/lib/store"
import { getStatusLabel, type OrderStatus } from "@/lib/types"

export function StatusBadge({ status, className }: { status: OrderStatus; className?: string }) {
  const { states } = useStore()
  const state = states.find((s) => s.id === status)
  const label = getStatusLabel(status, states)
  const color = state?.color ?? "#6b7280"

  // Convertir hex a rgb para opacity
  const hex = color.replace("#", "")
  const r = parseInt(hex.substring(0, 2), 16)
  const g = parseInt(hex.substring(2, 4), 16)
  const b = parseInt(hex.substring(4, 6), 16)

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        className,
      )}
      style={{
        backgroundColor: `rgba(${r}, ${g}, ${b}, 0.15)`,
        borderColor: `rgba(${r}, ${g}, ${b}, 0.3)`,
        color: color,
      }}
    >
      <span
        className="size-1.5 rounded-full"
        style={{ backgroundColor: color }}
        aria-hidden="true"
      />
      {label}
    </span>
  )
}
