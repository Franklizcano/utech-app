"use client"

import { useState } from "react"
import { AlertCircle, Loader2, Search } from "lucide-react"
import { lookupOccasionalTicketAction } from "@/app/actions/orders"
import { StatusBadge } from "@/components/status-badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { OccasionalTicketStatus } from "@/lib/types"

export function OccasionalTicketLookup() {
  const [code, setCode] = useState("")
  const [ticket, setTicket] = useState<OccasionalTicketStatus | null>(null)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError("")
    setTicket(null)
    setLoading(true)

    try {
      const result = await lookupOccasionalTicketAction(code)
      if (result.success && result.ticket) {
        setTicket(result.ticket)
      } else {
        setError(result.error ?? "No se pudo consultar el ticket.")
      }
    } catch {
      setError("No se pudo consultar el ticket. Intentá nuevamente.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Search className="size-4 text-primary" />
          Consultá tu ticket
        </CardTitle>
        <CardDescription>
          Disponible para clientes ocasionales. Ingresá el código de seguimiento para ver su estado.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="occasional-ticket-code">Código del ticket</Label>
            <Input
              id="occasional-ticket-code"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder="Ej: TF-1024"
              autoComplete="off"
              aria-invalid={!!error}
              disabled={loading}
            />
          </div>
          <Button type="submit" className="w-full gap-2" disabled={loading || !code.trim()}>
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
            {loading ? "Consultando..." : "Consultar estado"}
          </Button>
        </form>

        {error && (
          <div role="alert" className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {ticket && (
          <div role="status" aria-live="polite" className="flex items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary/5 p-4">
            <div>
              <p className="text-xs text-muted-foreground">Ticket consultado</p>
              <p className="font-mono text-sm font-medium text-foreground">{ticket.code}</p>
            </div>
            <StatusBadge status={ticket.status} className="text-sm" />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
