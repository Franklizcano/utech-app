"use client"

import { useState } from "react"
import { Cpu, ArrowRight, Loader2, Mail, Lock, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { useStore } from "@/lib/store"
import { loginAction } from "@/app/actions/auth"
import { OccasionalTicketLookup } from "@/components/occasional-ticket-lookup"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function LoginScreen() {
  const { login } = useStore()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const result = await loginAction(email, password)
      if (result.success && result.user) {
        login(result.user)
      } else {
        setError(result.error ?? "Error desconocido.")
      }
    } catch {
      setError("No se pudo conectar con el servidor.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
      {/* Background grid pattern */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(var(--color-foreground) 1px, transparent 1px), linear-gradient(90deg, var(--color-foreground) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      {/* Glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed left-1/2 top-0 h-[500px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-[0.07]"
        style={{ background: "radial-gradient(ellipse, var(--color-primary) 0%, transparent 70%)" }}
      />

      <div className="relative z-10 flex w-full max-w-md flex-col items-center gap-8">
        {/* Brand */}
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl border border-border bg-card shadow-lg">
            <Cpu className="size-7 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground text-balance">UTech</h1>
            <p className="mt-1 text-sm text-muted-foreground">Servicio técnico de PCs y consolas</p>
          </div>
        </div>

        {/* Login form */}
        <form
          onSubmit={handleSubmit}
          className="w-full space-y-5 rounded-xl border border-border bg-card p-6 shadow-lg"
        >
          <div className="text-center mb-1">
            <p className="text-base font-medium text-foreground">Iniciá sesión</p>
            <p className="text-sm text-muted-foreground mt-0.5">Ingresá tus credenciales para continuar</p>
          </div>

          {/* Error message */}
          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              <AlertCircle className="size-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-4">
            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">
                <Mail className="size-3.5 text-muted-foreground" />
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                disabled={loading}
                className="h-10"
              />
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password">
                <Lock className="size-3.5 text-muted-foreground" />
                Contraseña
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                disabled={loading}
                className="h-10"
              />
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || !email || !password}
            className={cn(
              "inline-flex w-full items-center justify-center gap-2 rounded-xl px-8 py-3 text-sm font-semibold transition-all duration-200",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              loading || !email || !password
                ? "cursor-not-allowed bg-secondary text-muted-foreground"
                : "bg-primary text-primary-foreground hover:opacity-90 active:scale-[0.98] shadow-lg shadow-primary/20",
            )}
          >
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Ingresando...
              </>
            ) : (
              <>
                Ingresar
                <ArrowRight className="size-4" />
              </>
            )}
          </button>
        </form>

        <OccasionalTicketLookup />

        <p className="text-xs text-muted-foreground/60">
          El acceso de gestión es solo para usuarios registrados
        </p>
      </div>
    </div>
  )
}
