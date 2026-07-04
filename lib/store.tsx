"use client"

import { createContext, useContext, useMemo, useState, type ReactNode } from "react"
import {
  type AppNotification,
  type BudgetItem,
  type DeviceType,
  type Order,
  type OrderStatus,
  type OrderState,
  type Role,
  type User,
  DEFAULT_STATES,
  getStatusLabel,
} from "@/lib/types"

let counter = 100
function uid(prefix = "id") {
  counter += 1
  return `${prefix}_${counter}_${Math.random().toString(36).slice(2, 7)}`
}

function now() {
  return new Date().toISOString()
}

function daysAgo(days: number) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString()
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value)
}

const initialUsers: User[] = [
  { id: "u_admin", name: "Lucía Fernández", email: "lucia@tecnofix.com", phone: "+54 11 2222-8888", role: "admin", active: true, createdAt: daysAgo(120) },
  { id: "u_emp1", name: "Martín Gómez", email: "martin@tecnofix.com", phone: "+54 11 3333-4444", role: "empleado", active: true, createdAt: daysAgo(90) },
  { id: "u_emp2", name: "Sofía Ruiz", email: "sofia@tecnofix.com", phone: "+54 11 4444-5555", role: "empleado", active: true, createdAt: daysAgo(45) },
  { id: "u_emp3", name: "Diego Páez", email: "diego@tecnofix.com", phone: "+54 11 5555-6666", role: "empleado", active: false, createdAt: daysAgo(20) },
]

const initialOrders: Order[] = [
  {
    id: "o_1",
    code: "TF-1024",
    clientId: "c_1",
    clientName: "Juan Pérez",
    clientPhone: "+54 11 5555-1234",
    clientEmail: "juan.perez@mail.com",
    deviceType: "PlayStation",
    deviceBrand: "Sony",
    deviceModel: "PS5 Slim",
    fault: "No da imagen por HDMI, se escucha el ventilador pero la TV no detecta señal.",
    status: "esperando_repuestos",
    assignedTo: "Martín Gómez",
    budget: [
      { id: uid("bi"), description: "Cambio de módulo HDMI PS5", amount: 28000 },
      { id: uid("bi"), description: "Mano de obra (microsoldadura)", amount: 22000 },
      { id: uid("bi"), description: "Limpieza y pasta térmica", amount: 6000 },
    ],
    timeline: [
      { id: uid("ev"), status: "recibido", note: "Equipo ingresado en mostrador.", date: daysAgo(6) },
      { id: uid("ev"), status: "en_diagnostico", note: "Se confirma puerto HDMI dañado.", date: daysAgo(5) },
      { id: uid("ev"), status: "esperando_repuestos", note: "Se encarga módulo HDMI original.", date: daysAgo(3) },
    ],
    notifications: [
      { id: uid("nt"), message: "Tu PS5 fue recibida. Te avisaremos con el diagnóstico.", date: daysAgo(6), read: true },
      { id: uid("nt"), message: "Presupuesto cargado. Total estimado disponible en tu portal.", date: daysAgo(5), read: true },
      { id: uid("nt"), message: "Estamos esperando el repuesto (módulo HDMI).", date: daysAgo(3), read: false },
    ],
    createdAt: daysAgo(6),
  },
  {
    id: "o_2",
    code: "TF-1025",
    clientId: "c_2",
    clientName: "María López",
    clientPhone: "+54 11 4444-9876",
    clientEmail: "maria.lopez@mail.com",
    deviceType: "Notebook",
    deviceBrand: "Lenovo",
    deviceModel: "IdeaPad 3",
    fault: "Se apaga sola al rato de encender. Posible sobrecalentamiento.",
    status: "listo",
    assignedTo: "Sofía Ruiz",
    budget: [
      { id: uid("bi"), description: "Cambio de pasta térmica", amount: 9000 },
      { id: uid("bi"), description: "Limpieza interna de disipador", amount: 7000 },
      { id: uid("bi"), description: "Mano de obra", amount: 12000 },
    ],
    timeline: [
      { id: uid("ev"), status: "recibido", note: "Ingreso del equipo.", date: daysAgo(4) },
      { id: uid("ev"), status: "en_diagnostico", note: "Temperaturas muy altas en CPU.", date: daysAgo(3) },
      { id: uid("ev"), status: "en_reparacion", note: "Limpieza y cambio de pasta.", date: daysAgo(2) },
      { id: uid("ev"), status: "listo", note: "Probado 2hs sin apagarse. Listo para retirar.", date: daysAgo(1) },
    ],
    notifications: [
      { id: uid("nt"), message: "Tu notebook está lista para retirar.", date: daysAgo(1), read: false },
    ],
    createdAt: daysAgo(4),
  },
  {
    id: "o_3",
    code: "TF-1026",
    clientId: "c_3",
    clientName: "Carlos Díaz",
    clientPhone: "+54 11 3333-2211",
    clientEmail: "carlos.diaz@mail.com",
    deviceType: "PC",
    deviceBrand: "Armada",
    deviceModel: "Gamer Ryzen 5",
    fault: "No enciende. No hay luces ni ventiladores al apretar el botón.",
    status: "en_diagnostico",
    assignedTo: "Martín Gómez",
    budget: [],
    timeline: [
      { id: uid("ev"), status: "recibido", note: "Equipo ingresado.", date: daysAgo(1) },
      { id: uid("ev"), status: "en_diagnostico", note: "Revisando fuente y placa madre.", date: daysAgo(1) },
    ],
    notifications: [
      { id: uid("nt"), message: "Recibimos tu PC, estamos haciendo el diagnóstico.", date: daysAgo(1), read: false },
    ],
    createdAt: daysAgo(1),
  },
]

