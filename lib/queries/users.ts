import { getSupabaseClient } from "@/lib/supabase"
import type { Role } from "@/lib/types"

export async function updateUserRemote(
  id: string,
  input: {
    name: string
    email: string
    phone: string
    role: Role
    active: boolean
    companyId?: string
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
      company_id: input.companyId ?? null,
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

