"use server"

import { getSessionAction } from "@/app/actions/auth"
import { getSupabaseServerClient } from "@/lib/supabase"
import type { CompanyRole } from "@/lib/types"

export async function updateCompanyRoleAction(userId: string, companyRole: CompanyRole): Promise<{ success: boolean; error?: string }> {
  const session = await getSessionAction()
  if (!session?.active || session.role !== "admin") return { success: false, error: "No autorizado." }
  if (!userId || !["member", "manager"].includes(companyRole)) return { success: false, error: "Datos inválidos." }

  const supabase = getSupabaseServerClient()
  if (companyRole === "manager") {
    const { data: target } = await supabase.from("users").select("company_id").eq("id", userId).eq("role", "cliente").maybeSingle()
    if (!target?.company_id) return { success: false, error: "El usuario no pertenece a una empresa." }
    const { data: existingManager } = await supabase.from("users").select("id").eq("company_id", target.company_id).eq("role", "cliente").eq("company_role", "manager").neq("id", userId).maybeSingle()
    if (existingManager) return { success: false, error: "Esta empresa ya tiene un manager asignado." }
  }
  const { error } = await supabase
    .from("users")
    .update({ company_role: companyRole, updated_at: new Date().toISOString() })
    .eq("id", userId)
    .eq("role", "cliente")
    .not("company_id", "is", null)

  if (error) {
    console.error("Error al actualizar el permiso corporativo:", error.message)
    return { success: false, error: "No se pudo actualizar el permiso." }
  }
  return { success: true }
}