export interface NewOrderInput {
  clientId: string
  clientName: string
  clientPhone: string
  clientEmail: string
  deviceType: DeviceType
  deviceBrand: string
  deviceModel: string
  fault: string
  assignedTo: string
}

interface StoreValue {
  role: Role
  setRole: (role: Role) => void
  isLoggedIn: boolean
  login: (role: Role) => void
  logout: () => void
  users: User[]
  orders: Order[]
  employees: User[]
  states: OrderState[]
  // cliente
  activeClientOrderId: string | null
  setActiveClientOrderId: (id: string | null) => void
  // acciones
  addOrder: (input: NewOrderInput) => Order
  advanceStatus: (orderId: string, status: OrderStatus, note?: string) => void
  reassignOrder: (orderId: string, newAssignee: string) => void
  addBudgetItem: (orderId: string, description: string, amount: number) => void
  removeBudgetItem: (orderId: string, itemId: string) => void
  sendBudgetNotification: (orderId: string) => void
  addUser: (input: { name: string; email: string; phone: string; role: Role; isCorporate?: boolean; companyName?: string; companyLogo?: string }) => void
  updateUser: (id: string, input: { name: string; email: string; phone: string; role: Role; active: boolean; isCorporate?: boolean; companyName?: string; companyLogo?: string }) => void
  toggleUserActive: (id: string) => void
  markNotificationsRead: (orderId: string) => void
  // estado management
  addState: (label: string, color: string) => void
  updateState: (id: string, label: string, color: string) => void
  deleteState: (id: string) => void
  reorderStates: (ids: string[]) => void
}

