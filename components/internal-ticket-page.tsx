"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, ExternalLink, LogOut } from "lucide-react"
import { OrderDetail } from "@/components/employee/order-detail"
import { StoreProvider, useStore } from "@/lib/store"
import type { AuthUser } from "@/app/actions/auth"
import type { Order } from "@/lib/types"

function InternalTicketContent({ initialOrder }: { initialOrder: Order }) {
  const router = useRouter()
  const { orders, logout } = useStore()
  const order = orders.find((candidate) => candidate.id === initialOrder.id) ?? initialOrder

  function handleLogout() {
    logout()
    router.replace("/")
  }

  return (
    <main className="min-h-screen bg-background px-4 py-6 sm:px-6 sm:py-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/gestion"
            className="inline-flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ArrowLeft className="size-4" />
            Volver al panel
          </Link>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary">
              <ExternalLink className="size-3.5" />
              Vista interna segura
            </span>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <LogOut className="size-3.5" />
              Salir
            </button>
          </div>
        </div>

        <div>
          <p className="text-sm font-medium text-primary">Gestión de órdenes</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Detalle de la orden</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Esta vista requiere una sesión activa y respeta las órdenes autorizadas para tu usuario.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-6">
          <OrderDetail key={order.id} order={order} />
        </div>
      </div>
    </main>
  )
}

export function InternalTicketPage({ order, session }: { order: Order; session: AuthUser }) {
  return (
    <StoreProvider initialSession={session} initialOrders={[order]}>
      <InternalTicketContent initialOrder={order} />
    </StoreProvider>
  )
}
