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
    .select("id, name, email, phone, role, active, is_corporate, company_name, company_logo, created_at")
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
    isCorporate: (row.is_corporate as boolean) ?? false,
    companyName: (row.company_name as string) ?? undefined,
    companyLogo: (row.company_logo as string) ?? undefined,
    createdAt: row.created_at as string,
  }))
}
