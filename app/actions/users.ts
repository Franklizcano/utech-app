"use server"

import { getSessionAction } from "@/app/actions/auth"
import { getSupabaseServerClient } from "@/lib/supabase"
import type { Role, User } from "@/lib/types"

export async function fetchUsersAction(): Promise<User[]> {
  const session = await getSessionAction()
  if (!session || !session.active || (session.role !== "admin" && session.role !== "colaborador")) {
    return []
  }

  const supabase = getSupabaseServerClient()
  const { data, error } = await supabase
    .from("users")
    .select("id, name, email, phone, role, active, company_id, created_at, company:companies(name, logo)")
    .order("created_at", { ascending: true })

  if (error) {
    console.error("Error al traer usuarios autorizados:", error.message)
    throw new Error("No se pudieron cargar los usuarios.")
  }

  return (data ?? []).map((row) => ({
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
    createdAt: row.created_at as string,
  }))
}
