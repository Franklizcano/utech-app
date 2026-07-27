"use client"

import { useState } from "react"
import { UserPlus, Pencil, ShieldCheck, Building2 } from "lucide-react"
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
import { useStore } from "@/lib/store"
import type { Role, User } from "@/lib/types"

const ROLE_LABELS: Record<Role, string> = {
  admin: "Administrador",
  colaborador: "Colaborador",
  cliente: "Cliente",
}

const ROLE_BADGE: Record<Role, string> = {
  admin: "bg-primary/15 text-primary border-primary/30",
  colaborador: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  cliente: "bg-zinc-500/15 text-zinc-300 border-zinc-500/30",
}

export function UserManagement() {
  const { users, addUser, updateUser, toggleUserActive, usersLoading } = useStore()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<User | null>(null)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [role, setRole] = useState<Role>("colaborador")
  const [isCorporate, setIsCorporate] = useState(false)
  const [companyName, setCompanyName] = useState("")
  const [companyLogo, setCompanyLogo] = useState("")

  function openCreate() {
    setEditing(null)
    setName("")
    setEmail("")
    setPhone("")
    setRole("colaborador")
    setIsCorporate(false)
    setCompanyName("")
    setCompanyLogo("")
    setOpen(true)
  }

  function openEdit(user: User) {
    setEditing(user)
    setName(user.name)
    setEmail(user.email)
    setPhone(user.phone || "")
    setRole(user.role)
    setIsCorporate(user.isCorporate ?? false)
    setCompanyName(user.companyName || "")
    setCompanyLogo(user.companyLogo || "")
    setOpen(true)
  }

  function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      setCompanyLogo(event.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !email.trim() || !phone.trim()) return
    if (role === "cliente" && isCorporate && !companyName.trim()) return
    
    const userData = {
      name,
      email,
      phone,
      role,
      ...(role === "cliente" && {
        isCorporate,
        ...(isCorporate && {
          companyName: companyName || undefined,
          companyLogo: companyLogo || undefined,
        }),
      }),
    }

    if (editing) {
      updateUser(editing.id, { ...userData, active: editing.active })
    } else {
      addUser(userData)
    }
    setOpen(false)
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
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium text-foreground">{user.name}</TableCell>
                <TableCell className="text-muted-foreground">{user.email}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={ROLE_BADGE[user.role]}>
                    {ROLE_LABELS[user.role]}
                  </Badge>
                </TableCell>
                <TableCell>
                  <button
                    type="button"
                    onClick={() => toggleUserActive(user.id)}
                    className="inline-flex items-center gap-1.5 text-sm"
                  >
                    <span className={`size-2 rounded-full ${user.active ? "bg-emerald-400" : "bg-zinc-500"}`} />
                    <span className={user.active ? "text-foreground" : "text-muted-foreground"}>
                      {user.active ? "Activo" : "Inactivo"}
                    </span>
                  </button>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => openEdit(user)}>
                    <Pencil className="size-3.5" />
                    Editar
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
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
            <div className="space-y-2">
              <Label>Rol</Label>
              <Select value={role} onValueChange={(v) => setRole(v as Role)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="colaborador">Colaborador</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="cliente">Cliente</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {role === "cliente" && (
              <>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={isCorporate}
                      onChange={(e) => setIsCorporate(e.target.checked)}
                      className="rounded border-input"
                    />
                    <span>Es cliente corporativo</span>
                  </Label>
                </div>

                {isCorporate && (
                  <div className="space-y-3 rounded-lg border border-border bg-secondary/20 p-3">
                    <div className="space-y-2">
                      <Label htmlFor="u-company">Nombre de la empresa *</Label>
                      <Input
                        id="u-company"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        placeholder="Ej: Tech Solutions S.A."
                        required={isCorporate}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="u-logo">Logo de la empresa</Label>
                      <Input
                        id="u-logo"
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                      />
                      {companyLogo && (
                        <div className="flex items-center gap-2 mt-2">
                          <img src={companyLogo} alt="logo" className="h-10 w-10 rounded object-contain" />
                          <button
                            type="button"
                            onClick={() => setCompanyLogo("")}
                            className="text-xs text-muted-foreground hover:text-foreground"
                          >
                            Remover
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">{editing ? "Guardar cambios" : "Crear usuario"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
