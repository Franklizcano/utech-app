"use server"

import { getSessionAction } from "@/app/actions/auth"
import { getSupabaseServerClient } from "@/lib/supabase"
import type { Company } from "@/lib/types"

function isAdmin(session: Awaited<ReturnType<typeof getSessionAction>>) {
  return session?.active && session.role === "admin"
}

const COMPANIES_PAGE_SIZE = 50

export async function fetchCompaniesAction(page = 0, pageSize = COMPANIES_PAGE_SIZE): Promise<{ companies: Company[]; hasMore: boolean }> {
  const session = await getSessionAction()
  if (!isAdmin(session)) return { companies: [], hasMore: false }

  const supabase = getSupabaseServerClient()
  const [{ data: companies, error: companiesError }, { data: users, error: usersError }] = await Promise.all([
    supabase.from("companies").select("id, name, logo, user_limit, created_at").order("name").range(page * pageSize, page * pageSize + pageSize),
    supabase.from("users").select("company_id").not("company_id", "is", null),
  ])
  if (companiesError || usersError) throw new Error("No se pudieron cargar las empresas.")

  const counts = new Map<string, number>()
  for (const user of users ?? []) {
    if (user.company_id) counts.set(user.company_id, (counts.get(user.company_id) ?? 0) + 1)
  }
  const pagedCompanies = (companies ?? []).slice(0, pageSize)
  return { companies: pagedCompanies.map((company) => ({
    id: company.id,
    name: company.name,
    logo: company.logo ?? undefined,
    userLimit: company.user_limit,
    userCount: counts.get(company.id) ?? 0,
    createdAt: company.created_at,
  })), hasMore: (companies?.length ?? 0) > pageSize }
}

export async function createCompanyAction(input: { name: string; userLimit: number; logo?: string }): Promise<{ success: boolean; company?: Company; error?: string }> {
  const session = await getSessionAction()
  if (!isAdmin(session)) return { success: false, error: "No tenés permisos para crear empresas." }
  const name = input.name.trim()
  if (!name) return { success: false, error: "El nombre de la empresa es requerido." }
  if (!Number.isInteger(input.userLimit) || input.userLimit < 0) return { success: false, error: "Ingresá un límite válido de usuarios." }

  const supabase = getSupabaseServerClient()
  const { data, error } = await supabase
    .from("companies")
    .insert({ name, user_limit: input.userLimit, logo: input.logo || null })
    .select("id, name, logo, user_limit, created_at")
    .single()
  if (error || !data) return { success: false, error: error?.code === "23505" ? "Ya existe una empresa con ese nombre." : "No se pudo crear la empresa." }
  return { success: true, company: { id: data.id, name: data.name, logo: data.logo ?? undefined, userLimit: data.user_limit, userCount: 0, createdAt: data.created_at } }
}

export async function updateCompanyAction(id: string, input: { name: string; userLimit: number; logo?: string }): Promise<{ success: boolean; error?: string }> {
  const session = await getSessionAction()
  if (!isAdmin(session)) return { success: false, error: "No tenés permisos para editar empresas." }
  const name = input.name.trim()
  if (!name || !Number.isInteger(input.userLimit) || input.userLimit < 0) return { success: false, error: "Revisá el nombre y el límite de usuarios." }
  const supabase = getSupabaseServerClient()
  const { count } = await supabase.from("users").select("id", { count: "exact", head: true }).eq("company_id", id)
  if ((count ?? 0) > input.userLimit) return { success: false, error: `El límite no puede ser menor a los ${count ?? 0} usuarios corporativos actuales.` }
  const { error } = await supabase.from("companies").update({ name, user_limit: input.userLimit, logo: input.logo || null, updated_at: new Date().toISOString() }).eq("id", id)
  if (error) return { success: false, error: error.code === "23505" ? "Ya existe una empresa con ese nombre." : "No se pudo actualizar la empresa." }
  return { success: true }
}
