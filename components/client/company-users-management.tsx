"use client"

import { useEffect, useState } from "react"
import { Building2, Loader2, Pencil, UserPlus, UserMinus } from "lucide-react"
import { createCompanyUserAction, fetchCompanyUsersAction, removeCompanyUserAction, updateCompanyUserAction } from "@/app/actions/company-users"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { User } from "@/lib/types"
import { useStore } from "@/lib/store"

export function CompanyUsersManagement() {
  const { currentUser } = useStore()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<User | null>(null)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [password, setPassword] = useState("")
  const [confirmation, setConfirmation] = useState("")

  const isManager = currentUser?.role === "cliente" && currentUser.companyRole === "manager" && Boolean(currentUser.companyId)

  useEffect(() => {
    if (!isManager) return
    void fetchCompanyUsersAction().then(setUsers).catch(() => setError("No se pudieron cargar los integrantes de la empresa.")).finally(() => setLoading(false))
  }, [isManager])

  if (!isManager) return null

  function openCreate() {
    setEditing(null); setName(""); setEmail(""); setPhone(""); setPassword(""); setConfirmation(""); setError(null); setOpen(true)
  }

  function openEdit(user: User) {
    setEditing(user); setName(user.name); setEmail(user.email); setPhone(user.phone); setPassword(""); setConfirmation(""); setError(null); setOpen(true)
  }

  async function save(event: React.FormEvent) {
    event.preventDefault(); setError(null)
    if (!name.trim() || !email.trim() || !phone.trim()) return setError("Completá nombre, email y teléfono.")
    if (!editing && (password.length < 8 || password !== confirmation)) return setError(password.length < 8 ? "La contraseña debe tener al menos 8 caracteres." : "Las contraseñas no coinciden.")
    setSaving(true)
    const result = editing
      ? await updateCompanyUserAction(editing.id, { name, email, phone })
      : await createCompanyUserAction({ name, email, phone, password })
    setSaving(false)
    if (!result.success || !result.user) return setError(result.error ?? "No se pudo guardar el integrante.")
    setUsers((current) => editing ? current.map((user) => user.id === result.user!.id ? result.user! : user) : [...current, result.user!])
    setOpen(false)
  }

  async function remove(id: string) {
    setError(null)
    const result = await removeCompanyUserAction(id)
    if (!result.success) return setError(result.error ?? "No se pudo quitar el integrante.")
    setUsers((current) => current.filter((user) => user.id !== id))
  }

  return <Card>
    <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div><CardTitle className="flex items-center gap-2"><Building2 className="size-5 text-primary" />Integrantes de mi empresa</CardTitle><p className="mt-1 text-sm text-muted-foreground">Administrá los accesos sin modificar el cupo de la empresa.</p></div>
      <Button type="button" className="gap-2" onClick={openCreate}><UserPlus className="size-4" />Agregar integrante</Button>
    </CardHeader>
    <CardContent>
      {error && <p className="mb-3 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">{error}</p>}
      {loading ? <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" />Cargando integrantes…</div> : users.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">No hay integrantes para mostrar.</p> : <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left text-muted-foreground"><th className="px-2 py-2 font-medium">Nombre</th><th className="px-2 py-2 font-medium">Email</th><th className="px-2 py-2 font-medium">Teléfono</th><th className="px-2 py-2 text-right font-medium">Acciones</th></tr></thead><tbody>{users.map((user) => <tr key={user.id} className="border-b last:border-0"><td className="px-2 py-2 font-medium">{user.name}</td><td className="px-2 py-2 text-muted-foreground">{user.email}</td><td className="px-2 py-2 text-muted-foreground">{user.phone}</td><td className="px-2 py-2 text-right"><Button type="button" variant="ghost" size="sm" className="mr-1 gap-1" onClick={() => openEdit(user)}><Pencil className="size-3.5" />Editar</Button><AlertDialog><AlertDialogTrigger render={<Button type="button" variant="ghost" size="sm" className="gap-1 text-destructive hover:text-destructive" />}><UserMinus className="size-3.5" />Quitar</AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>¿Quitar integrante?</AlertDialogTitle><AlertDialogDescription>{user.name} dejará de pertenecer a la empresa, pero su cuenta no será eliminada.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => void remove(user.id)}>Quitar de la empresa</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></td></tr>)}</tbody></table></div>}
    </CardContent>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>{editing ? "Editar integrante" : "Agregar integrante"}</DialogTitle><DialogDescription>{editing ? "Solo se pueden modificar los datos básicos." : "El nuevo usuario se incorporará a tu empresa como integrante."}</DialogDescription></DialogHeader><form onSubmit={save} className="space-y-4"><div className="space-y-2"><Label htmlFor="company-user-name">Nombre y apellido</Label><Input id="company-user-name" value={name} onChange={(event) => setName(event.target.value)} required /></div><div className="space-y-2"><Label htmlFor="company-user-email">Email</Label><Input id="company-user-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></div><div className="space-y-2"><Label htmlFor="company-user-phone">Teléfono</Label><Input id="company-user-phone" value={phone} onChange={(event) => setPhone(event.target.value)} required /></div>{!editing && <><div className="space-y-2"><Label htmlFor="company-user-password">Contraseña inicial</Label><Input id="company-user-password" type="password" minLength={8} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></div><div className="space-y-2"><Label htmlFor="company-user-confirmation">Repetir contraseña</Label><Input id="company-user-confirmation" type="password" minLength={8} autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} required /></div></>}{error && <p className="text-sm text-destructive">{error}</p>}<DialogFooter><Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancelar</Button><Button type="submit" disabled={saving}>{saving && <Loader2 className="size-4 animate-spin" />}{editing ? "Guardar cambios" : "Crear integrante"}</Button></DialogFooter></form></DialogContent></Dialog>
  </Card>
}
