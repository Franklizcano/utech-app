import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Normaliza un código de orden para comparación: quita guiones/espacios y convierte a mayúsculas
 * @param input - Código de orden a normalizar (ej: "tf-k7m-9p2q" o "TF K7M 9P2Q")
 * @returns Código normalizado (ej: "TFK7M9P2Q")
 */
export function normalizeOrderCode(input: string): string {
  return input.replace(/[-\s]/g, '').toUpperCase()
}

/**
 * Formatea un código de orden para visualización: inserta un guion tras el 3° carácter
 * @param raw - Código sin formato (ej: "TFK7M9P2Q")
 * @returns Código formateado (ej: "TF-K7M-9P2Q")
 */
export function formatOrderCode(raw: string): string {
  const normalized = normalizeOrderCode(raw)
  // Si tiene prefijo TF seguido de más caracteres, insertar guion después de TF
  if (normalized.startsWith('TF') && normalized.length > 2) {
    const prefix = normalized.slice(0, 2)
    const rest = normalized.slice(2)
    return `${prefix}-${rest}`
  }
  return normalized
}

