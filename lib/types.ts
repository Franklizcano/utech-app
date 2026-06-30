export type Role = "admin" | "empleado" | "cliente"

export type DeviceType = "PC" | "Notebook" | "PlayStation" | "Xbox" | "Nintendo" | "Otro"

export type OrderStatus =
  | "recibido"
  | "en_diagnostico"
  | "esperando_repuestos"
  | "en_reparacion"
  | "listo"
  | "entregado"

export const STATUS_FLOW: OrderStatus[] = [
  "recibido",
  "en_diagnostico",
  "esperando_repuestos",
  "en_reparacion",
  "listo",
  "entregado",
]

export const STATUS_LABELS: Record<OrderStatus, string> = {
  recibido: "Recibido",
  en_diagnostico: "En diagnóstico",
  esperando_repuestos: "Esperando repuestos",
  en_reparacion: "En reparación",
  listo: "Listo para retirar",
  entregado: "Entregado",
}

export interface User {
  id: string
  name: string
  email: string
  role: Role
  active: boolean
  createdAt: string
}

export interface BudgetItem {
  id: string
  description: string
  amount: number
}

export interface TimelineEvent {
  id: string
  status: OrderStatus
  note?: string
  date: string
}

export interface AppNotification {
  id: string
  message: string
  date: string
  read: boolean
}

export interface Order {
  id: string
  code: string
  // Cliente
  clientName: string
  clientPhone: string
  clientEmail: string
  // Equipo
  deviceType: DeviceType
  deviceBrand: string
  deviceModel: string
  fault: string
  // Gestión
  status: OrderStatus
  assignedTo: string
  budget: BudgetItem[]
  timeline: TimelineEvent[]
  notifications: AppNotification[]
  createdAt: string
}

export function budgetTotal(order: Order): number {
  return order.budget.reduce((sum, item) => sum + item.amount, 0)
}
