"use client"

import { useState } from "react"
import { Cpu, ShieldCheck, Wrench, UserRound, LogOut, KeyRound, ChevronDown } from "lucide-react"
import { useStore } from "@/lib/store"
import { ServiceWorkspace } from "@/components/service-workspace"
import { ClientPortal } from "@/components/client/client-portal"
import { AdminView } from "@/components/admin/admin-view"
import { LoginScreen } from "@/components/login-screen"
import { ChangePasswordDialog } from "@/components/change-password-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { Role } from "@/lib/types"

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
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false)

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
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-left transition-colors hover:border-primary/40 hover:bg-muted"
                    aria-label="Abrir menú de usuario"
                  />
                }
              >
                <RoleIcon className="size-4 text-primary" />
                <span className="flex flex-col">
                  <span className="text-sm font-medium leading-tight text-foreground">{displayName}</span>
                  <span className="text-[10px] leading-tight text-muted-foreground">{roleLabel}</span>
                </span>
                <ChevronDown className="size-4 text-muted-foreground" />
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuGroup>
                  <DropdownMenuLabel>
                    <span className="block truncate text-foreground">{displayName}</span>
                    <span className="block text-[11px] font-normal">{roleLabel}</span>
                  </DropdownMenuLabel>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setPasswordDialogOpen(true)}>
                  <KeyRound />
                  Cambiar contraseña
                </DropdownMenuItem>
                <DropdownMenuItem variant="destructive" onClick={logout}>
                  <LogOut />
                  Cerrar sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <ChangePasswordDialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen} />
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
