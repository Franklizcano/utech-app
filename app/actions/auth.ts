"use server"

import { cookies } from "next/headers"
import bcrypt from "bcryptjs"
import { randomBytes } from "node:crypto"
import { getSupabaseServerClient } from "@/lib/supabase"
import type { CompanySummary, Role, User } from "@/lib/types"

const MIN_PASSWORD_LENGTH = 8

type UserInput = {
  name: string
  email: string
  phone: string
  role: Role
  companyId?: string
  referralCode?: string
}

export interface CreateUserResult {
  success: boolean
  user?: User
  error?: string
}

export interface ChangePasswordResult {
  success: boolean
  error?: string
}

function validatePassword(password: string): string | null {
  if (!password || password.length < MIN_PASSWORD_LENGTH) {
    return `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`
  }
  return null
}

const REFERRAL_CODE_LENGTH = 12

function generateReferralCode(): string {
  return randomBytes(REFERRAL_CODE_LENGTH).toString("hex").slice(0, REFERRAL_CODE_LENGTH).toUpperCase()
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
    companyId: (row.company_id as string) ?? undefined,
    company: company?.name ? { name: company.name, logo: company.logo ?? undefined } : undefined,
    referralCode: row.referral_code as string,
    referredBy: (row.referred_by as string | null) ?? undefined,
    createdAt: row.created_at as string,
  }
}

const safeUserSelect = "id, name, email, phone, role, active, company_id, referral_code, referred_by, created_at, company:companies(name, logo)"

export interface AuthUser {
  id: string
  name: string
  email: string
  phone: string
  role: Role
  active: boolean
  companyId?: string
  company?: CompanySummary
  referralCode: string
  referredBy?: string
  createdAt: string
}

interface LoginResult {
  success: boolean
  user?: AuthUser
  error?: string
}

export async function loginAction(email: string, password: string): Promise<LoginResult> {
  try {
    if (!email || !password) {
      console.warn("[auth] login rechazado: faltan credenciales", { hasEmail: Boolean(email), hasPassword: Boolean(password) })
      return { success: false, error: "Email y contraseña son requeridos." }
    }

    const supabase = getSupabaseServerClient()

    const { data, error } = await supabase
      .from("users")
      .select("id, name, email, phone, role, active, password_hash, company_id, referral_code, referred_by, created_at, company:companies(name, logo)")
      .eq("email", email.toLowerCase().trim())
      .single()

    if (error || !data) {
      console.warn("[auth] login rechazado: usuario no encontrado o consulta fallida", { email: email.toLowerCase().trim(), code: error?.code })
      return { success: false, error: "Email o contraseña incorrectos." }
    }

    if (!data.active) {
      console.warn("[auth] login rechazado: cuenta desactivada", { userId: data.id })
      return { success: false, error: "Tu cuenta está desactivada. Contactá al administrador." }
    }

    if (!data.password_hash) {
      console.warn("[auth] login rechazado: cuenta sin contraseña", { userId: data.id })
      return { success: false, error: "Tu cuenta no tiene contraseña configurada." }
    }

    const passwordMatch = await bcrypt.compare(password, data.password_hash)

    if (!passwordMatch) {
      console.warn("[auth] login rechazado: contraseña incorrecta", { userId: data.id })
      return { success: false, error: "Email o contraseña incorrectos." }
    }

    // Map snake_case DB fields to camelCase
    const user: AuthUser = {
      id: data.id,
      name: data.name,
      email: data.email,
      phone: data.phone,
      role: data.role as Role,
      active: data.active,
      companyId: data.company_id ?? undefined,
      company: data.company?.[0]
        ? { name: data.company[0].name, logo: data.company[0].logo ?? undefined }
        : undefined,
      referralCode: data.referral_code,
      referredBy: data.referred_by ?? undefined,
      createdAt: data.created_at,
    }

    // Set session cookie (httpOnly, secure, 7 days)
    const cookieStore = await cookies()
    const sessionData = JSON.stringify(user)
    cookieStore.set("session", sessionData, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    })

    return { success: true, user }
  } catch (err) {
    console.error("Login error:", err)
    return { success: false, error: "Error interno del servidor." }
  }
}

