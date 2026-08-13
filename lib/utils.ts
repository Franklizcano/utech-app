import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Normaliza un código de orden para comparación: quita guiones/espacios y convierte a mayúsculas
 * @param input - Código o segmento de orden (ej: "cp-2608120001" o "CC 26081210000")
 * @returns Texto normalizado sin guiones ni espacios y en mayúsculas
 */
export function normalizeOrderCode(input: string): string {
  return input.replace(/[-\s]/g, '').toUpperCase()
}

/**
 * Formatea un código completo para visualización con guiones entre sus segmentos.
 * No limita la cantidad de dígitos del contador.
 */
export function formatOrderCode(raw: string): string {
  const normalized = normalizeOrderCode(raw)
  const match = normalized.match(/^(CP|CC|CO)(\d{6})(\d+)$/)
  if (match) {
    return `${match[1]}-${match[2]}-${match[3]}`
  }
  return normalized
}
