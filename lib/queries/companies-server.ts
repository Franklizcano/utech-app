import { getSupabaseServerClient } from "@/lib/supabase"

export interface CompanyCapacity {
  id: string
  name: string
  userLimit: number
  userCount: number
}

export async function fetchCompanyCapacityServer(companyId: string): Promise<CompanyCapacity | null> {
  if (!companyId) return null

  const supabase = getSupabaseServerClient()
  const [{ data: company, error: companyError }, { count, error: countError }] = await Promise.all([
    supabase.from("companies").select("id, name, user_limit").eq("id", companyId).maybeSingle(),
    supabase.from("users").select("id", { count: "exact", head: true }).eq("company_id", companyId),
  ])

  if (companyError || countError) {
    console.error("Error al consultar el cupo de la empresa:", {
      company: companyError?.message,
      users: countError?.message,
    })
    throw new Error("No se pudo consultar el cupo de la empresa.")
  }

  if (!company) return null

  return {
    id: company.id as string,
    name: company.name as string,
    userLimit: Number(company.user_limit),
    userCount: count ?? 0,
  }
}

export async function fetchCompanyCapacityForUserServer(userId: string): Promise<CompanyCapacity | null> {
  if (!userId) return null

  const supabase = getSupabaseServerClient()
  const { data: user, error } = await supabase
    .from("users")
    .select("company_id")
    .eq("id", userId)
    .eq("role", "cliente")
    .maybeSingle()

  if (error) {
    console.error("Error al consultar la empresa del cliente:", error.message)
    throw new Error("No se pudo consultar la empresa del cliente.")
  }

  const companyId = (user?.company_id as string | null) ?? null
  return companyId ? fetchCompanyCapacityServer(companyId) : null
}

export function getCompanyOverLimitMessage(capacity: CompanyCapacity): string | null {
  if (capacity.userCount <= capacity.userLimit) return null

  return `La empresa ${capacity.name} tiene ${capacity.userCount} integrantes y su límite es de ${capacity.userLimit}. No puede generar tickets hasta regularizar la cantidad de integrantes.`
}
