"use client"

import { useState } from "react"
import { Cpu, Wrench, UserRound, ShieldCheck, ArrowRight, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { useStore } from "@/lib/store"
import type { Role } from "@/lib/types"

interface RoleOption {
  value: Role
  label: string
  description: string
  icon: typeof ShieldCheck
  badge?: string
  accent: string
  iconBg: string
}

const ROLE_OPTIONS: RoleOption[] = [
  {
    value: "empleado",
    label: "Colaborador",
    description: "Cargá pedidos, armá presupuestos y actualizá el estado de las reparaciones.",
    icon: Wrench,
    accent: "hover:border-accent/60 data-[selected=true]:border-accent data-[selected=true]:bg-accent/5",
    iconBg: "bg-accent/15 text-accent",
  },
  {
    value: "cliente",
    label: "Cliente",
    description: "Seguí el estado de tu reparación, revisá el presupuesto y tus notificaciones.",
    icon: UserRound,
    accent: "hover:border-primary/60 data-[selected=true]:border-primary data-[selected=true]:bg-primary/5",
    iconBg: "bg-primary/15 text-primary",
  },
  {
    value: "admin",
    label: "Admin",
    description: "Acceso completo: operaciones, gestión de usuarios y estadísticas globales.",
    icon: ShieldCheck,
    badge: "Acceso total",
    accent: "hover:border-rose-500/50 data-[selected=true]:border-rose-500/70 data-[selected=true]:bg-rose-500/5",
    iconBg: "bg-rose-500/15 text-rose-400",
  },
]

export function LoginScreen() {
  const { login } = useStore()
  const [selected, setSelected] = useState<Role | null>(null)

  function handleLogin() {
    if (!selected) return
    login(selected)
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

      <div className="relative z-10 flex w-full max-w-3xl flex-col items-center gap-10">
        {/* Brand */}
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl border border-border bg-card shadow-lg">
            <Cpu className="size-7 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground text-balance">UTech</h1>
            <p className="mt-1 text-sm text-muted-foreground">Servicio técnico de PCs y consolas</p>
          </div>
          <div className="mt-1">
            <p className="text-base text-foreground/80 text-balance">
              Seleccioná tu perfil para continuar
            </p>
          </div>
        </div>

        {/* Role cards */}
        <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-3">
          {ROLE_OPTIONS.map(({ value, label, description, icon: Icon, badge, accent, iconBg }) => (
            <button
              key={value}
              type="button"
              data-selected={selected === value}
              onClick={() => setSelected(value)}
              className={cn(
                "group relative flex flex-col gap-4 rounded-xl border border-border bg-card p-6 text-left transition-all duration-200",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                accent,
              )}
            >
              {badge && (
                <span className="absolute right-3 top-3 rounded-full bg-rose-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-rose-400">
                  {badge}
                </span>
              )}

              <div className={cn("flex size-11 items-center justify-center rounded-lg", iconBg)}>
                <Icon className="size-5" />
              </div>

              <div className="flex flex-1 flex-col gap-1">
                <p className="font-semibold text-foreground">{label}</p>
                <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
              </div>

              <div
                className={cn(
                  "flex items-center gap-1 text-xs font-medium transition-colors",
                  selected === value ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {selected === value ? (
                  <>
                    <span className="size-2 rounded-full bg-primary" />
                    Seleccionado
                  </>
                ) : (
                  <>
                    <ChevronRight className="size-3.5" />
                    Seleccionar
                  </>
                )}
              </div>
            </button>
          ))}
        </div>

        {/* CTA */}
        <button
          type="button"
          disabled={!selected}
          onClick={handleLogin}
          className={cn(
            "inline-flex items-center gap-2 rounded-xl px-8 py-3 text-sm font-semibold transition-all duration-200",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            selected
              ? "bg-primary text-primary-foreground hover:opacity-90 active:scale-[0.98] shadow-lg shadow-primary/20"
              : "cursor-not-allowed bg-secondary text-muted-foreground",
          )}
        >
          Ingresar
          <ArrowRight className="size-4" />
        </button>

        <p className="text-xs text-muted-foreground/60">
          Modo simulación — sin autenticación real
        </p>
      </div>
    </div>
  )
}
