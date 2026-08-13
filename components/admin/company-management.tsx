"use client"

import { useEffect, useMemo, useState } from "react"
import { Building2, ChevronDown, ChevronUp, ImagePlus, Loader2, Pencil, Plus, Search, Trash2, UserPlus } from "lucide-react"
import { createCompanyAction, fetchCompaniesAction, updateCompanyAction } from "@/app/actions/companies"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Image from "next/image"
import { useStore } from "@/lib/store"
import { useDebouncedValue } from "@/lib/use-debounced-value"
import type { Company, User } from "@/lib/types"

export function CompanyManagement() {
  const { users, usersLoading, addUser, updateUser, toggleUserActive, deleteUser } = useStore()
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [companyDialogOpen, setCompanyDialogOpen] = useState(false)
  const [userDialogOpen, setUserDialogOpen] = useState(false)
  const [editingCompany, setEditingCompany] = useState<Company | null>(null)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [expandedCompanyId, setExpandedCompanyId] = useState<string | null>(null)
  const [name, setName] = useState("")
  const [limit, setLimit] = useState("1")
  const [logo, setLogo] = useState("")
  const [userName, setUserName] = useState("")
  const [userEmail, setUserEmail] = useState("")
  const [userPhone, setUserPhone] = useState("")
  const [userPassword, setUserPassword] = useState("")
  const [userConfirmation, setUserConfirmation] = useState("")
  const [userCompanyId, setUserCompanyId] = useState("")
  const [search, setSearch] = useState("")
  const debouncedSearch = useDebouncedValue(search, 350)
  const [draggingLogo, setDraggingLogo] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const load = () => fetchCompaniesAction().then(setCompanies).catch(() => setError("No se pudieron cargar las empresas.")).finally(() => setLoading(false))
  useEffect(() => { load() }, [])

  const filteredCompanies = useMemo(() => {
    const query = debouncedSearch.trim().toLocaleLowerCase()
    if (!query) return companies
    return companies.filter((company) => company.name.toLocaleLowerCase().includes(query))
  }, [companies, debouncedSearch])

  function startCreateCompany() { setEditingCompany(null); setName(""); setLimit("1"); setLogo(""); setError(null); setCompanyDialogOpen(true) }
  function startEditCompany(company: Company) { setEditingCompany(company); setName(company.name); setLimit(String(company.userLimit)); setLogo(company.logo ?? ""); setError(null); setCompanyDialogOpen(true) }
  function startCreateUser(companyId: string) { setEditingUser(null); setUserName(""); setUserEmail(""); setUserPhone(""); setUserPassword(""); setUserConfirmation(""); setUserCompanyId(companyId); setError(null); setUserDialogOpen(true) }
  function startEditUser(user: User) { setEditingUser(user); setUserName(user.name); setUserEmail(user.email); setUserPhone(user.phone); setUserPassword(""); setUserConfirmation(""); setUserCompanyId(user.companyId ?? ""); setError(null); setUserDialogOpen(true) }
  function processLogoFile(file: File | undefined) { if (!file) return; if (!file.type.startsWith("image/")) { setError("Seleccioná un archivo de imagen."); return }; const reader = new FileReader(); reader.onload = () => setLogo(typeof reader.result === "string" ? reader.result : ""); reader.readAsDataURL(file) }
  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) { processLogoFile(e.target.files?.[0]) }
  function handleLogoDrop(e: React.DragEvent<HTMLLabelElement>) { e.preventDefault(); setDraggingLogo(false); processLogoFile(e.dataTransfer.files?.[0]) }

  async function saveCompany(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError(null)
    const input = { name, userLimit: Number(limit), logo: logo || undefined }
    const result = editingCompany ? await updateCompanyAction(editingCompany.id, input) : await createCompanyAction(input)
    if (!result.success) { setError(result.error ?? "No se pudo guardar la empresa."); setSaving(false); return }
    await load(); setCompanyDialogOpen(false); setSaving(false)
  }

  async function saveUser(e: React.FormEvent) {
    e.preventDefault(); setError(null)
    if (!userName.trim() || !userEmail.trim() || !userPhone.trim()) return setError("Completá nombre, email y teléfono.")
    if (!userCompanyId) return setError("Seleccioná una empresa.")
    const selectedCompany = companies.find((company) => company.id === userCompanyId)
    const memberCount = users.filter((user) => user.companyId === userCompanyId && user.id !== editingUser?.id).length
    if (selectedCompany && memberCount >= selectedCompany.userLimit) return setError("Esta empresa ya alcanzó su cupo.")
    if (!editingUser && userPassword.length < 8) return setError("La contraseña debe tener al menos 8 caracteres.")
    if (!editingUser && userPassword !== userConfirmation) return setError("Las contraseñas no coinciden.")
    setSaving(true)
    if (editingUser) {
      updateUser(editingUser.id, { name: userName, email: userEmail, phone: userPhone, role: "cliente", active: editingUser.active, companyId: userCompanyId })
    } else {
      const result = await addUser({ name: userName, email: userEmail, phone: userPhone, password: userPassword, role: "cliente", companyId: userCompanyId })
      if (!result.success) { setError(result.error ?? "No se pudo crear el integrante."); setSaving(false); return }
    }
    setSaving(false); setUserDialogOpen(false); await load()
  }

  return <Card>
    <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><CardTitle className="flex items-center gap-2"><Building2 className="size-5 text-primary" />Empresas</CardTitle><p className="mt-1 text-sm text-muted-foreground">Administrá empresas e integrantes desde un solo lugar.</p></div><div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row"><div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar empresa..." aria-label="Buscar empresa" className="pl-9 sm:w-56" /></div><Button onClick={startCreateCompany} className="gap-2"><Plus className="size-4" />Crear empresa</Button></div></CardHeader>
    <CardContent>{loading ? <p className="py-8 text-center text-sm text-muted-foreground">Cargando empresas…</p> : filteredCompanies.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">{search.trim() ? "No se encontraron empresas con esa búsqueda." : "Todavía no hay empresas creadas."}</p> : <div className="space-y-3">{filteredCompanies.map((company) => { const members = users.filter((user) => user.companyId === company.id); const expanded = expandedCompanyId === company.id; const full = members.length >= company.userLimit; return <div key={company.id} className="rounded-lg border p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div className="flex min-w-0 items-center gap-3">{company.logo ? <Image src={company.logo} alt={`Logo de ${company.name}`} width={48} height={48} unoptimized className="size-12 rounded object-contain" /> : <div className="flex size-12 shrink-0 items-center justify-center rounded bg-muted text-muted-foreground"><Building2 className="size-5" /></div>}<div className="min-w-0"><p className="truncate font-medium">{company.name}</p><p className="mt-1 text-sm text-muted-foreground">{members.length} de {company.userLimit} integrantes</p></div></div><div className="flex items-center gap-1"><Button variant="ghost" size="icon" onClick={() => startEditCompany(company)} aria-label={`Editar ${company.name}`}><Pencil className="size-4" /></Button><Button variant="outline" size="sm" className="gap-2" onClick={() => setExpandedCompanyId(expanded ? null : company.id)}>{expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}{expanded ? "Ocultar integrantes" : "Ver integrantes"}</Button></div></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary" style={{ width: `${company.userLimit ? Math.min(100, members.length / company.userLimit * 100) : 0}%` }} /></div>{expanded && <div className="mt-4 border-t pt-4"><div className="mb-3 flex items-center justify-between gap-2"><div><p className="font-medium">Integrantes</p><p className="text-sm text-muted-foreground">Personas con acceso a esta empresa.</p></div><Button size="sm" className="gap-2" onClick={() => startCreateUser(company.id)} disabled={full}><UserPlus className="size-4" />Agregar integrante</Button></div>{usersLoading ? <p className="py-4 text-sm text-muted-foreground">Cargando integrantes…</p> : members.length === 0 ? <p className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">Todavía no hay integrantes en esta empresa.</p> : <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left text-muted-foreground"><th className="px-2 py-2 font-medium">Nombre</th><th className="px-2 py-2 font-medium">Email</th><th className="px-2 py-2 font-medium">Estado</th><th className="px-2 py-2 text-right font-medium">Acciones</th></tr></thead><tbody>{members.map((user) => <tr key={user.id} className="border-b last:border-0"><td className="px-2 py-2 font-medium">{user.name}</td><td className="px-2 py-2 text-muted-foreground">{user.email}</td><td className="px-2 py-2"><button type="button" onClick={() => toggleUserActive(user.id)} className="inline-flex items-center gap-1.5 rounded-md border border-transparent px-2 py-1 text-sm transition-all hover:-translate-y-0.5 hover:border-border hover:bg-secondary hover:shadow-sm active:translate-y-0 active:shadow-none"><span className={`size-2 rounded-full ${user.active ? "bg-emerald-400" : "bg-zinc-500"}`} />{user.active ? "Activo" : "Inactivo"}</button></td><td className="px-2 py-2 text-right"><Button variant="ghost" size="sm" className="mr-1 gap-1" onClick={() => startEditUser(user)}><Pencil className="size-3.5" />Editar</Button><AlertDialog><AlertDialogTrigger render={<Button variant="ghost" size="sm" className="gap-1 text-destructive hover:text-destructive" />}><Trash2 className="size-3.5" />Eliminar</AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>¿Eliminar integrante?</AlertDialogTitle><AlertDialogDescription>Se eliminará permanentemente a {user.name} ({user.email}).</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => deleteUser(user.id)}>Eliminar</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></td></tr>)}</tbody></table></div>}</div>}</div> })}</div>}</CardContent>

    <Dialog open={companyDialogOpen} onOpenChange={setCompanyDialogOpen}><DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>{editingCompany ? "Editar empresa" : "Crear empresa"}</DialogTitle><DialogDescription>Configurá el nombre, la imagen y el cupo de integrantes.</DialogDescription></DialogHeader><form className="space-y-4" onSubmit={saveCompany}><div className="space-y-2"><Label htmlFor="company-name">Nombre</Label><Input id="company-name" value={name} onChange={(e) => setName(e.target.value)} required /></div><div className="space-y-2"><Label htmlFor="company-logo">Imagen de la empresa</Label><label htmlFor="company-logo" onDragOver={(e) => { e.preventDefault(); setDraggingLogo(true) }} onDragLeave={() => setDraggingLogo(false)} onDrop={handleLogoDrop} className={`flex min-h-36 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-4 text-center transition-colors ${draggingLogo ? "border-primary bg-primary/10" : "border-border bg-secondary/20 hover:border-primary/60 hover:bg-secondary/40"}`}><Input id="company-logo" type="file" accept="image/*" onChange={handleLogoChange} className="sr-only" /><ImagePlus className="size-8 text-primary" /><span className="text-sm font-medium text-foreground">Hacé click para seleccionar una imagen</span><span className="text-xs text-muted-foreground">o arrastrala y soltala aquí · PNG, JPG o WEBP</span>{logo && <Image src={logo} alt="Vista previa del logo" width={80} height={80} unoptimized className="mt-2 size-20 rounded border bg-background object-contain" />}</label>{!logo && <p className="text-xs text-muted-foreground">Todavía no hay una imagen cargada.</p>}</div><div className="space-y-2"><Label htmlFor="company-limit">Límite de integrantes</Label><Input id="company-limit" type="number" min="0" step="1" value={limit} onChange={(e) => setLimit(e.target.value)} required /></div>{error && <p className="text-sm text-destructive">{error}</p>}<DialogFooter><Button type="button" variant="outline" onClick={() => setCompanyDialogOpen(false)}>Cancelar</Button><Button type="submit" disabled={saving}>{saving && <Loader2 className="size-4 animate-spin" />}{editingCompany ? "Guardar cambios" : "Crear empresa"}</Button></DialogFooter></form></DialogContent></Dialog>

    <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}><DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>{editingUser ? "Editar integrante" : "Agregar integrante"}</DialogTitle><DialogDescription>{editingUser ? "Modificá los datos y la empresa del integrante." : "Creá un nuevo acceso dentro de una empresa."}</DialogDescription></DialogHeader><form className="space-y-4" onSubmit={saveUser}><div className="space-y-2"><Label htmlFor="member-name">Nombre y apellido</Label><Input id="member-name" value={userName} onChange={(e) => setUserName(e.target.value)} required /></div><div className="space-y-2"><Label htmlFor="member-email">Email</Label><Input id="member-email" type="email" value={userEmail} onChange={(e) => setUserEmail(e.target.value)} required /></div><div className="space-y-2"><Label htmlFor="member-phone">Teléfono</Label><Input id="member-phone" value={userPhone} onChange={(e) => setUserPhone(e.target.value)} required /></div><div className="space-y-2"><Label>Empresa</Label><Select value={userCompanyId} onValueChange={(value) => setUserCompanyId(value ?? "")}><SelectTrigger><SelectValue placeholder="Seleccioná una empresa" /></SelectTrigger><SelectContent>{companies.map((company) => { const count = users.filter((user) => user.companyId === company.id && user.id !== editingUser?.id).length; return <SelectItem key={company.id} value={company.id} disabled={count >= company.userLimit}>{company.name} ({count}/{company.userLimit})</SelectItem> })}</SelectContent></Select></div>{!editingUser && <><div className="space-y-2"><Label htmlFor="member-password">Contraseña inicial</Label><Input id="member-password" type="password" minLength={8} value={userPassword} onChange={(e) => setUserPassword(e.target.value)} required /></div><div className="space-y-2"><Label htmlFor="member-confirmation">Repetir contraseña</Label><Input id="member-confirmation" type="password" minLength={8} value={userConfirmation} onChange={(e) => setUserConfirmation(e.target.value)} required /></div></>}{error && <p className="text-sm text-destructive">{error}</p>}<DialogFooter><Button type="button" variant="outline" onClick={() => setUserDialogOpen(false)} disabled={saving}>Cancelar</Button><Button type="submit" disabled={saving}>{saving && <Loader2 className="size-4 animate-spin" />}{editingUser ? "Guardar cambios" : "Agregar integrante"}</Button></DialogFooter></form></DialogContent></Dialog>
  </Card>
}
