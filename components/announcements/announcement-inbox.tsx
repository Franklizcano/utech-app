"use client"

import { useEffect, useState } from "react"
import { Bell, Check, Megaphone, TriangleAlert } from "lucide-react"
import { fetchAnnouncementsAction, markAnnouncementReadAction } from "@/app/actions/announcements"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { Announcement } from "@/lib/types"

export function AnnouncementInbox() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [open, setOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetchAnnouncementsAction()
      .then((items) => {
        if (cancelled) return
        setAnnouncements(items)
        setOpen(items.some((item) => !item.read))
      })
      .catch((error: unknown) => console.error("No se pudieron cargar los avisos:", error))

    return () => {
      cancelled = true
    }
  }, [])

  const unreadAnnouncements = announcements.filter((item) => !item.read)

  async function markAsRead(id: string) {
    const ok = await markAnnouncementReadAction(id)
    if (!ok) return
    setAnnouncements((items) => items.map((item) => (item.id === id ? { ...item, read: true } : item)))
    if (unreadAnnouncements.length <= 1) setOpen(false)
  }

  if (unreadAnnouncements.length === 0) return null

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[min(680px,calc(100vh-2rem))] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="size-5 text-primary" />
            Avisos importantes
          </DialogTitle>
          <DialogDescription>
            Revisá las comunicaciones del equipo antes de continuar.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {unreadAnnouncements.map((announcement) => (
            <article
              key={announcement.id}
              className={`rounded-xl border p-4 ${announcement.priority === "importante" ? "border-amber-500/40 bg-amber-500/10" : "border-border bg-secondary/20"}`}
            >
              <div className="flex items-start gap-3">
                {announcement.priority === "importante" ? (
                  <TriangleAlert className="mt-0.5 size-5 shrink-0 text-amber-500" />
                ) : (
                  <Megaphone className="mt-0.5 size-5 shrink-0 text-primary" />
                )}
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-foreground">{announcement.title}</h3>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{announcement.message}</p>
                  <p className="mt-3 text-xs text-muted-foreground">
                    {new Intl.DateTimeFormat("es-AR", { dateStyle: "medium" }).format(new Date(announcement.createdAt))}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex justify-end">
                <Button type="button" size="sm" variant="outline" className="gap-1.5" onClick={() => markAsRead(announcement.id)}>
                  <Check className="size-3.5" />
                  Marcar como leído
                </Button>
              </div>
            </article>
          ))}
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
            Revisar más tarde
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

