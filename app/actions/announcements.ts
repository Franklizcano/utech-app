"use server"

import { getSessionAction } from "@/app/actions/auth"
import { getSupabaseServerClient } from "@/lib/supabase"
import type { Announcement, AnnouncementAudience, AnnouncementPriority, Role } from "@/lib/types"

type AnnouncementInput = {
  title: string
  message: string
  audience: AnnouncementAudience
  priority: AnnouncementPriority
  expiresAt: string | null
}

function rowToAnnouncement(row: Record<string, unknown>, read = false): Announcement {
  return {
    id: row.id as string,
    title: row.title as string,
    message: row.message as string,
    audience: row.audience as AnnouncementAudience,
    priority: row.priority as AnnouncementPriority,
    active: row.active as boolean,
    expiresAt: (row.expires_at as string | null) ?? null,
    createdAt: row.created_at as string,
    read,
  }
}

function matchesAudience(audience: AnnouncementAudience, role: Role, companyId?: string) {
  if (audience === "personal") return role === "admin" || role === "colaborador"
  if (audience === "admin") return role === "admin"
  if (audience === "colaborador") return role === "colaborador"
  if (audience === "cliente_corporativo") return role === "cliente" && Boolean(companyId)
  return role === "cliente" && !companyId
}

export async function fetchAnnouncementsAction(): Promise<Announcement[]> {
  const session = await getSessionAction()
  if (!session || !session.active) return []

  const supabase = getSupabaseServerClient()
  const [{ data, error }, { data: reads, error: readsError }] = await Promise.all([
    supabase
      .from("general_announcements")
      .select("id, title, message, audience, priority, active, expires_at, created_at")
      .eq("active", true)
      .order("created_at", { ascending: false }),
    supabase
      .from("general_announcement_reads")
      .select("announcement_id")
      .eq("user_id", session.id),
  ])

  if (error) throw new Error("No se pudieron cargar los avisos.")
  if (readsError) throw new Error("No se pudieron cargar las lecturas de avisos.")

  const readIds = new Set((reads ?? []).map((row) => row.announcement_id as string))
  const now = Date.now()
  return (data ?? [])
    .filter((row) => matchesAudience(row.audience as AnnouncementAudience, session.role, session.companyId))
    .filter((row) => !row.expires_at || new Date(row.expires_at as string).getTime() > now)
    .map((row) => rowToAnnouncement(row as Record<string, unknown>, readIds.has(row.id as string)))
}

export async function createAnnouncementAction(input: AnnouncementInput): Promise<{ success: boolean; announcement?: Announcement; error?: string }> {
  const session = await getSessionAction()
  if (session?.role !== "admin") return { success: false, error: "No tenés permisos para crear avisos." }

  const title = input.title.trim()
  const message = input.message.trim()
  if (!title || !message) return { success: false, error: "El título y el mensaje son requeridos." }

  const supabase = getSupabaseServerClient()
  const { data, error } = await supabase
    .from("general_announcements")
    .insert({
      title,
      message,
      audience: input.audience,
      priority: input.priority,
      expires_at: input.expiresAt || null,
      active: true,
    })
    .select("id, title, message, audience, priority, active, expires_at, created_at")
    .single()

  if (error || !data) return { success: false, error: "No se pudo crear el aviso." }
  return { success: true, announcement: rowToAnnouncement(data as Record<string, unknown>) }
}

export async function fetchAllAnnouncementsAction(): Promise<Announcement[]> {
  const session = await getSessionAction()
  if (session?.role !== "admin") return []

  const supabase = getSupabaseServerClient()
  const { data, error } = await supabase
    .from("general_announcements")
    .select("id, title, message, audience, priority, active, expires_at, created_at")
    .order("created_at", { ascending: false })

  if (error) throw new Error("No se pudieron cargar los avisos.")
  return (data ?? []).map((row) => rowToAnnouncement(row as Record<string, unknown>))
}

export async function updateAnnouncementAction(id: string, input: AnnouncementInput): Promise<{ success: boolean; error?: string }> {
  const session = await getSessionAction()
  if (session?.role !== "admin") return { success: false, error: "No tenés permisos para editar avisos." }

  const title = input.title.trim()
  const message = input.message.trim()
  if (!title || !message) return { success: false, error: "El título y el mensaje son requeridos." }

  const supabase = getSupabaseServerClient()
  const { error } = await supabase
    .from("general_announcements")
    .update({
      title,
      message,
      audience: input.audience,
      priority: input.priority,
      expires_at: input.expiresAt || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)

  return error ? { success: false, error: "No se pudo actualizar el aviso." } : { success: true }
}

export async function setAnnouncementActiveAction(id: string, active: boolean): Promise<boolean> {
  const session = await getSessionAction()
  if (session?.role !== "admin") return false

  const supabase = getSupabaseServerClient()
  const { error } = await supabase
    .from("general_announcements")
    .update({ active, updated_at: new Date().toISOString() })
    .eq("id", id)
  return !error
}

export async function deleteAnnouncementAction(id: string): Promise<boolean> {
  const session = await getSessionAction()
  if (session?.role !== "admin") return false

  const supabase = getSupabaseServerClient()
  const { error } = await supabase.from("general_announcements").delete().eq("id", id)
  return !error
}

export async function markAnnouncementReadAction(id: string): Promise<boolean> {
  const session = await getSessionAction()
  if (!session?.id) return false

  const supabase = getSupabaseServerClient()
  const { error } = await supabase.from("general_announcement_reads").upsert({
    announcement_id: id,
    user_id: session.id,
    read_at: new Date().toISOString(),
  })
  return !error
}


