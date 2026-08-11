"use client"

import { useEffect, useMemo, useState } from "react"
import { Building2, ImagePlus, Loader2, Pencil, Plus, Search } from "lucide-react"
import { createCompanyAction, fetchCompaniesAction, updateCompanyAction } from "@/app/actions/companies"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Image from "next/image"
import type { Company } from "@/lib/types"

export function CompanyManagement() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Company | null>(null)
  const [name, setName] = useState("")
  const [limit, setLimit] = useState("1")
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [logo, setLogo] = useState("")
  const [search, setSearch] = useState("")
  const [draggingLogo, setDraggingLogo] = useState(false)

  const load = () => fetchCompaniesAction().then(setCompanies).catch(() => setError("No se pudieron cargar las empresas.")).finally(() => setLoading(false))
  useEffect(() => { load() }, [])
  function startCreate() { setEditing(null); setName(""); setLimit("1"); setLogo(""); setError(null); setOpen(true) }
  function startEdit(company: Company) { setEditing(company); setName(company.name); setLimit(String(company.userLimit)); setLogo(company.logo ?? ""); setError(null); setOpen(true) }
  function processLogoFile(file: File | undefined) {
    if (!file) return
    if (!file.type.startsWith("image/")) { setError("Seleccioná un archivo de imagen."); return }
    const reader = new FileReader()
    reader.onload = () => setLogo(typeof reader.result === "string" ? reader.result : "")
    reader.readAsDataURL(file)
  }
  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    processLogoFile(e.target.files?.[0])
  }
  function handleLogoDrop(e: React.DragEvent<HTMLLabelElement>) {
    e.preventDefault()
    setDraggingLogo(false)
    processLogoFile(e.dataTransfer.files?.[0])
  }
  async function save(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError(null)
    const input = { name, userLimit: Number(limit), logo: logo || undefined }
    const result = editing ? await updateCompanyAction(editing.id, input) : await createCompanyAction(input)
    if (!result.success) { setError(result.error ?? "No se pudo guardar la empresa."); setSaving(false); return }
    await load(); setOpen(false); setSaving(false)
  }
  const filteredCompanies = useMemo(() => {
    const query = search.trim().toLocaleLowerCase()
    if (!query) return companies
    return companies.filter((company) => company.name.toLocaleLowerCase().includes(query))
  }, [companies, search])

  return <Card>
    <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div><CardTitle className="flex items-center gap-2"><Building2 className="size-5 text-primary" />Empresas</CardTitle><p className="mt-1 text-sm text-muted-foreground">Definí las empresas, su imagen y el cupo de usuarios corporativos.</p></div>
      <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row"><div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar empresa..." aria-label="Buscar empresa" className="pl-9 sm:w-56" /></div><Button onClick={startCreate} className="gap-2"><Plus className="size-4" />Crear empresa</Button></div>
    </CardHeader>
    <CardContent>{loading ? <p className="py-8 text-center text-sm text-muted-foreground">Cargando empresas…</p> : filteredCompanies.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">{search.trim() ? "No se encontraron empresas con esa búsqueda." : "Todavía no hay empresas creadas."}</p> : <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{filteredCompanies.map((company) => <div key={company.id} className="rounded-lg border p-4"><div className="flex items-start justify-between gap-2"><div className="flex min-w-0 items-center gap-3">{company.logo ? <Image src={company.logo} alt={`Logo de ${company.name}`} width={48} height={48} unoptimized className="size-12 rounded object-contain" /> : <div className="flex size-12 shrink-0 items-center justify-center rounded bg-muted text-muted-foreground"><Building2 className="size-5" /></div>}<div className="min-w-0"><p className="truncate font-medium">{company.name}</p><p className="mt-1 text-sm text-muted-foreground">{company.userCount} de {company.userLimit} usuarios</p></div></div><Button variant="ghost" size="icon" onClick={() => startEdit(company)} aria-label={`Editar ${company.name}`}><Pencil className="size-4" /></Button></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary" style={{ width: `${company.userLimit ? Math.min(100, company.userCount / company.userLimit * 100) : 0}%` }} /></div></div>)}</div>}</CardContent>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>{editing ? "Editar empresa" : "Crear empresa"}</DialogTitle><DialogDescription>Configurá el nombre, la imagen y el cupo de usuarios corporativos.</DialogDescription></DialogHeader><form className="space-y-4" onSubmit={save}><div className="space-y-2"><Label htmlFor="company-name">Nombre</Label><Input id="company-name" value={name} onChange={(e) => setName(e.target.value)} required /></div><div className="space-y-2"><Label htmlFor="company-logo">Imagen de la empresa</Label><label htmlFor="company-logo" onDragOver={(e) => { e.preventDefault(); setDraggingLogo(true) }} onDragLeave={() => setDraggingLogo(false)} onDrop={handleLogoDrop} className={`flex min-h-36 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-4 text-center transition-colors ${draggingLogo ? "border-primary bg-primary/10" : "border-border bg-secondary/20 hover:border-primary/60 hover:bg-secondary/40"}`}><Input id="company-logo" type="file" accept="image/*" onChange={handleLogoChange} className="sr-only" /><ImagePlus className="size-8 text-primary" /><span className="text-sm font-medium text-foreground">Hacé click para seleccionar una imagen</span><span className="text-xs text-muted-foreground">o arrastrala y soltala aquí · PNG, JPG o WEBP</span>{logo && <Image src={logo} alt="Vista previa del logo" width={80} height={80} unoptimized className="mt-2 size-20 rounded border bg-background object-contain" />}</label>{!logo && <p className="text-xs text-muted-foreground">Todavía no hay una imagen cargada.</p>}</div><div className="space-y-2"><Label htmlFor="company-limit">Límite de usuarios corporativos</Label><Input id="company-limit" type="number" min="0" step="1" value={limit} onChange={(e) => setLimit(e.target.value)} required /></div>{error && <p className="text-sm text-destructive">{error}</p>}<DialogFooter><Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button type="submit" disabled={saving}>{saving && <Loader2 className="size-4 animate-spin" />}{editing ? "Guardar cambios" : "Crear empresa"}</Button></DialogFooter></form></DialogContent></Dialog>
  </Card>
}
