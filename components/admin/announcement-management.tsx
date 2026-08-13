"use client"

import { useEffect, useState } from "react"
import { AlertCircle, BellPlus, Loader2, Megaphone, Pencil, Plus, Power, Trash2 } from "lucide-react"
import {
  createAnnouncementAction,
  deleteAnnouncementAction,
  fetchAllAnnouncementsAction,
  setAnnouncementActiveAction,
  updateAnnouncementAction,
} from "@/app/actions/announcements"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { Announcement, AnnouncementAudience, AnnouncementPriority } from "@/lib/types"

const AUDIENCE_LABELS: Record<AnnouncementAudience, string> = {
  personal: "Todo el personal",
  admin: "Administradores",
  colaborador: "Colaboradores",
  cliente_particular: "Clientes particulares",
  cliente_corporativo: "Clientes corporativos",
}

function toLocalDateTimeInput(value: string | null) {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""

  const pad = (part: number) => String(part).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function localDateTimeToIso(value: string) {
  const [datePart, timePart] = value.split("T")
  const [year, month, day] = datePart.split("-").map(Number)
  const [hours, minutes] = timePart.split(":").map(Number)
  return new Date(year, month - 1, day, hours, minutes).toISOString()
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
  const [deleteTarget, setDeleteTarget] = useState<Announcement | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

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
    setDialogOpen(false)
  }

  function startCreating() {
    resetForm()
    setDialogOpen(true)
  }

  function startEditing(item: Announcement) {
    setEditing(item)
    setTitle(item.title)
    setMessage(item.message)
    setAudience(item.audience)
    setPriority(item.priority)
    setExpiresAt(toLocalDateTimeInput(item.expiresAt))
    setError(null)
    setDialogOpen(true)
  }

  async function saveAnnouncement(event: React.FormEvent) {
    event.preventDefault()
    if (saving) return
    setSaving(true)
    setError(null)
    const input = { title, message, audience, priority, expiresAt: expiresAt ? localDateTimeToIso(expiresAt) : null }
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
    const ok = await deleteAnnouncementAction(item.id)
    if (ok) {
      setAnnouncements((items) => items.filter((current) => current.id !== item.id))
      setDeleteTarget(null)
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Megaphone className="size-5 text-primary" />
            Gestión de avisos
          </CardTitle>
          <CardDescription className="mt-1">Publicá comunicaciones segmentadas para el personal y los clientes.</CardDescription>
        </div>
        <Button type="button" className="w-full gap-2 sm:w-auto" onClick={startCreating}>
          <Plus className="size-4" />
          Nuevo aviso
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {loading ? <div className="rounded-lg border border-dashed border-border bg-secondary/30 p-8 text-center text-sm text-foreground/75">Cargando avisos…</div> : announcements.length === 0 ? <div className="rounded-lg border border-dashed border-border bg-secondary/30 p-8 text-center text-sm text-foreground/75">Todavía no hay avisos publicados.</div> : (
          <div className="space-y-4">
            {announcements.map((item) => (
              <article key={item.id} className="rounded-xl border border-border bg-card p-4 transition-[background-color,border-color,box-shadow] duration-200 hover:border-primary/40 hover:bg-secondary/35 hover:shadow-md hover:shadow-black/10 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2"><h3 className="mr-1 w-full font-semibold sm:w-auto">{item.title}</h3><Badge variant="outline">{AUDIENCE_LABELS[item.audience]}</Badge><Badge variant="outline" className={item.priority === "importante" ? "border-amber-500/40 text-amber-500" : ""}>{item.priority === "importante" ? "Importante" : "Normal"}</Badge><Badge variant="outline" className={item.active ? "border-emerald-500/40 text-emerald-500" : ""}>{item.active ? "Activo" : "Inactivo"}</Badge></div>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{item.message}</p>
                    <p className="mt-2 text-xs text-muted-foreground">Publicado el {new Intl.DateTimeFormat("es-AR", { dateStyle: "medium" }).format(new Date(item.createdAt))}{item.expiresAt ? ` · Vence el ${new Intl.DateTimeFormat("es-AR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(item.expiresAt))}` : ""}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1 rounded-lg border border-border/80 bg-muted/30 p-1 shadow-sm">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8 rounded-md border border-transparent text-foreground hover:border-primary/30 hover:bg-primary/10 hover:text-primary hover:shadow-sm"
                      onClick={() => startEditing(item)}
                      aria-label="Editar aviso"
                      title="Editar aviso"
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className={`size-8 rounded-md border border-transparent hover:shadow-sm ${item.active ? "text-emerald-600 hover:border-emerald-500/30 hover:bg-emerald-500/10 hover:text-emerald-500" : "text-foreground hover:border-primary/30 hover:bg-primary/10 hover:text-primary"}`}
                      onClick={() => toggleActive(item)}
                      aria-label={item.active ? "Desactivar aviso" : "Activar aviso"}
                      title={item.active ? "Desactivar aviso" : "Activar aviso"}
                    >
                      <Power className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8 rounded-md border border-transparent text-destructive/80 hover:border-destructive/30 hover:bg-destructive/10 hover:text-destructive hover:shadow-sm"
                      onClick={() => setDeleteTarget(item)}
                      aria-label="Eliminar aviso"
                      title="Eliminar aviso"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </CardContent>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar aviso" : "Nuevo aviso"}</DialogTitle>
            <DialogDescription>
              {editing ? "Actualizá la comunicación y sus destinatarios." : "Creá una comunicación para una audiencia específica."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={saveAnnouncement} className="grid gap-5">
            <div className="space-y-2">
              <Label htmlFor="announcement-title">Título</Label>
              <Input id="announcement-title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ej: Mantenimiento programado" maxLength={255} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="announcement-message">Mensaje</Label>
              <Textarea id="announcement-message" value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Escribí la comunicación..." rows={5} required />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="announcement-audience">Destinatarios</Label>
                <Select value={audience} onValueChange={(value) => setAudience(value as AnnouncementAudience)}>
                  <SelectTrigger id="announcement-audience"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(AUDIENCE_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="announcement-priority">Prioridad</Label>
                <Select value={priority} onValueChange={(value) => setPriority(value as AnnouncementPriority)}>
                  <SelectTrigger id="announcement-priority"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="importante">Importante</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="announcement-expires">Vencimiento (opcional)</Label>
              <Input id="announcement-expires" type="datetime-local" autoComplete="off" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} />
              <p className="text-xs text-muted-foreground">La hora se guarda y se muestra en tu zona horaria local.</p>
            </div>
            {error && <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"><AlertCircle className="mt-0.5 size-4 shrink-0" /><span>{error}</span></div>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Cancelar</Button>
              <Button type="submit" disabled={saving} className="gap-2">{saving ? <Loader2 className="size-4 animate-spin" /> : <BellPlus className="size-4" />}{saving ? "Guardando..." : editing ? "Guardar cambios" : "Publicar aviso"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar aviso?</AlertDialogTitle>
            <AlertDialogDescription>Esta acción no se puede deshacer. Se eliminará el aviso <strong>{deleteTarget?.title}</strong>.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => deleteTarget && void remove(deleteTarget)}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}