const StoreContext = createContext<StoreValue | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role>("empleado")
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [users, setUsers] = useState<User[]>(initialUsers)
  const [orders, setOrders] = useState<Order[]>(initialOrders)
  const [states, setStates] = useState<OrderState[]>(DEFAULT_STATES)
  const [activeClientOrderId, setActiveClientOrderId] = useState<string | null>(null)

  const value = useMemo<StoreValue>(() => {
    const employees = users.filter((u) => u.role === "empleado" || u.role === "admin")

    function login(selectedRole: Role) {
      setRole(selectedRole)
      setIsLoggedIn(true)
    }

    function logout() {
      setIsLoggedIn(false)
      setActiveClientOrderId(null)
    }

    function addOrder(input: NewOrderInput): Order {
      const code = `TF-${1027 + orders.length}`
      const newOrder: Order = {
        id: uid("o"),
        code,
        clientId: input.clientId,
        clientName: input.clientName,
        clientPhone: input.clientPhone,
        clientEmail: input.clientEmail,
        deviceType: input.deviceType,
        deviceBrand: input.deviceBrand,
        deviceModel: input.deviceModel,
        fault: input.fault,
        status: "recibido",
        assignedTo: input.assignedTo,
        budget: [],
        timeline: [{ id: uid("ev"), status: "recibido", note: "Equipo ingresado en el sistema.", date: now() }],
        notifications: [
          { id: uid("nt"), message: `Recibimos tu equipo (${input.deviceBrand} ${input.deviceModel}). Te mantendremos al tanto.`, date: now(), read: false },
        ],
        createdAt: now(),
      }
      setOrders((prev) => [newOrder, ...prev])
      return newOrder
    }

    function advanceStatus(orderId: string, status: OrderStatus, note?: string) {
      setOrders((prev) =>
        prev.map((o) => {
          if (o.id !== orderId) return o
          const statusLabel = getStatusLabel(status, states)
          return {
            ...o,
            status,
            timeline: [...o.timeline, { id: uid("ev"), status, note, date: now() }],
            notifications: [
              ...o.notifications,
              { id: uid("nt"), message: `Estado actualizado: ${statusLabel}.${note ? ` ${note}` : ""}`, date: now(), read: false },
            ],
          }
        }),
      )
    }

    function reassignOrder(orderId: string, newAssignee: string) {
      setOrders((prev) =>
        prev.map((o) => {
          if (o.id !== orderId) return o
          return {
            ...o,
            assignedTo: newAssignee,
            notifications: [
              ...o.notifications,
              { id: uid("nt"), message: `Tu pedido ha sido reasignado a ${newAssignee}.`, date: now(), read: false },
            ],
          }
        }),
      )
    }

    function addBudgetItem(orderId: string, description: string, amount: number) {
      const item: BudgetItem = { id: uid("bi"), description, amount }
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, budget: [...o.budget, item] } : o)))
    }

    function removeBudgetItem(orderId: string, itemId: string) {
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, budget: o.budget.filter((b) => b.id !== itemId) } : o)),
      )
    }

    function sendBudgetNotification(orderId: string) {
      setOrders((prev) =>
        prev.map((o) => {
          if (o.id !== orderId) return o
          const total = o.budget.reduce((s, b) => s + b.amount, 0)
          const note: AppNotification = {
            id: uid("nt"),
            message: `Presupuesto actualizado disponible en tu portal. Total: ${formatCurrency(total)}.`,
            date: now(),
            read: false,
          }
          return { ...o, notifications: [...o.notifications, note] }
        }),
      )
    }

    function addUser(input: { name: string; email: string; phone: string; role: Role; isCorporate?: boolean; companyName?: string; companyLogo?: string }) {
      const u: User = { 
        id: uid("u"), 
        name: input.name, 
        email: input.email, 
        phone: input.phone,
        role: input.role, 
        active: true,
        isCorporate: input.isCorporate,
        companyName: input.companyName,
        companyLogo: input.companyLogo,
        createdAt: now() 
      }
      setUsers((prev) => [...prev, u])
    }

    function updateUser(id: string, input: { name: string; email: string; phone: string; role: Role; active: boolean; isCorporate?: boolean; companyName?: string; companyLogo?: string }) {
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...input } : u)))
    }

    function toggleUserActive(id: string) {
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, active: !u.active } : u)))
    }

    function markNotificationsRead(orderId: string) {
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId ? { ...o, notifications: o.notifications.map((n) => ({ ...n, read: true })) } : o,
        ),
      )
    }

    function addState(label: string, color: string) {
      const maxPosition = Math.max(0, ...states.map((s) => s.position))
      const newState: OrderState = { id: uid("st"), label, color, position: maxPosition + 1 }
      setStates((prev) => [...prev, newState])
    }

    function updateState(id: string, label: string, color: string) {
      setStates((prev) => prev.map((s) => (s.id === id ? { ...s, label, color } : s)))
    }

    function deleteState(id: string) {
      setStates((prev) => {
        // No permitir eliminar si es el único estado
        if (prev.length <= 1) return prev
        return prev.filter((s) => s.id !== id)
      })
    }

    function reorderStates(ids: string[]) {
      setStates((prev) => {
        const newStates = ids.map((id, idx) => {
          const state = prev.find((s) => s.id === id)
          return state ? { ...state, position: idx } : null
        }).filter(Boolean) as OrderState[]
        return newStates
      })
    }

    return {
      role,
      setRole,
      isLoggedIn,
      login,
      logout,
      users,
      orders,
      employees,
      states,
      activeClientOrderId,
      setActiveClientOrderId,
      addOrder,
      advanceStatus,
      reassignOrder,
      addBudgetItem,
      removeBudgetItem,
      sendBudgetNotification,
      addUser,
      updateUser,
      toggleUserActive,
      markNotificationsRead,
      addState,
      updateState,
      deleteState,
      reorderStates,
    }
  }, [role, isLoggedIn, users, orders, states, activeClientOrderId])

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error("useStore debe usarse dentro de StoreProvider")
  return ctx
}
