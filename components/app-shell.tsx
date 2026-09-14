"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Bell, Building2, ChevronDown, CircleHelp, Cpu, Calculator, KeyRound, LogOut, Megaphone, Moon, Settings, Settings2, ShieldCheck, SlidersHorizontal, Sun, UserRound, Wrench } from "lucide-react"
import { useStore } from "@/lib/store"
import { ServiceWorkspace } from "@/components/service-workspace"
import { ClientPortal } from "@/components/client/client-portal"
import { AdminView, type AdminSection } from "@/components/admin/admin-view"
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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import type { Role } from "@/lib/types"
import Image from "next/image"

const ROLE_ICON: Record<Role, typeof ShieldCheck> = {
  admin: ShieldCheck,
  colaborador: Wrench,
  presupuestador: Calculator,
  cliente: UserRound,
}

export function AppShell() {
  const router = useRouter()
  const { role, currentUser, isLoggedIn, logout } = useStore()
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false)
  const [profileDialogOpen, setProfileDialogOpen] = useState(false)
  const [companyDialogOpen, setCompanyDialogOpen] = useState(false)
  const [preferencesDialogOpen, setPreferencesDialogOpen] = useState(false)
  const [helpDialogOpen, setHelpDialogOpen] = useState(false)
  const [announcementDialogOpen, setAnnouncementDialogOpen] = useState(false)
  const [unreadAnnouncements, setUnreadAnnouncements] = useState(0)
  const [theme, setTheme] = useState<"dark" | "light">(() => typeof window !== "undefined" && window.localStorage.getItem("utech-theme") === "light" ? "light" : "dark")
  const [adminSection, setAdminSection] = useState<AdminSection>("operaciones")
  const announcementInitialLoad = useRef(false)

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark")
  }, [theme])

  const handleUnreadCountChange = useCallback((count: number) => {
    setUnreadAnnouncements(count)
    if (!announcementInitialLoad.current && count > 0) setAnnouncementDialogOpen(true)
    if (count === 0) setAnnouncementDialogOpen(false)
    announcementInitialLoad.current = true
  }, [])

  if (!isLoggedIn) {
    return <LoginScreen />
  }

  const RoleIcon = ROLE_ICON[role]
  const displayName = currentUser?.name ?? (role === "colaborador" ? "Colaborador" : role === "admin" ? "Admin" : "Cliente")
  const roleLabel = role === "colaborador" ? "Colaborador" : role === "presupuestador" ? "Presupuestos" : role === "admin" ? "Admin" : "Cliente"

  function handleLogout() {
    logout()
    router.replace("/")
  }

  function changeTheme(nextTheme: "dark" | "light") {
    setTheme(nextTheme)
    window.localStorage.setItem("utech-theme", nextTheme)
    document.documentElement.classList.toggle("dark", nextTheme === "dark")
  }

  function openCompanyDetails() {
    setCompanyDialogOpen(true)
  }

  function goToCompanyMembers() {
    setCompanyDialogOpen(false)
    window.setTimeout(() => document.getElementById("company-members")?.scrollIntoView({ behavior: "smooth", block: "start" }), 0)
  }

  function selectAdminSection(section: AdminSection) {
    setAdminSection(section)
    window.setTimeout(() => document.getElementById("main-content")?.scrollIntoView({ behavior: "smooth", block: "start" }), 0)
  }

  return (
    <div className="min-h-screen bg-background">
      <AnnouncementInbox open={announcementDialogOpen} onOpenChange={setAnnouncementDialogOpen} onUnreadCountChange={handleUnreadCountChange} />
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
                <DropdownMenuItem onClick={() => setProfileDialogOpen(true)}>
                  <UserRound />
                  Mi perfil
                </DropdownMenuItem>
                <DropdownMenuItem disabled={unreadAnnouncements === 0} onClick={() => setAnnouncementDialogOpen(true)}>
                  <Bell />
                  <span className="flex-1">Notificaciones</span>
                  {unreadAnnouncements > 0 && <span className="rounded-full bg-primary/15 px-1.5 text-[10px] font-semibold text-primary">{unreadAnnouncements}</span>}
                </DropdownMenuItem>
                {role === "cliente" && currentUser?.companyId && (
                  <DropdownMenuItem onClick={openCompanyDetails}>
                    <Building2 />
                    Mi empresa
                  </DropdownMenuItem>
                )}
                {role === "admin" && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuGroup>
                      <DropdownMenuLabel>Administración</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => selectAdminSection("empresas")}>
                        <Building2 />
                        Empresas
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => selectAdminSection("estados")}>
                        <Settings />
                        Estados
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => selectAdminSection("avisos")}>
                        <Megaphone />
                        Avisos
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => selectAdminSection("configuracion")}>
                        <SlidersHorizontal />
                        Configuración
                      </DropdownMenuItem>
                    </DropdownMenuGroup>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setPasswordDialogOpen(true)}>
                  <KeyRound />
                  Cambiar contraseña
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setPreferencesDialogOpen(true)}>
                  <Settings2 />
                  Preferencias
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setHelpDialogOpen(true)}>
                  <CircleHelp />
                  Ayuda
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onClick={handleLogout}>
                  <LogOut />
                  Cerrar sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <ChangePasswordDialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen} />

            <Dialog open={profileDialogOpen} onOpenChange={setProfileDialogOpen}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Mi perfil</DialogTitle>
                  <DialogDescription>Información de tu cuenta y permisos actuales.</DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="rounded-xl border bg-muted/30 p-4">
                    <p className="text-lg font-semibold text-foreground">{displayName}</p>
                    <p className="text-sm text-muted-foreground">{roleLabel}</p>
                  </div>
                  <div className="grid gap-3 text-sm sm:grid-cols-2">
                    <div><p className="text-muted-foreground">Email</p><p className="font-medium text-foreground break-words">{currentUser?.email ?? "—"}</p></div>
                    <div><p className="text-muted-foreground">Teléfono</p><p className="font-medium text-foreground">{currentUser?.phone ?? "—"}</p></div>
                    <div><p className="text-muted-foreground">Empresa</p><p className="font-medium text-foreground">{currentUser?.company?.name ?? "Sin empresa"}</p></div>
                    <div><p className="text-muted-foreground">Permiso</p><p className="font-medium capitalize text-foreground">{currentUser?.companyRole === "manager" ? "Manager" : currentUser?.companyId ? "Integrante" : "—"}</p></div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={companyDialogOpen} onOpenChange={setCompanyDialogOpen}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Mi empresa</DialogTitle>
                  <DialogDescription>Información de la empresa asociada a tu cuenta.</DialogDescription>
                </DialogHeader>
                <div className="flex items-center gap-3 rounded-xl border bg-muted/30 p-4">
                  <div className="flex size-14 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-white p-2 shadow-sm">
                    {currentUser?.company?.logo ? <Image src={currentUser.company.logo} alt={`Logo de ${currentUser.company.name}`} width={56} height={56} unoptimized className="size-full object-contain" /> : <Building2 className="size-6 text-slate-500" aria-hidden="true" />}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-foreground">{currentUser?.company?.name ?? "Sin empresa"}</p>
                    <p className="text-sm text-muted-foreground">{currentUser?.companyRole === "manager" ? "Manager" : "Integrante"}</p>
                  </div>
                </div>
                {currentUser?.companyRole === "manager" && <DialogFooter><Button type="button" onClick={goToCompanyMembers}>Gestionar integrantes</Button></DialogFooter>}
              </DialogContent>
            </Dialog>

            <Dialog open={preferencesDialogOpen} onOpenChange={setPreferencesDialogOpen}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Preferencias</DialogTitle>
                  <DialogDescription>Personalizá la apariencia de UTech en este dispositivo.</DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-3">
                  <Button type="button" variant={theme === "dark" ? "default" : "outline"} className="h-auto justify-start gap-2 p-3" onClick={() => changeTheme("dark")}>
                    <Moon className="size-4" />
                    <span className="text-left"><span className="block font-medium">Oscuro</span><span className="block text-xs opacity-75">Predeterminado</span></span>
                  </Button>
                  <Button type="button" variant={theme === "light" ? "default" : "outline"} className="h-auto justify-start gap-2 p-3" onClick={() => changeTheme("light")}>
                    <Sun className="size-4" />
                    <span className="text-left"><span className="block font-medium">Claro</span><span className="block text-xs opacity-75">Mayor luminosidad</span></span>
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={helpDialogOpen} onOpenChange={setHelpDialogOpen}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Ayuda</DialogTitle>
                  <DialogDescription>Algunas sugerencias para usar UTech.</DialogDescription>
                </DialogHeader>
                <div className="space-y-3 text-sm text-muted-foreground">
                  <p>Usá el menú principal para acceder a tus órdenes y tareas según tu rol.</p>
                  <p>Desde tu perfil podés consultar tus datos, avisos y preferencias.</p>
                  <p>Si necesitás asistencia, contactá al administrador del sistema.</p>
                </div>
                <DialogFooter><Button type="button" variant="outline" onClick={() => setHelpDialogOpen(false)}>Cerrar</Button></DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      <main id="main-content" className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="animate-utech-enter">
          {role === "admin" && <AdminView activeTab={adminSection} onTabChange={setAdminSection} />}
          {(role === "colaborador" || role === "presupuestador") && <ServiceWorkspace />}
          {role === "cliente" && <ClientPortal />}
        </div>
      </main>
    </div>
  )
}
