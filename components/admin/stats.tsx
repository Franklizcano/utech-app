"use client"

import { ClipboardList, Wrench, PackageCheck, DollarSign, Users } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useStore, formatCurrency } from "@/lib/store"
import { budgetTotal, getStatusFlow, getStatusLabel } from "@/lib/types"

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof ClipboardList
  label: string
  value: string
  hint?: string
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 pt-6">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <Icon className="size-5" />
        </div>
        <div>
          <p className="text-2xl font-semibold tabular-nums text-foreground">{value}</p>
          <p className="text-sm text-muted-foreground">{label}</p>
          {hint && <p className="text-xs text-muted-foreground/70">{hint}</p>}
        </div>
      </CardContent>
    </Card>
  )
}

export function Stats() {
  const { orders, users, states } = useStore()

  // Buscar el estado "entregado" actual (o usar el último si no existe)
  const deliveredState = states.find((s) => s.id === "entregado") ?? states[states.length - 1]
  const readyState = states.find((s) => s.id === "listo") ?? states[states.length - 2]

  const active = orders.filter((o) => o.status !== deliveredState.id).length
  const ready = orders.filter((o) => o.status === readyState.id).length
  const revenue = orders.reduce((sum, o) => sum + budgetTotal(o), 0)
  const employees = users.filter((u) => u.role === "colaborador" || u.role === "admin").length

  const statusFlow = getStatusFlow(states)
  const counts = statusFlow.map((status) => ({
    status,
    count: orders.filter((o) => o.status === status).length,
  }))
  const maxCount = Math.max(1, ...counts.map((c) => c.count))

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard icon={ClipboardList} label="Pedidos totales" value={String(orders.length)} />
        <StatCard icon={Wrench} label="En proceso" value={String(active)} />
        <StatCard icon={PackageCheck} label="Listos para retirar" value={String(ready)} />
        <StatCard icon={DollarSign} label="Facturación estimada" value={formatCurrency(revenue)} />
        <StatCard icon={Users} label="Equipo de trabajo" value={String(employees)} hint="empleados y admins" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pedidos por estado</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {counts.map(({ status, count }) => {
            const stateColor = states.find((s) => s.id === status)?.color ?? "#6b7280"
            return (
              <div key={status} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{getStatusLabel(status, states)}</span>
                  <span className="font-medium tabular-nums text-foreground">{count}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${(count / maxCount) * 100}%`,
                      backgroundColor: stateColor,
                    }}
                  />
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}
