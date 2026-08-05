"use server"

import { cookies } from "next/headers"
import bcrypt from "bcryptjs"
import { getSupabaseServerClient } from "@/lib/supabase"
import type { Role, User } from "@/lib/types"

const MIN_PASSWORD_LENGTH = 8

type UserInput = {
  name: string
  email: string
  phone: string
  role: Role
  isCorporate?: boolean
  companyName?: string
  companyLogo?: string
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

const safeUserSelect = "id, name, email, phone, role, active, is_corporate, company_name, company_logo, created_at"

export interface AuthUser {
  id: string
  name: string
  email: string
  phone: string
  role: Role
  active: boolean
  isCorporate?: boolean
  companyName?: string
  companyLogo?: string
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
      return { success: false, error: "Email y contraseña son requeridos." }
    }

    const supabase = getSupabaseServerClient()

    const { data, error } = await supabase
      .from("users")
      .select("id, name, email, phone, role, active, is_corporate, company_name, company_logo, password_hash, created_at")
      .eq("email", email.toLowerCase().trim())
      .single()

    if (error || !data) {
      return { success: false, error: "Email o contraseña incorrectos." }
    }

    if (!data.active) {
      return { success: false, error: "Tu cuenta está desactivada. Contactá al administrador." }
    }

    if (!data.password_hash) {
      return { success: false, error: "Tu cuenta no tiene contraseña configurada." }
    }

    const passwordMatch = await bcrypt.compare(password, data.password_hash)

    if (!passwordMatch) {
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
      isCorporate: data.is_corporate ?? undefined,
      companyName: data.company_name ?? undefined,
      companyLogo: data.company_logo ?? undefined,
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
    if (input.role === "cliente" && input.isCorporate && !input.companyName?.trim()) {
      return { success: false, error: "El nombre de la empresa es requerido." }
    }

    const supabase = getSupabaseServerClient()
    const passwordHash = await bcrypt.hash(input.password, 10)
    const { data, error } = await supabase
      .from("users")
      .insert({
        name,
        email,
        phone,
        role: input.role,
        active: true,
        password_hash: passwordHash,
        is_corporate: input.isCorporate ?? false,
        company_name: input.companyName?.trim() || null,
        company_logo: input.companyLogo || null,
      })
      .select(safeUserSelect)
      .single()

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

