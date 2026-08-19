"use client"

import { useState } from "react"
import { Cpu, ShieldCheck, Wrench, UserRound, LogOut, KeyRound, ChevronDown, Calculator } from "lucide-react"
import { useStore } from "@/lib/store"
import { ServiceWorkspace } from "@/components/service-workspace"
import { ClientPortal } from "@/components/client/client-portal"
import { AdminView } from "@/components/admin/admin-view"
import { LoginScreen } from "@/components/login-screen"
import { ChangePasswordDialog } from "@/components/change-password-dialog"
import { AnnouncementInbox } from "@/components/announcements/announcement-inbox"
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
import Image from "next/image"

const ROLE_ICON: Record<Role, typeof ShieldCheck> = {
  admin: ShieldCheck,
  colaborador: Wrench,
  presupuestador: Calculator,
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
  const roleLabel = role === "colaborador" ? "Colaborador" : role === "presupuestador" ? "Presupuestos" : role === "admin" ? "Admin" : "Cliente"

  return (
    <div className="min-h-screen bg-background">
      <AnnouncementInbox />
      <header className="sticky top-0 z-30 border-b border-border/70 bg-background/75 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="relative flex size-9 items-center justify-center overflow-hidden rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
              <span className="absolute inset-0 bg-white/15" aria-hidden="true" />
              <Cpu className="size-5" />
            </div>
            <div>
              <p className="font-semibold leading-tight text-foreground">UTech</p>
              <p className="text-xs text-muted-foreground">Servicio técnico</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-xl border border-border/80 bg-card/70 px-3 py-1.5 text-left shadow-sm transition-[background-color,border-color,box-shadow] duration-200 hover:border-primary/40 hover:bg-muted hover:shadow-md"
                    aria-label="Abrir menú de usuario"
                  />
                }
              >
                {role === "cliente" && currentUser?.company?.logo ? <Image src={currentUser.company.logo} alt={currentUser.company.name} width={24} height={24} unoptimized className="size-6 rounded object-contain" /> : <RoleIcon className="size-4 text-primary" />}
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
        <div className="animate-utech-enter">
          {role === "admin" && <AdminView />}
          {(role === "colaborador" || role === "presupuestador") && <ServiceWorkspace />}
          {role === "cliente" && <ClientPortal />}
        </div>
      </main>
    </div>
  )
}
