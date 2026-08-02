import { getSupabaseClient } from "@/lib/supabase"
import type { Role, User } from "@/lib/types"

// Mapea una fila de DB (snake_case) al tipo User (camelCase)
function rowToUser(row: Record<string, unknown>): User {
  return {
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
  }
}

export async function fetchUsers(): Promise<User[]> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from("users")
    .select("id, name, email, phone, role, active, is_corporate, company_name, company_logo, created_at")
    .order("created_at", { ascending: true })
  if (error) {
    console.error("Error al traer users:", error.message)
    return []
  }
  return (data ?? []).map(rowToUser)
}


export async function updateUserRemote(
  id: string,
  input: {
    name: string
    email: string
    phone: string
    role: Role
    active: boolean
    isCorporate?: boolean
    companyName?: string
    companyLogo?: string
  },
): Promise<boolean> {
  const supabase = getSupabaseClient()
  const { error } = await supabase
    .from("users")
    .update({
      name: input.name,
      email: input.email,
      phone: input.phone,
      role: input.role,
      active: input.active,
      is_corporate: input.isCorporate ?? false,
      company_name: input.companyName ?? null,
      company_logo: input.companyLogo ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
  if (error) {
    console.error("Error al actualizar usuario:", error.message)
    return false
  }
  return true
}

export async function toggleUserActiveRemote(id: string, active: boolean): Promise<boolean> {
  const supabase = getSupabaseClient()
  const { error } = await supabase
    .from("users")
    .update({ active, updated_at: new Date().toISOString() })
    .eq("id", id)
  if (error) {
    console.error("Error al cambiar estado del usuario:", error.message)
    return false
  }
  return true
}

export async function deleteUserRemote(id: string): Promise<boolean> {
  const supabase = getSupabaseClient()
  const { error } = await supabase.from("users").delete().eq("id", id)
  if (error) {
    console.error("Error al eliminar usuario:", error.message)
    return false
  }
  return true
}

