"use client"

import { Cpu, ShieldCheck, Wrench, UserRound } from "lucide-react"
import { useStore } from "@/lib/store"
import { ServiceWorkspace } from "@/components/service-workspace"
import { ClientPortal } from "@/components/client/client-portal"
import { AdminView } from "@/components/admin/admin-view"
import type { Role } from "@/lib/types"
import { cn } from "@/lib/utils"

const ROLES: { value: Role; label: string; icon: typeof ShieldCheck }[] = [
  { value: "admin", label: "Admin", icon: ShieldCheck },
  { value: "empleado", label: "Empleado", icon: Wrench },
  { value: "cliente", label: "Cliente", icon: UserRound },
]

const ROLE_SUBTITLE: Record<Role, string> = {
  admin: "Panel completo: operaciones, usuarios y estadísticas",
  empleado: "Carga de pedidos y armado de presupuestos",
  cliente: "Portal de seguimiento de tu reparación",
}

export function AppShell() {
  const { role, setRole } = useStore()

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Cpu className="size-5" />
            </div>
            <div>
              <p className="font-semibold leading-tight text-foreground">UTech</p>
              <p className="text-xs text-muted-foreground">Servicio técnico de PCs y consolas</p>
            </div>
          </div>

          <div
            className="flex items-center gap-1 rounded-lg border border-border bg-card p-1"
            role="tablist"
            aria-label="Simulación de rol"
          >
            {ROLES.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={role === value}
                onClick={() => setRole(value)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  role === value
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                )}
              >
                <Icon className="size-4" />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="mb-6">
          <p className="text-xs font-medium uppercase tracking-wide text-primary">
            Vista de {role === "admin" ? "administrador" : role}
          </p>
          <p className="text-sm text-muted-foreground">{ROLE_SUBTITLE[role]}</p>
        </div>

        {role === "admin" && <AdminView />}
        {role === "empleado" && <ServiceWorkspace />}
        {role === "cliente" && <ClientPortal />}
      </main>
    </div>
  )
}
