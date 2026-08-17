"use client"

import { useEffect, useState } from "react"
import { UserPlus, Pencil, ShieldCheck, Trash2, AlertCircle, ChevronLeft, ChevronRight, Loader2, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useStore } from "@/lib/store"
import { fetchAdminReferralSummariesAction } from "@/app/actions/referrals"
import { useDebouncedValue } from "@/lib/use-debounced-value"
import type { Role, User } from "@/lib/types"

const ROLE_LABELS: Record<Role, string> = {
  admin: "Administrador",
  colaborador: "Colaborador",
  presupuestador: "Responsable de presupuesto",
  cliente: "Cliente",
}

const ROLE_BADGE: Record<Role, string> = {
  admin: "bg-primary/15 text-primary border-primary/30",
  colaborador: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  presupuestador: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  cliente: "bg-zinc-500/15 text-zinc-300 border-zinc-500/30",
}

type RoleFilter = "all" | Role

function normalizeSearchText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
}

export function UserManagement() {
  const { users, addUser, updateUser, toggleUserActive, deleteUser, usersLoading, usersPage, usersHasMore, loadUsersPage } = useStore()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<User | null>(null)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [role, setRole] = useState<Role>("colaborador")
  const [password, setPassword] = useState("")
  const [passwordConfirmation, setPasswordConfirmation] = useState("")
  const [referralCode, setReferralCode] = useState("")
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all")
  const [search, setSearch] = useState("")
  const debouncedSearch = useDebouncedValue(search, 350)
  const [referralSummaries, setReferralSummaries] = useState<Awaited<ReturnType<typeof fetchAdminReferralSummariesAction>>>([])

  useEffect(() => {
    fetchAdminReferralSummariesAction().then(setReferralSummaries).catch((error: unknown) => {
      console.error("No se pudieron cargar los resúmenes de referidos:", error)
    })
  }, [])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadUsersPage(0, debouncedSearch)
    }, 350)
    return () => window.clearTimeout(timeoutId)
  }, [debouncedSearch, loadUsersPage])

  const managedUsers = users
  const normalizedSearch = normalizeSearchText(debouncedSearch)
  const visibleUsers = managedUsers.filter((user) => {
    const matchesRole = roleFilter === "all" || user.role === roleFilter
    const matchesSearch = !normalizedSearch || [user.name, user.email, user.phone, user.referralCode].some((value) =>
      normalizeSearchText(value).includes(normalizedSearch),
    )

    return matchesRole && matchesSearch
  })

  function countForRole(filter: RoleFilter) {
    return filter === "all" ? managedUsers.length : managedUsers.filter((user) => user.role === filter).length
  }

  function referralSummaryFor(userId: string) {
    return referralSummaries.find((summary) => summary.referrerId === userId)
  }

  function openCreate() {
    setEditing(null)
    setName("")
    setEmail("")
    setPhone("")
    setRole("colaborador")
    setPassword("")
    setPasswordConfirmation("")
    setReferralCode("")
    setFormError(null)
    setOpen(true)
  }

  function openEdit(user: User) {
    setEditing(user)
    setName(user.name)
    setEmail(user.email)
    setPhone(user.phone || "")
    setRole(user.role)
    setPassword("")
    setPasswordConfirmation("")
    setReferralCode("")
    setFormError(null)
    setOpen(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)
    if (saving) return
    if (!name.trim() || !email.trim() || !phone.trim()) {
      setFormError("Completá nombre, email y teléfono.")
      return
    }
    if (!editing && password.length < 8) {
      setFormError("La contraseña debe tener al menos 8 caracteres.")
      return
    }
    if (!editing && password !== passwordConfirmation) {
      setFormError("Las contraseñas no coinciden.")
      return
    }

    const userData = {
      name,
      email,
      phone,
      role,
    }

    setSaving(true)
    try {
      if (editing) {
        updateUser(editing.id, { ...userData, active: editing.active })
      } else {
        const result = await addUser({ ...userData, password, referralCode: role === "cliente" ? referralCode : undefined })
        if (!result.success) {
          setFormError(result.error ?? "No se pudo crear el usuario.")
          return
        }
      }
      setOpen(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="size-5 text-primary" />
            Gestión de usuarios
          </CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Sólo el administrador puede crear usuarios y asignarles un rol.
          </p>
        </div>
        <Button className="gap-2" onClick={openCreate}>
          <UserPlus className="size-4" />
          Crear usuario
        </Button>
      </CardHeader>
      <CardContent>
        {usersLoading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
            Cargando usuarios…
          </div>
        ) : (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <Tabs value={roleFilter} onValueChange={(value) => setRoleFilter(value as RoleFilter)}>
              <TabsList className="w-full overflow-x-auto lg:w-auto">
                <TabsTrigger value="all">Todos ({countForRole("all")})</TabsTrigger>
                <TabsTrigger value="admin">Administradores ({countForRole("admin")})</TabsTrigger>
                <TabsTrigger value="colaborador">Colaboradores ({countForRole("colaborador")})</TabsTrigger>
                <TabsTrigger value="presupuestador">Presupuestos ({countForRole("presupuestador")})</TabsTrigger>
                <TabsTrigger value="cliente">Clientes ({countForRole("cliente")})</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="relative w-full lg:max-w-xs">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                aria-label="Buscar usuarios"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nombre, email o teléfono"
                autoComplete="off"
                className="pl-9"
              />
            </div>
          </div>

          {visibleUsers.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-secondary/20 p-8 text-center text-sm text-muted-foreground">
              {managedUsers.length === 0
                ? "No hay usuarios para mostrar."
                : "No se encontraron usuarios con los filtros seleccionados."}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Referidos</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium text-foreground">{user.name}</TableCell>
                    <TableCell className="text-muted-foreground">{user.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={ROLE_BADGE[user.role]}>
                        {ROLE_LABELS[user.role]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {user.role === "cliente" ? (() => {
                        const summary = referralSummaryFor(user.id)
                        return (
                          <div className="min-w-44 space-y-1">
                            <div className="font-mono text-xs tracking-widest text-foreground">{user.referralCode || "—"}</div>
                            <div className="text-xs text-muted-foreground">
                              {summary?.totalReferredUsers ?? 0} referidos · {summary?.totalOrders ?? 0} órdenes
                            </div>
                            {summary && summary.referredUsers.length > 0 && (
                              <div className="max-w-56 truncate text-xs text-muted-foreground" title={summary.referredUsers.map((referred) => `${referred.name} (${referred.orderCount})`).join(", ")}>
                                {summary.referredUsers.map((referred) => `${referred.name} (${referred.orderCount})`).join(", ")}
                              </div>
                            )}
                          </div>
                        )
                      })() : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      <button
                        type="button"
                        onClick={() => toggleUserActive(user.id)}
                        className="inline-flex items-center gap-1.5 rounded-md border border-transparent px-2 py-1 text-sm transition-all hover:-translate-y-0.5 hover:border-border hover:bg-secondary hover:shadow-sm active:translate-y-0 active:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <span className={`size-2 rounded-full ${user.active ? "bg-emerald-400" : "bg-zinc-500"}`} />
                        <span className={user.active ? "text-foreground" : "text-muted-foreground"}>
                          {user.active ? "Activo" : "Inactivo"}
                        </span>
                      </button>
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => openEdit(user)}>
                        <Pencil className="size-3.5" />
                        Editar
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger
                          render={
                            <Button
                              variant="ghost"
                              size="sm"
                              className="gap-1.5 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="size-3.5" />
                              Eliminar
                            </Button>
                          }
                        />
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>¿Eliminar usuario?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta acción no se puede deshacer. Se eliminará permanentemente a{" "}
                              <strong>{user.name}</strong> ({user.email}).
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              onClick={() => deleteUser(user.id)}
                            >
                              Eliminar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {!usersLoading && (
            <div className="flex items-center justify-between border-t border-border pt-4">
              <p className="text-sm text-muted-foreground">Página {usersPage + 1} · 50 usuarios por página</p>
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" disabled={usersPage === 0} onClick={() => void loadUsersPage(usersPage - 1, debouncedSearch)}>
                  <ChevronLeft className="size-4" />
                  Anterior
                </Button>
                <Button type="button" variant="outline" size="sm" disabled={!usersHasMore} onClick={() => void loadUsersPage(usersPage + 1, debouncedSearch)}>
                  Siguiente
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar usuario" : "Crear usuario"}</DialogTitle>
            <DialogDescription>
              {editing ? "Modificá los datos y el rol del usuario." : "Completá los datos y asigná un rol."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="u-name">Nombre y apellido</Label>
              <Input id="u-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Sofía Ruiz" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="u-email">Email</Label>
              <Input id="u-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="usuario@tecnofix.com" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="u-phone">Teléfono</Label>
              <Input id="u-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+54 11 0000-0000" required />
            </div>
            {!editing && (
              <div className="space-y-3 rounded-lg border border-border bg-secondary/20 p-3">
                <div className="space-y-2">
                  <Label htmlFor="u-password">Contraseña inicial</Label>
                  <Input
                    id="u-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    minLength={8}
                    autoComplete="new-password"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="u-password-confirmation">Repetir contraseña</Label>
                  <Input
                    id="u-password-confirmation"
                    type="password"
                    value={passwordConfirmation}
                    onChange={(e) => setPasswordConfirmation(e.target.value)}
                    placeholder="Repetí la contraseña inicial"
                    minLength={8}
                    autoComplete="new-password"
                    required
                  />
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label>Rol</Label>
              <Select value={role} onValueChange={(v) => setRole(v as Role)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="colaborador">Colaborador</SelectItem>
                  <SelectItem value="presupuestador">Responsable de presupuesto</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="cliente">Cliente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {!editing && role === "cliente" && (
              <div className="space-y-2">
                <Label htmlFor="u-referral-code">Código de referido (opcional)</Label>
                <Input
                  id="u-referral-code"
                  value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                  placeholder="Ej: A1B2C3D4E5F6"
                  maxLength={12}
                  autoComplete="off"
                />
                <p className="text-xs text-muted-foreground">Ingresá el código del cliente que recomendó a esta persona.</p>
              </div>
            )}

            {formError && (
              <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={saving}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="size-4 animate-spin" />}
                {editing ? "Guardar cambios" : "Crear usuario"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