export async function createUserWithPasswordAction(
  input: UserInput & { password: string },
): Promise<CreateUserResult> {
  try {
    const session = await getSessionAction()
    if (session?.role !== "admin") {
      return { success: false, error: "No tenés permisos para crear usuarios." }
    }

    const passwordError = validatePassword(input.password)
    if (passwordError) return { success: false, error: passwordError }

    const name = input.name.trim()
    const email = input.email.trim().toLowerCase()
    const phone = input.phone.trim()
    if (!name || !email || !phone) {
      return { success: false, error: "Nombre, email y teléfono son requeridos." }
    }
    if (input.companyId && input.role !== "cliente") return { success: false, error: "Solo los clientes pueden pertenecer a una empresa." }

    const supabase = getSupabaseServerClient()
    let referredBy: string | null = null
    if (input.referralCode?.trim()) {
      if (input.role !== "cliente") return { success: false, error: "El código de referido solo aplica a clientes." }
      const { data: referrer, error: referrerError } = await supabase
        .from("users")
        .select("id")
        .eq("referral_code", input.referralCode.trim().toUpperCase())
        .eq("role", "cliente")
        .eq("active", true)
        .maybeSingle()
      if (referrerError || !referrer) return { success: false, error: "El código de referido no es válido." }
      referredBy = referrer.id
    }
    if (input.companyId) {
      const { data: company, error: companyError } = await supabase
        .from("companies")
        .select("id, name, user_limit")
        .eq("id", input.companyId)
        .single()

      if (companyError || !company) return { success: false, error: "La empresa seleccionada no existe." }

      const { count, error: countError } = await supabase
        .from("users")
        .select("id", { count: "exact", head: true })
        .eq("company_id", input.companyId)

      if (countError) return { success: false, error: "No se pudo verificar el cupo de la empresa." }
      if ((count ?? 0) >= company.user_limit) {
        return { success: false, error: `La empresa ${company.name} alcanzó su límite de ${company.user_limit} usuarios corporativos.` }
      }
    }
    const passwordHash = await bcrypt.hash(input.password, 10)
    let data: Record<string, unknown> | null = null
    let error: { code?: string; message?: string } | null = null
    for (let attempt = 0; attempt < 3 && !data; attempt += 1) {
      const result = await supabase
        .from("users")
        .insert({
          name,
          email,
          phone,
          role: input.role,
          active: true,
          password_hash: passwordHash,
          company_id: input.companyId || null,
          referral_code: generateReferralCode(),
          referred_by: referredBy,
        })
        .select(safeUserSelect)
        .single()
      data = result.data as Record<string, unknown> | null
      error = result.error
      if (error?.code !== "23505") break
    }

    if (error || !data) {
      console.error("Error al crear usuario con contraseña:", error?.message)
      if (error?.code === "23505") {
        return { success: false, error: "Ya existe un usuario con ese email." }
      }
      return { success: false, error: "No se pudo crear el usuario." }
    }

    return { success: true, user: rowToUser(data as Record<string, unknown>) }
  } catch (err) {
    console.error("Error al crear usuario con contraseña:", err)
    return { success: false, error: "Error interno del servidor." }
  }
}

export async function changePasswordAction(
  currentPassword: string,
  newPassword: string,
): Promise<ChangePasswordResult> {
  try {
    const session = await getSessionAction()
    if (!session) {
      return { success: false, error: "Tu sesión expiró. Volvé a iniciar sesión." }
    }

    if (!currentPassword || !newPassword) {
      return { success: false, error: "Completá la contraseña actual y la nueva." }
    }

    const passwordError = validatePassword(newPassword)
    if (passwordError) return { success: false, error: passwordError }
    if (currentPassword === newPassword) {
      return { success: false, error: "La nueva contraseña debe ser diferente de la actual." }
    }

    const supabase = getSupabaseServerClient()
    const { data, error: fetchError } = await supabase
      .from("users")
      .select("password_hash")
      .eq("id", session.id)
      .single()

    if (fetchError || !data?.password_hash) {
      return { success: false, error: "No se pudo verificar tu contraseña actual." }
    }

    const passwordMatches = await bcrypt.compare(currentPassword, data.password_hash)
    if (!passwordMatches) {
      return { success: false, error: "La contraseña actual es incorrecta." }
    }

    const passwordHash = await bcrypt.hash(newPassword, 10)
    const { error: updateError } = await supabase
      .from("users")
      .update({ password_hash: passwordHash, updated_at: new Date().toISOString() })
      .eq("id", session.id)

    if (updateError) {
      console.error("Error al cambiar contraseña:", updateError.message)
      return { success: false, error: "No se pudo cambiar la contraseña." }
    }

    return { success: true }
  } catch (err) {
    console.error("Error al cambiar contraseña:", err)
    return { success: false, error: "Error interno del servidor." }
  }
}

export async function logoutAction(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete("session")
}

export async function getSessionAction(): Promise<AuthUser | null> {
  try {
    const cookieStore = await cookies()
    const session = cookieStore.get("session")
    if (!session?.value) return null
    return JSON.parse(session.value) as AuthUser
  } catch {
    return null
  }
}

