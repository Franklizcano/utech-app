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
import { cn } from "@/lib/utils"
import { invalidateAnnouncementsCache, loadCachedAnnouncements } from "@/lib/announcements-cache"
import { useStore } from "@/lib/store"

const ANNOUNCEMENT_STYLES = {
  importante: {
    card: "border-amber-500/50 bg-amber-500/10 hover:border-amber-400/80 hover:bg-amber-500/15 hover:shadow-md hover:shadow-amber-950/10",
    icon: "text-amber-500",
  },
  normal: {
    card: "border-border bg-secondary/30 hover:border-primary/35 hover:bg-secondary/50 hover:shadow-md hover:shadow-black/10",
    icon: "text-primary",
  },
} as const

export function AnnouncementInbox() {
  const { currentUser } = useStore()
  const currentUserId = currentUser?.id
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [open, setOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    if (!currentUserId) return

    loadCachedAnnouncements(currentUserId, fetchAnnouncementsAction)
      .then((items) => {
        if (cancelled) return
        setAnnouncements(items)
        setOpen(items.some((item) => !item.read))
      })
      .catch((error: unknown) => console.error("No se pudieron cargar los avisos:", error))

    return () => {
      cancelled = true
    }
  }, [currentUserId])

  const unreadAnnouncements = announcements.filter((item) => !item.read)

  async function markAsRead(id: string) {
    const ok = await markAnnouncementReadAction(id)
    if (!ok) return
    if (currentUser) invalidateAnnouncementsCache(currentUser.id)
    setAnnouncements((items) => items.map((item) => (item.id === id ? { ...item, read: true } : item)))
    if (unreadAnnouncements.length <= 1) setOpen(false)
  }

  if (unreadAnnouncements.length === 0) return null

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[min(680px,calc(100vh-2rem))] overflow-y-auto p-4 sm:max-w-lg sm:p-5">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="size-5 text-primary" />
            Comunicaciones
          </DialogTitle>
          <DialogDescription>
            Tenés {unreadAnnouncements.length === 1 ? "un aviso pendiente" : `${unreadAnnouncements.length} avisos pendientes`} para revisar.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {unreadAnnouncements.map((announcement) => (
            <article
              key={announcement.id}
              className={cn("rounded-xl border p-4 transition-[background-color,border-color,box-shadow] duration-200", ANNOUNCEMENT_STYLES[announcement.priority].card)}
            >
              <div className="flex items-start gap-3">
                {announcement.priority === "importante" ? (
                  <TriangleAlert className={cn("mt-0.5 size-5 shrink-0", ANNOUNCEMENT_STYLES.importante.icon)} />
                ) : (
                  <Megaphone className={cn("mt-0.5 size-5 shrink-0", ANNOUNCEMENT_STYLES.normal.icon)} />
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
                <Button type="button" size="sm" variant="outline" className="gap-1.5 border-primary/35 bg-background/80 text-foreground shadow-sm hover:border-primary hover:bg-primary/10 hover:text-primary" onClick={() => markAsRead(announcement.id)}>
                  <Check className="size-3.5" />
                  Marcar como leído
                </Button>
              </div>
            </article>
          ))}
        </div>
        <DialogFooter className="-mx-4 -mb-4 sm:-mx-5 sm:-mb-5">
          <Button type="button" variant="ghost" className="text-foreground hover:bg-primary/10 hover:text-primary" onClick={() => setOpen(false)}>
            Revisar más tarde
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

