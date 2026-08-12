"use client"

import { useEffect, useState } from "react"
import { BellPlus, Megaphone, Pencil, Power, Trash2 } from "lucide-react"
import {
  createAnnouncementAction,
  deleteAnnouncementAction,
  fetchAllAnnouncementsAction,
  setAnnouncementActiveAction,
  updateAnnouncementAction,
} from "@/app/actions/announcements"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import type { Announcement, AnnouncementAudience, AnnouncementPriority } from "@/lib/types"

const AUDIENCE_LABELS: Record<AnnouncementAudience, string> = {
  personal: "Todo el personal",
  admin: "Administradores",
  colaborador: "Colaboradores",
  cliente_particular: "Clientes particulares",
  cliente_corporativo: "Clientes corporativos",
}

export function AnnouncementManagement() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [editing, setEditing] = useState<Announcement | null>(null)
  const [title, setTitle] = useState("")
  const [message, setMessage] = useState("")
  const [audience, setAudience] = useState<AnnouncementAudience>("personal")
  const [priority, setPriority] = useState<AnnouncementPriority>("normal")
  const [expiresAt, setExpiresAt] = useState("")
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function loadAnnouncements() {
    setLoading(true)
    try {
      setAnnouncements(await fetchAllAnnouncementsAction())
    } catch {
      setError("No se pudieron cargar los avisos.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadAnnouncements()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [])

  function resetForm() {
    setEditing(null)
    setTitle("")
    setMessage("")
    setAudience("personal")
    setPriority("normal")
    setExpiresAt("")
    setError(null)
  }

  function startEditing(item: Announcement) {
    setEditing(item)
    setTitle(item.title)
    setMessage(item.message)
    setAudience(item.audience)
    setPriority(item.priority)
    setExpiresAt(item.expiresAt ? item.expiresAt.slice(0, 16) : "")
    setError(null)
  }

  async function saveAnnouncement(event: React.FormEvent) {
    event.preventDefault()
    if (saving) return
    setSaving(true)
    setError(null)
    const input = { title, message, audience, priority, expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null }
    const result = editing
      ? await updateAnnouncementAction(editing.id, input)
      : await createAnnouncementAction(input)

    if (!result.success) {
      setError(result.error ?? "No se pudo guardar el aviso.")
    } else {
      resetForm()
      await loadAnnouncements()
    }
    setSaving(false)
  }

  async function toggleActive(item: Announcement) {
    const ok = await setAnnouncementActiveAction(item.id, !item.active)
    if (ok) setAnnouncements((items) => items.map((current) => current.id === item.id ? { ...current, active: !current.active } : current))
  }

  async function remove(item: Announcement) {
    if (!window.confirm(`¿Eliminar el aviso "${item.title}"?`)) return
    const ok = await deleteAnnouncementAction(item.id)
    if (ok) setAnnouncements((items) => items.filter((current) => current.id !== item.id))
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Megaphone className="size-5 text-primary" />
          Gestión de avisos
        </CardTitle>
        <p className="text-sm text-muted-foreground">Publicá comunicaciones segmentadas para el personal y los clientes.</p>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={saveAnnouncement} className="grid gap-4 rounded-xl border border-border bg-secondary/20 p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">{editing ? "Editar aviso" : "Nuevo aviso"}</h2>
            {editing && <Button type="button" variant="ghost" size="sm" onClick={resetForm}>Cancelar edición</Button>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="announcement-title">Título</Label>
            <Input id="announcement-title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ej: Mantenimiento programado" maxLength={255} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="announcement-message">Mensaje</Label>
            <Textarea id="announcement-message" value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Escribí la comunicación..." rows={4} required />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Destinatarios</Label>
              <Select value={audience} onValueChange={(value) => setAudience(value as AnnouncementAudience)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(AUDIENCE_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Prioridad</Label>
              <Select value={priority} onValueChange={(value) => setPriority(value as AnnouncementPriority)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="importante">Importante</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="announcement-expires">Vencimiento (opcional)</Label>
              <Input id="announcement-expires" type="datetime-local" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} />
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end">
            <Button type="submit" disabled={saving} className="gap-2"><BellPlus className="size-4" />{saving ? "Guardando..." : editing ? "Guardar cambios" : "Publicar aviso"}</Button>
          </div>
        </form>

        {loading ? <p className="py-8 text-center text-sm text-muted-foreground">Cargando avisos…</p> : announcements.length === 0 ? <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">Todavía no hay avisos publicados.</p> : (
          <div className="space-y-3">
            {announcements.map((item) => (
              <article key={item.id} className="rounded-xl border border-border p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">{item.title}</h3><Badge variant="outline">{AUDIENCE_LABELS[item.audience]}</Badge><Badge variant="outline" className={item.priority === "importante" ? "border-amber-500/40 text-amber-500" : ""}>{item.priority === "importante" ? "Importante" : "Normal"}</Badge><Badge variant="outline" className={item.active ? "border-emerald-500/40 text-emerald-500" : ""}>{item.active ? "Activo" : "Inactivo"}</Badge></div>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{item.message}</p>
                    <p className="mt-2 text-xs text-muted-foreground">Publicado el {new Intl.DateTimeFormat("es-AR", { dateStyle: "medium" }).format(new Date(item.createdAt))}{item.expiresAt ? ` · Vence el ${new Intl.DateTimeFormat("es-AR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(item.expiresAt))}` : ""}</p>
                  </div>
                  <div className="flex shrink-0 gap-1"><Button type="button" variant="ghost" size="icon-sm" onClick={() => startEditing(item)} aria-label="Editar aviso"><Pencil className="size-4" /></Button><Button type="button" variant="ghost" size="icon-sm" onClick={() => toggleActive(item)} aria-label={item.active ? "Desactivar aviso" : "Activar aviso"}><Power className="size-4" /></Button><Button type="button" variant="ghost" size="icon-sm" className="text-destructive hover:text-destructive" onClick={() => remove(item)} aria-label="Eliminar aviso"><Trash2 className="size-4" /></Button></div>
                </div>
              </article>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}


