"use server"

import { cookies } from "next/headers"
import bcrypt from "bcryptjs"
import { getSupabaseClient } from "@/lib/supabase"
import type { Role } from "@/lib/types"

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

    const supabase = getSupabaseClient()

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

