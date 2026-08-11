export type Role = "admin" | "colaborador" | "cliente"

export type DeviceType = "PC" | "Notebook" | "PlayStation" | "Xbox" | "Nintendo" | "Otro"

export type OrderStatus = string

export interface OrderState {
  id: string
  label: string
  color: string // hex color
  position: number // orden en el flujo
}

// Estados por defecto iniciales
export const DEFAULT_STATES: OrderState[] = [
  { id: "recibido", label: "Recibido", color: "#8b5cf6", position: 0 },
  { id: "en_diagnostico", label: "En diagnóstico", color: "#06b6d4", position: 1 },
  { id: "esperando_repuestos", label: "Esperando repuestos", color: "#f59e0b", position: 2 },
  { id: "en_reparacion", label: "En reparación", color: "#3b82f6", position: 3 },
  { id: "listo", label: "Listo para retirar", color: "#10b981", position: 4 },
  { id: "entregado", label: "Entregado", color: "#6366f1", position: 5 },
]

// Helpers para compatibilidad con código existente
export function getStatusFlow(states: OrderState[]): OrderStatus[] {
  return states.sort((a, b) => a.position - b.position).map((s) => s.id)
}

export function getStatusLabel(statusId: OrderStatus, states: OrderState[]): string {
  return states.find((s) => s.id === statusId)?.label ?? statusId
}

export function getStatusColor(statusId: OrderStatus, states: OrderState[]): string {
  return states.find((s) => s.id === statusId)?.color ?? "#6b7280"
}

export interface CompanySummary {
  name: string
  logo?: string
}

export interface User {
  id: string
  name: string
  email: string
  phone: string
  role: Role
  active: boolean
  companyId?: string
  company?: CompanySummary
  createdAt: string
}

export interface Company {
  id: string
  name: string
  logo?: string
  userLimit: number
  userCount: number
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
  clientId: string | null // Referencia al usuario cliente (null para ocasionales)
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

export interface OrderDetailsInput {
  deviceType: DeviceType
  deviceBrand: string
  deviceModel: string
  fault: string
}

export function budgetTotal(order: Order): number {
  return order.budget.reduce((sum, item) => sum + item.amount, 0)
}
