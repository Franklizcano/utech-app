"use client"

import { useEffect, useMemo, useState } from "react"
import { Building2, Loader2, Pencil, UserPlus } from "lucide-react"
import { fetchCompaniesAction } from "@/app/actions/companies"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useStore } from "@/lib/store"
import type { Company } from "@/lib/types"

export function CorporateUserManagement() {
  const { users, usersLoading, addUser, updateUser, toggleUserActive } = useStore()
  const [companies, setCompanies] = useState<Company[]>([])
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<(typeof users)[number] | null>(null)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [password, setPassword] = useState("")
  const [confirmation, setConfirmation] = useState("")
  const [companyId, setCompanyId] = useState("")
  const [referralCode, setReferralCode] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  useEffect(() => { fetchCompaniesAction().then((result) => setCompanies(result.companies)).catch(() => setError("No se pudieron cargar las empresas.")) }, [])
  const corporateUsers = useMemo(() => users.filter((user) => user.companyId), [users])
  const selected = companies.find((company) => company.id === companyId)
  const selectedCount = selected ? selected.userCount - (editing?.companyId === selected.id ? 1 : 0) : 0

  function startCreate() {
    setEditing(null)
    setName("")
    setEmail("")
    setPhone("")
    setPassword("")
    setConfirmation("")
    setCompanyId("")
    setReferralCode("")
    setError(null)
    setOpen(true)
  }

  function startEdit(user: (typeof users)[number]) {
    setEditing(user)
    setName(user.name)
    setEmail(user.email)
    setPhone(user.phone)
    setPassword("")
    setConfirmation("")
    setCompanyId(user.companyId ?? "")
    setReferralCode("")
    setError(null)
    setOpen(true)
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!name.trim() || !email.trim() || !phone.trim()) return setError("Completá nombre, email y teléfono.")
    if (!companyId) return setError("Seleccioná la empresa a la que pertenece el usuario.")
    if (!editing && password.length < 8) return setError("La contraseña debe tener al menos 8 caracteres.")
    if (!editing && password !== confirmation) return setError("Las contraseñas no coinciden.")
    if (selected && selectedCount >= selected.userLimit) return setError("Esta empresa ya alcanzó su cupo.")

    setSaving(true)
    if (editing) {
      updateUser(editing.id, { name, email, phone, role: "cliente", active: editing.active, companyId })
      setSaving(false)
      setOpen(false)
      return
    }

    const result = await addUser({ name, email, phone, password, role: "cliente", companyId, referralCode: referralCode || undefined })
    setSaving(false)
    if (!result.success) return setError(result.error ?? "No se pudo crear el usuario corporativo.")
    setCompanies((current) => current.map((company) => company.id === companyId ? { ...company, userCount: company.userCount + 1 } : company))
    setOpen(false)
  }

  return <Card>
    <CardHeader className="flex flex-row items-center justify-between"><div><CardTitle className="flex items-center gap-2"><Building2 className="size-5 text-primary" />Usuarios corporativos</CardTitle><p className="mt-1 text-sm text-muted-foreground">Creá y editá clientes corporativos y asignales una empresa.</p></div><Button className="gap-2" onClick={startCreate}><UserPlus className="size-4" />Crear usuario corporativo</Button></CardHeader>
    <CardContent>{usersLoading ? <p className="py-8 text-center text-sm text-muted-foreground">Cargando usuarios…</p> : <Table><TableHeader><TableRow><TableHead>Nombre</TableHead><TableHead>Email</TableHead><TableHead>Empresa</TableHead><TableHead>Estado</TableHead><TableHead className="text-right">Acciones</TableHead></TableRow></TableHeader><TableBody>{corporateUsers.length === 0 ? <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">Todavía no hay usuarios corporativos.</TableCell></TableRow> : corporateUsers.map((user) => <TableRow key={user.id}><TableCell className="font-medium">{user.name}</TableCell><TableCell>{user.email}</TableCell><TableCell>{companies.find((company) => company.id === user.companyId)?.name ?? "Sin empresa"}</TableCell><TableCell><button type="button" onClick={() => toggleUserActive(user.id)} className="inline-flex items-center gap-1.5 rounded-md border border-transparent px-2 py-1 text-sm transition-all hover:-translate-y-0.5 hover:border-border hover:bg-secondary hover:shadow-sm active:translate-y-0 active:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><span className={`size-2 rounded-full ${user.active ? "bg-emerald-400" : "bg-zinc-500"}`} /><span className={user.active ? "text-foreground" : "text-muted-foreground"}>{user.active ? "Activo" : "Inactivo"}</span></button></TableCell><TableCell className="text-right"><Button variant="ghost" size="sm" className="gap-1.5" onClick={() => startEdit(user)}><Pencil className="size-3.5" />Editar</Button></TableCell></TableRow>)}</TableBody></Table>}</CardContent>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>{editing ? "Editar usuario corporativo" : "Crear usuario corporativo"}</DialogTitle><DialogDescription>{editing ? "Modificá los datos y la empresa del usuario." : "Elegí la empresa antes de crear su acceso."}</DialogDescription></DialogHeader><form onSubmit={save} className="space-y-4"><div className="space-y-2"><Label htmlFor="cu-name">Nombre y apellido</Label><Input id="cu-name" value={name} onChange={(e) => setName(e.target.value)} required /></div><div className="space-y-2"><Label htmlFor="cu-email">Email</Label><Input id="cu-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div><div className="space-y-2"><Label htmlFor="cu-phone">Teléfono</Label><Input id="cu-phone" value={phone} onChange={(e) => setPhone(e.target.value)} required /></div><div className="space-y-2"><Label>Empresa</Label><Select value={companyId} onValueChange={(value) => setCompanyId(value ?? "")}><SelectTrigger><SelectValue placeholder="Seleccioná una empresa" /></SelectTrigger><SelectContent>{companies.map((company) => <SelectItem key={company.id} value={company.id} disabled={company.id !== editing?.companyId && company.userCount >= company.userLimit}>{company.name} ({company.id === editing?.companyId ? selectedCount : company.userCount}/{company.userLimit})</SelectItem>)}</SelectContent></Select>{selected && selectedCount >= selected.userLimit && <p className="text-sm text-destructive">Esta empresa ya alcanzó su cupo.</p>}</div>{!editing && <><div className="space-y-2"><Label htmlFor="cu-referral-code">Código de referido (opcional)</Label><Input id="cu-referral-code" value={referralCode} onChange={(e) => setReferralCode(e.target.value.toUpperCase())} placeholder="Ej: A1B2C3D4E5F6" maxLength={12} autoComplete="off" /><p className="text-xs text-muted-foreground">Código del cliente que recomendó a esta persona.</p></div><div className="space-y-2"><Label htmlFor="cu-password">Contraseña inicial</Label><Input id="cu-password" type="password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} required /></div><div className="space-y-2"><Label htmlFor="cu-confirmation">Repetir contraseña</Label><Input id="cu-confirmation" type="password" minLength={8} value={confirmation} onChange={(e) => setConfirmation(e.target.value)} required /></div></>}{error && <p className="text-sm text-destructive">{error}</p>}<DialogFooter><Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancelar</Button><Button type="submit" disabled={saving || !!(selected && selectedCount >= selected.userLimit)}>{saving && <Loader2 className="size-4 animate-spin" />}{editing ? "Guardar cambios" : "Crear usuario"}</Button></DialogFooter></form></DialogContent></Dialog>
  </Card>
}
