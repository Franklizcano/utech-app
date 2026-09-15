import Link from "next/link"
import { ArrowLeft, Cpu, SearchX } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

export default function NotFound() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-12">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 opacity-[0.035]"
        style={{
          backgroundImage:
            "linear-gradient(var(--color-foreground) 1px, transparent 1px), linear-gradient(90deg, var(--color-foreground) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      <Card className="relative z-10 w-full max-w-md border-primary/20 bg-card/95 shadow-2xl shadow-black/20">
        <CardContent className="flex flex-col items-center px-6 py-10 text-center sm:px-10">
          <div className="flex size-16 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10 text-primary">
            <SearchX className="size-8" />
          </div>
          <p className="mt-6 font-mono text-sm font-semibold tracking-[0.3em] text-primary">ERROR 404</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground">No encontramos esta página</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            La dirección puede estar mal escrita o el recurso ya no estar disponible.
          </p>
          <Link
            href="/"
            className="mt-7 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ArrowLeft className="size-4" />
            Volver al inicio
          </Link>
          <div className="mt-8 flex items-center gap-2 text-xs text-muted-foreground/70">
            <Cpu className="size-3.5 text-primary" />
            UTech · Servicio técnico
          </div>
        </CardContent>
      </Card>
    </main>
  )
}
