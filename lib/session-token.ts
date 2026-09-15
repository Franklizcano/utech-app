import { createHmac, timingSafeEqual } from "node:crypto"
import type { CompanyRole, CompanySummary, Role } from "@/lib/types"

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7
const JWT_HEADER = { alg: "HS256", typ: "JWT" }

export interface SessionClaims {
  id: string
  name: string
  email: string
  phone: string
  role: Role
  active: boolean
  companyId?: string
  companyRole: CompanyRole
  company?: CompanySummary
  referralCode: string
  referredBy?: string
  createdAt: string
  iat: number
  exp: number
}

export type SessionUser = Omit<SessionClaims, "iat" | "exp">

function encode(value: unknown): string { return Buffer.from(JSON.stringify(value)).toString("base64url") }
function decode<T>(value: string): T { return JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as T }

function getSecret(): string {
  const secret = process.env.SESSION_SECRET
  if (!secret || (process.env.NODE_ENV === "production" && secret.length < 32)) {
    throw new Error("SESSION_SECRET debe estar configurado y tener al menos 32 caracteres en producción.")
  }
  return secret
}

function sign(input: string): string { return createHmac("sha256", getSecret()).update(input).digest("base64url") }

export function createSessionToken(user: SessionUser): string {
  const now = Math.floor(Date.now() / 1000)
  const header = encode(JWT_HEADER)
  const payload = encode({ ...user, iat: now, exp: now + SESSION_TTL_SECONDS })
  const unsigned = `${header}.${payload}`
  return `${unsigned}.${sign(unsigned)}`
}

export function verifySessionToken(token: string): SessionClaims | null {
  try {
    const [headerPart, payloadPart, signaturePart] = token.split(".")
    if (!headerPart || !payloadPart || !signaturePart) return null
    const unsigned = `${headerPart}.${payloadPart}`
    const expected = Buffer.from(sign(unsigned))
    const actual = Buffer.from(signaturePart)
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null
    const header = decode<{ alg?: string; typ?: string }>(headerPart)
    const payload = decode<SessionClaims>(payloadPart)
    if (header.alg !== "HS256" || header.typ !== "JWT") return null
    if (!payload.id || !payload.email || !payload.name || !payload.active || !payload.exp || payload.exp <= Math.floor(Date.now() / 1000)) return null
    if (!["admin", "colaborador", "presupuestador", "cliente"].includes(payload.role)) return null
    if (!["member", "manager"].includes(payload.companyRole)) return null
    if (payload.companyRole === "manager" && (payload.role !== "cliente" || !payload.companyId)) return null
    return payload
  } catch { return null }
}
