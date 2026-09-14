"use server"

import bcrypt from "bcryptjs"
import { randomBytes } from "node:crypto"
import { getSessionAction } from "@/app/actions/auth"
import { getSupabaseServerClient } from "@/lib/supabase"
import type { CompanyRole, Role, User } from "@/lib/types"

type CompanyUserInput = { name: string; email: string; phone: string; password?: string }

function isCompanyManager(session: Awaited<ReturnType<typeof getSessionAction>>): session is NonNullable<Awaited<ReturnType<typeof getSessionAction>>> {
  return Boolean(session?.active && session.role === "cliente" && session.companyId && session.companyRole === "manager")
}

function normalizeInput(input: CompanyUserInput) {
  const name = typeof input?.name === "string" ? input.name.trim() : ""
  const email = typeof input?.email === "string" ? input.email.trim().toLowerCase() : ""
  const phone = typeof input?.phone === "string" ? input.phone.trim() : ""
  if (!name || !email || !phone) return null
  return { name, email, phone }
}

function rowToUser(row: Record<string, unknown>): User {
  const company = Array.isArray(row.company) ? row.company[0] : row.company as { name?: string; logo?: string | null } | undefined
  return {
    id: row.id as string,
    name: row.name as string,
    email: row.email as string,
    phone: row.phone as string,
    role: row.role as Role,
    active: row.active as boolean,
    companyId: row.company_id as string | undefined,
    companyRole: row.company_role as CompanyRole,
    company: company?.name ? { name: company.name, logo: company.logo ?? undefined } : undefined,
    referralCode: row.referral_code as string,
    referredBy: row.referred_by as string | undefined,
    createdAt: row.created_at as string,
  }
}

const userSelect = "id, name, email, phone, role, active, company_id, company_role, referral_code, referred_by, created_at, company:companies(name, logo)"

export async function fetchCompanyUsersAction(): Promise<User[]> {
  const session = await getSessionAction()
  if (!isCompanyManager(session)) return []
  const supabase = getSupabaseServerClient()
  const { data, error } = await supabase.from("users").select(userSelect).eq("company_id", session.companyId).eq("role", "cliente").order("name")
  if (error) throw new Error("No se pudieron cargar los integrantes de la empresa.")
  return (data ?? []).map((row) => rowToUser(row as Record<string, unknown>))
}

export async function createCompanyUserAction(input: CompanyUserInput): Promise<{ success: boolean; user?: User; error?: string }> {
  const session = await getSessionAction()
  if (!isCompanyManager(session)) return { success: false, error: "No tenés permisos para gestionar integrantes." }
  const normalized = normalizeInput(input)
  if (!normalized) return { success: false, error: "Completá nombre, email y teléfono." }
  if (typeof input.password !== "string" || input.password.length < 8) return { success: false, error: "La contraseña debe tener al menos 8 caracteres." }

  const supabase = getSupabaseServerClient()
  const [{ data: company, error: companyError }, { count, error: countError }] = await Promise.all([
    supabase.from("companies").select("id, user_limit").eq("id", session.companyId).maybeSingle(),
    supabase.from("users").select("id", { count: "exact", head: true }).eq("company_id", session.companyId),
  ])
  if (companyError || !company) return { success: false, error: "La empresa ya no está disponible." }
  if (countError) return { success: false, error: "No se pudo verificar el cupo de la empresa." }
  if ((count ?? 0) >= company.user_limit) return { success: false, error: "La empresa alcanzó su cupo de integrantes." }

  const { data, error } = await supabase.from("users").insert({
    ...normalized,
    role: "cliente",
    active: true,
    password_hash: await bcrypt.hash(input.password, 10),
    company_id: session.companyId,
    company_role: "member",
    referral_code: randomBytes(6).toString("hex").toUpperCase(),
  }).select(userSelect).single()
  if (error || !data) return { success: false, error: error?.code === "23505" ? "Ya existe un usuario con ese email." : "No se pudo crear el integrante." }
  return { success: true, user: rowToUser(data as Record<string, unknown>) }
}

export async function updateCompanyUserAction(id: string, input: CompanyUserInput): Promise<{ success: boolean; user?: User; error?: string }> {
  const session = await getSessionAction()
  if (!isCompanyManager(session) || !id) return { success: false, error: "No tenés permisos para gestionar integrantes." }
  const normalized = normalizeInput(input)
  if (!normalized) return { success: false, error: "Completá nombre, email y teléfono." }
  const supabase = getSupabaseServerClient()
  const { data, error } = await supabase.from("users").update({ ...normalized, updated_at: new Date().toISOString() }).eq("id", id).eq("company_id", session.companyId).eq("role", "cliente").select(userSelect).maybeSingle()
  if (error || !data) return { success: false, error: error?.code === "23505" ? "Ya existe un usuario con ese email." : "No se pudo actualizar el integrante." }
  return { success: true, user: rowToUser(data as Record<string, unknown>) }
}

export async function removeCompanyUserAction(id: string): Promise<{ success: boolean; error?: string }> {
  const session = await getSessionAction()
  if (!isCompanyManager(session) || !id || id === session.id) return { success: false, error: "No podés quitar este usuario de la empresa." }
  const supabase = getSupabaseServerClient()
  const { data, error } = await supabase.from("users").update({ company_id: null, company_role: "member", updated_at: new Date().toISOString() }).eq("id", id).eq("company_id", session.companyId).eq("role", "cliente").eq("company_role", "member").select("id").maybeSingle()
  if (error || !data) return { success: false, error: "No se pudo quitar al usuario de la empresa." }
  return { success: true }
}
