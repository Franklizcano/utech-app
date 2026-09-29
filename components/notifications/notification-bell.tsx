"use client"

import { useCallback, useEffect, useState } from "react"
import { Bell, CheckCheck, ExternalLink, Loader2 } from "lucide-react"
import { fetchNotificationsAction, fetchUnreadNotificationsCountAction, markNotificationReadAction } from "@/app/actions/notifications"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { AppNotification } from "@/lib/types"
import { cn } from "@/lib/utils"

function formatNotificationDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
}

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)

  const refreshCount = useCallback(async () => {
    setUnreadCount(await fetchUnreadNotificationsCountAction())
  }, [])

  const loadNotifications = useCallback(async () => {
    setLoading(true)
    try {
      const [items, count] = await Promise.all([fetchNotificationsAction(), fetchUnreadNotificationsCountAction()])
      setNotifications(items)
      setUnreadCount(count)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void refreshCount(), 0)
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") void refreshCount()
    }
    document.addEventListener("visibilitychange", handleVisibilityChange)
    return () => {
      window.clearTimeout(initialLoad)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [refreshCount])

  useEffect(() => {
    const handlePreferencesUpdate = () => {
      if (open) void loadNotifications()
      else void refreshCount()
    }
    window.addEventListener("utech:notification-preferences-updated", handlePreferencesUpdate)
    return () => window.removeEventListener("utech:notification-preferences-updated", handlePreferencesUpdate)
  }, [loadNotifications, open, refreshCount])

  async function handleNotificationClick(notification: AppNotification) {
    if (!notification.read) {
      const marked = await markNotificationReadAction(notification.id)
      if (marked) {
        setUnreadCount((current) => Math.max(0, current - 1))
        setNotifications((current) => current.map((item) => item.id === notification.id ? { ...item, read: true, readAt: new Date().toISOString() } : item))
      }
    }

    if (notification.orderId) {
      window.dispatchEvent(new CustomEvent("utech:select-order", { detail: { orderId: notification.orderId } }))
      setOpen(false)
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="relative rounded-xl"
        aria-label={unreadCount > 0 ? `Notificaciones: ${unreadCount} sin leer` : "Notificaciones"}
        onClick={() => { setOpen(true); void loadNotifications() }}
      >
        <Bell className="size-4" />
        {unreadCount > 0 && <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-primary px-1 text-center text-[10px] font-semibold leading-4 text-primary-foreground">{unreadCount > 99 ? "99+" : unreadCount}</span>}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[min(680px,85vh)] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Notificaciones</DialogTitle>
            <DialogDescription>Actualizaciones importantes de tus órdenes y tareas.</DialogDescription>
          </DialogHeader>
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" />Cargando notificaciones…</div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-10 text-center text-sm text-muted-foreground"><CheckCheck className="size-6" />No tenés notificaciones nuevas.</div>
          ) : (
            <div className="space-y-2">
              {notifications.map((notification) => (
                <button
                  key={notification.id}
                  type="button"
                  className={cn("flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-secondary/60", notification.read ? "border-border bg-card" : "border-primary/30 bg-primary/5")}
                  onClick={() => void handleNotificationClick(notification)}
                >
                  <span className={cn("mt-1 size-2 shrink-0 rounded-full", notification.read ? "bg-muted-foreground/30" : notification.priority === "important" ? "bg-destructive" : "bg-primary")} aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="font-medium text-foreground">{notification.title ?? "Actualización de orden"}</span>
                      {notification.orderId && <ExternalLink className="size-3.5 shrink-0 text-muted-foreground" />}
                    </span>
                    <span className="mt-1 block text-sm text-muted-foreground">{notification.message}</span>
                    <span className="mt-1 block text-xs text-muted-foreground">{formatNotificationDate(notification.date)}</span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
