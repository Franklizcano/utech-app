import Link from "next/link"
import { ArrowLeft, CalendarDays, CheckCircle2, Clock3, History, TicketCheck } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { compactTimelineEvents, type OccasionalTicketDetail, type OccasionalTicketTimelineEvent } from "@/lib/types"

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function groupTimelineEvents(events: OccasionalTicketTimelineEvent[]) {
  return events.reduce<Array<{ status: string; label: string; events: OccasionalTicketTimelineEvent[] }>>((groups, event) => {
    let group = groups.find((candidate) => candidate.status === event.status)

    if (!group) {
      group = { status: event.status, label: event.label, events: [] }
      groups.push(group)
    }

    group.events = compactTimelineEvents([...group.events, event])

    return groups
  }, [])
}

export function PublicTicketDetail({ ticket }: { ticket: OccasionalTicketDetail }) {
  const groupedTimeline = groupTimelineEvents(ticket.timeline)
  const totalUpdates = groupedTimeline.reduce((total, step) => total + step.events.length, 0)
  const currentLabel = [...ticket.timeline].reverse().find((event) => event.status === ticket.status)?.label ?? ticket.status

  return (
    <main className="relative min-h-screen overflow-hidden bg-background px-4 py-8 sm:px-6 sm:py-12">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 opacity-[0.035]"
        style={{
          backgroundImage:
            "linear-gradient(var(--color-foreground) 1px, transparent 1px), linear-gradient(90deg, var(--color-foreground) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      <div className="relative z-10 mx-auto flex w-full max-w-3xl flex-col gap-6">
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ArrowLeft className="size-4" />
            Consultar otro ticket
          </Link>
          <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
            <TicketCheck className="size-5" />
          </div>
        </div>

        <div>
          <p className="text-sm font-medium text-primary">Seguimiento de reparación</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Detalle de tu ticket</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Acá podés consultar el estado actual y el historial de avances registrados.
          </p>
        </div>

        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardDescription>Código de seguimiento</CardDescription>
              <CardTitle className="mt-1 font-mono text-xl tracking-wide">{ticket.code}</CardTitle>
            </div>
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/30 bg-background px-3 py-1.5 text-sm font-medium text-primary">
              <span className="size-2 rounded-full bg-primary shadow-[0_0_8px_currentColor]" aria-hidden="true" />
              {currentLabel}
            </div>
          </CardHeader>
          <CardContent className="grid gap-3 border-t border-primary/15 pt-4 sm:grid-cols-2">
            <div className="flex items-center gap-3">
              <CalendarDays className="size-4 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Ingresado</p>
                <p className="text-sm font-medium text-foreground">{formatDate(ticket.createdAt)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <History className="size-4 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Actualizaciones</p>
                <p className="text-sm font-medium text-foreground">
                  {totalUpdates} {totalUpdates === 1 ? "registro" : "registros"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <History className="size-4 text-primary" />
              Historial del ticket
            </CardTitle>
            <CardDescription>Avances registrados por el servicio técnico.</CardDescription>
          </CardHeader>
          <CardContent>
            {groupedTimeline.length === 0 ? (
              <div className="flex items-center gap-3 rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                <Clock3 className="size-4 shrink-0" />
                Todavía no hay actualizaciones para mostrar.
              </div>
            ) : (
              <ol className="relative space-y-6">
                {groupedTimeline.map((step, index) => {
                  const isLast = index === groupedTimeline.length - 1
                  const isCurrent = step.status === ticket.status

                  return (
                    <li key={step.status} className="relative flex gap-4">
                      {!isLast && <span className="absolute left-3.5 top-8 h-[calc(100%+1.5rem)] w-px bg-border" aria-hidden="true" />}
                      <span
                        className={
                          "z-10 flex size-7 shrink-0 items-center justify-center rounded-full border " +
                          (isCurrent
                            ? "border-primary bg-primary text-primary-foreground shadow-[0_0_0_4px] shadow-primary/15"
                            : "border-primary/40 bg-primary/10 text-primary")
                        }
                      >
                        {isCurrent ? <CheckCircle2 className="size-4" /> : <span className="text-xs font-semibold">{index + 1}</span>}
                      </span>
                      <div className="min-w-0 flex-1 pb-1">
                        <p className="text-sm font-semibold text-foreground">{step.label}</p>
                        <div className="mt-1.5 space-y-2">
                          {step.events.map((event, eventIndex) => (
                            <div key={`${event.date}-${event.note ?? "sin-nota"}-${eventIndex}`} className="rounded-md border border-border/70 bg-secondary/20 px-3 py-2">
                              {event.note && <p className="text-sm text-muted-foreground">{event.note}</p>}
                              <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground/70">
                                <Clock3 className="size-3.5" />
                                {formatDate(event.date)}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ol>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          Si necesitás más información, comunicate con el servicio técnico e indicá tu código de seguimiento.
        </p>
      </div>
    </main>
  )
}
