"use client"

import { Cpu, ShieldCheck, Wrench, UserRound, LogOut } from "lucide-react"
import { useStore } from "@/lib/store"
import { ServiceWorkspace } from "@/components/service-workspace"
import { ClientPortal } from "@/components/client/client-portal"
import { AdminView } from "@/components/admin/admin-view"
import { LoginScreen } from "@/components/login-screen"
import type { Role } from "@/lib/types"
import { cn } from "@/lib/utils"

const ROLE_SUBTITLE: Record<Role, string> = {
  admin: "Panel completo: operaciones, usuarios y estadísticas",
  colaborador: "Carga de pedidos y armado de presupuestos",
  cliente: "Portal de seguimiento de tu reparación",
}

const ROLE_ICON: Record<Role, typeof ShieldCheck> = {
  admin: ShieldCheck,
  colaborador: Wrench,
  cliente: UserRound,
}

export function AppShell() {
  const { role, currentUser, isLoggedIn, logout } = useStore()

  if (!isLoggedIn) {
    return <LoginScreen />
  }

  const RoleIcon = ROLE_ICON[role]
  const displayName = currentUser?.name ?? (role === "colaborador" ? "Colaborador" : role === "admin" ? "Admin" : "Cliente")
  const roleLabel = role === "colaborador" ? "Colaborador" : role === "admin" ? "Admin" : "Cliente"

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

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5">
              <RoleIcon className="size-4 text-primary" />
              <div className="flex flex-col">
                <span className="text-sm font-medium text-foreground leading-tight">{displayName}</span>
                <span className="text-[10px] text-muted-foreground leading-tight">{roleLabel}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={logout}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:border-destructive/50 hover:text-destructive"
              aria-label="Cerrar sesión"
            >
              <LogOut className="size-4" />
              <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="mb-6">
          <p className="text-xs font-medium uppercase tracking-wide text-primary">
            Vista de {role === "admin" ? "administrador" : role === "colaborador" ? "colaborador" : role}
          </p>
          <p className="text-sm text-muted-foreground">{ROLE_SUBTITLE[role]}</p>
        </div>

        {role === "admin" && <AdminView />}
        {role === "colaborador" && <ServiceWorkspace />}
        {role === "cliente" && <ClientPortal />}
      </main>
    </div>
  )
}
