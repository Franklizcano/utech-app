"use server"

import { getSessionAction } from "@/app/actions/auth"
import { getSupabaseServerClient } from "@/lib/supabase"
import type { Role, User } from "@/lib/types"

const USERS_PAGE_SIZE = 50

export async function fetchUsersAction(page = 0, pageSize = USERS_PAGE_SIZE, search = ""): Promise<{ users: User[]; hasMore: boolean }> {
  const session = await getSessionAction()
  if (!session || !session.active || (session.role !== "admin" && session.role !== "colaborador")) {
    return { users: [], hasMore: false }
  }

  const supabase = getSupabaseServerClient()
  let usersQuery = supabase
    .from("users")
    .select("id, name, email, phone, role, active, company_id, referral_code, referred_by, created_at, company:companies(name, logo)")
    .order("created_at", { ascending: true })

  const normalizedSearch = search.trim()
  if (normalizedSearch) {
    const escapedSearch = normalizedSearch.replace(/[%_]/g, (character) => `\\${character}`)
    usersQuery = usersQuery.or([
      `name.ilike.%${escapedSearch}%`,
      `email.ilike.%${escapedSearch}%`,
      `phone.ilike.%${escapedSearch}%`,
      `referral_code.ilike.%${escapedSearch.toUpperCase()}%`,
    ].join(","))
  }

  const { data, error } = await usersQuery.range(page * pageSize, page * pageSize + pageSize)

  if (error) {
    console.error("Error al traer usuarios autorizados:", error.message)
    throw new Error("No se pudieron cargar los usuarios.")
  }

  const users = (data ?? []).slice(0, pageSize).map((row) => ({
    id: row.id as string,
    name: row.name as string,
    email: row.email as string,
    phone: row.phone as string,
    role: row.role as Role,
    active: row.active as boolean,
    companyId: (row.company_id as string) ?? undefined,
    company: Array.isArray(row.company) && row.company[0]
      ? { name: row.company[0].name as string, logo: (row.company[0].logo as string | null) ?? undefined }
      : undefined,
    referralCode: row.referral_code as string,
    referredBy: (row.referred_by as string | null) ?? undefined,
    createdAt: row.created_at as string,
  }))

  return { users, hasMore: (data?.length ?? 0) > pageSize }
}
