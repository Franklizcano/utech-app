"use client"

import { useEffect, useState } from "react"
import { ClipboardList, Wrench, PackageCheck, DollarSign, CheckCircle2, Loader2 } from "lucide-react"
import { fetchAdminStatsAction } from "@/app/actions/stats"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useStore, formatCurrency } from "@/lib/store"
import { getStatusFlow, getStatusLabel, type AdminStatsResult } from "@/lib/types"

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
  const { users, states } = useStore()
  const [selectedResponsible, setSelectedResponsible] = useState("todos")
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [stats, setStats] = useState<AdminStatsResult>({ total: 0, revenue: 0, countsByStatus: {} })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const responsibleUsers = users.filter((user) => user.role === "colaborador" || user.role === "admin")

  function startFiltering() {
    setLoading(true)
    setError("")
  }

  useEffect(() => {
    let cancelled = false

    fetchAdminStatsAction({
      assignedTo: selectedResponsible === "todos" ? undefined : selectedResponsible,
      from: from || undefined,
      to: to || undefined,
    }).then((result) => {
      if (cancelled) return
      setStats(result)
    }).catch((statsError: unknown) => {
      if (cancelled) return
      setError(statsError instanceof Error ? statsError.message : "No se pudieron cargar las estadísticas.")
    }).finally(() => {
      if (!cancelled) setLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [selectedResponsible, from, to])

  // Buscar el estado "entregado" actual (o usar el último si no existe)
  const deliveredState = states.find((s) => s.id === "entregado") ?? states[states.length - 1]
  const readyState = states.find((s) => s.id === "listo") ?? states[states.length - 2]

  const active = deliveredState ? stats.total - (stats.countsByStatus[deliveredState.id] ?? 0) : stats.total
  const ready = readyState ? stats.countsByStatus[readyState.id] ?? 0 : 0
  const delivered = deliveredState ? stats.countsByStatus[deliveredState.id] ?? 0 : 0
  const resolutionRate = stats.total > 0 ? Math.round((delivered / stats.total) * 100) : 0

  const statusFlow = getStatusFlow(states)
  const counts = statusFlow.map((status) => ({
    status,
    count: stats.countsByStatus[status] ?? 0,
  }))
  const maxCount = Math.max(1, ...counts.map((c) => c.count))

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filtros de estadísticas</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(9rem,1fr)] lg:items-end">
          <div className="space-y-2 lg:translate-y-2">
            <Label htmlFor="stats-responsible">Responsable</Label>
            <Select value={selectedResponsible} onValueChange={(value) => {
              const nextResponsible = value ?? "todos"
              if (nextResponsible === selectedResponsible) return
              startFiltering()
              setSelectedResponsible(nextResponsible)
            }}>
              <SelectTrigger id="stats-responsible" className="h-8 w-full! min-w-0">
                <SelectValue placeholder="Todos los responsables" />
              </SelectTrigger>
              <SelectContent align="start" sideOffset={8} className="min-w-(--anchor-width)">
                <SelectItem value="todos">Todos los responsables</SelectItem>
                {responsibleUsers.map((user) => (
                  <SelectItem key={user.id} value={user.name}>
                    {user.name} · {user.role === "admin" ? "Administrador" : "Colaborador"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="stats-from">Desde</Label>
            <Input id="stats-from" type="date" value={from} max={to || undefined} onChange={(event) => {
              if (event.target.value === from) return
              startFiltering()
              setFrom(event.target.value)
            }} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="stats-to">Hasta</Label>
            <Input id="stats-to" type="date" value={to} min={from || undefined} onChange={(event) => {
              if (event.target.value === to) return
              startFiltering()
              setTo(event.target.value)
            }} />
          </div>
          <Button type="button" variant="outline" className="w-full" onClick={() => {
            if (selectedResponsible === "todos" && from === "" && to === "") return
            startFiltering()
            setSelectedResponsible("todos")
            setFrom("")
            setTo("")
          }}>
            Limpiar filtros
          </Button>
        </CardContent>
      </Card>

      {error && <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">{error}</p>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard icon={ClipboardList} label="Pedidos totales" value={String(stats.total)} />
        <StatCard icon={Wrench} label="En proceso" value={String(active)} />
        <StatCard icon={PackageCheck} label="Listos para retirar" value={String(ready)} />
        <StatCard icon={DollarSign} label="Facturación estimada" value={formatCurrency(stats.revenue)} />
        <StatCard icon={CheckCircle2} label="Tasa de resolución" value={`${resolutionRate}%`} hint={`${delivered} órdenes entregadas`} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pedidos por estado</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin text-primary" />
              Actualizando estadísticas…
            </div>
          ) : counts.map(({ status, count }) => {
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
