"use client"

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
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
import { type AuthUser, logoutAction } from "@/app/actions/auth"
import {
  fetchOrderStates,
  insertOrderState,
  updateOrderStateRemote,
  deleteOrderStateRemote,
  reorderOrderStatesRemote,
} from "@/lib/queries/order-states"
import {
  fetchUsers,
  insertUserRemote,
  updateUserRemote,
  toggleUserActiveRemote,
} from "@/lib/queries/users"

let counter = 100
function uid(prefix = "id") {
  counter += 1
  return `${prefix}_${counter}_${Math.random().toString(36).slice(2, 7)}`
}

function now() {
  return new Date().toISOString()
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value)
}

const initialUsers: User[] = [
  { id: "u_admin", name: "Lucía Fernández", email: "lucia@tecnofix.com", phone: "+54 11 2222-8888", role: "admin", active: true, createdAt: "2026-03-08T12:00:00.000Z" },
  { id: "u_emp1", name: "Martín Gómez", email: "martin@tecnofix.com", phone: "+54 11 3333-4444", role: "colaborador", active: true, createdAt: "2026-04-07T12:00:00.000Z" },
  { id: "u_emp2", name: "Sofía Ruiz", email: "sofia@tecnofix.com", phone: "+54 11 4444-5555", role: "colaborador", active: true, createdAt: "2026-05-22T12:00:00.000Z" },
  { id: "u_emp3", name: "Diego Páez", email: "diego@tecnofix.com", phone: "+54 11 5555-6666", role: "colaborador", active: false, createdAt: "2026-06-16T12:00:00.000Z" },
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
      { id: "bi_001", description: "Cambio de módulo HDMI PS5", amount: 28000 },
      { id: "bi_002", description: "Mano de obra (microsoldadura)", amount: 22000 },
      { id: "bi_003", description: "Limpieza y pasta térmica", amount: 6000 },
    ],
    timeline: [
      { id: "ev_001", status: "recibido", note: "Equipo ingresado en mostrador.", date: "2026-06-30T12:00:00.000Z" },
      { id: "ev_002", status: "en_diagnostico", note: "Se confirma puerto HDMI dañado.", date: "2026-07-01T12:00:00.000Z" },
      { id: "ev_003", status: "esperando_repuestos", note: "Se encarga módulo HDMI original.", date: "2026-07-03T12:00:00.000Z" },
    ],
    notifications: [
      { id: "nt_001", message: "Tu PS5 fue recibida. Te avisaremos con el diagnóstico.", date: "2026-06-30T12:00:00.000Z", read: true },
      { id: "nt_002", message: "Presupuesto cargado. Total estimado disponible en tu portal.", date: "2026-07-01T12:00:00.000Z", read: true },
      { id: "nt_003", message: "Estamos esperando el repuesto (módulo HDMI).", date: "2026-07-03T12:00:00.000Z", read: false },
    ],
    createdAt: "2026-06-30T12:00:00.000Z",
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
      { id: "bi_004", description: "Cambio de pasta térmica", amount: 9000 },
      { id: "bi_005", description: "Limpieza interna de disipador", amount: 7000 },
      { id: "bi_006", description: "Mano de obra", amount: 12000 },
    ],
    timeline: [
      { id: "ev_004", status: "recibido", note: "Ingreso del equipo.", date: "2026-07-02T12:00:00.000Z" },
      { id: "ev_005", status: "en_diagnostico", note: "Temperaturas muy altas en CPU.", date: "2026-07-03T12:00:00.000Z" },
      { id: "ev_006", status: "en_reparacion", note: "Limpieza y cambio de pasta.", date: "2026-07-04T12:00:00.000Z" },
      { id: "ev_007", status: "listo", note: "Probado 2hs sin apagarse. Listo para retirar.", date: "2026-07-05T12:00:00.000Z" },
    ],
    notifications: [
      { id: "nt_004", message: "Tu notebook está lista para retirar.", date: "2026-07-05T12:00:00.000Z", read: false },
    ],
    createdAt: "2026-07-02T12:00:00.000Z",
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
      { id: "ev_008", status: "recibido", note: "Equipo ingresado.", date: "2026-07-05T12:00:00.000Z" },
      { id: "ev_009", status: "en_diagnostico", note: "Revisando fuente y placa madre.", date: "2026-07-05T14:00:00.000Z" },
    ],
    notifications: [
      { id: "nt_005", message: "Recibimos tu PC, estamos haciendo el diagnóstico.", date: "2026-07-05T12:00:00.000Z", read: false },
    ],
    createdAt: "2026-07-05T12:00:00.000Z",
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
  currentUser: AuthUser | null
  isLoggedIn: boolean
  login: (user: AuthUser) => void
  logout: () => void
  users: User[]
  orders: Order[]
  employees: User[]
  states: OrderState[]
  statesLoading: boolean
  usersLoading: boolean
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

export function StoreProvider({
  children,
  initialSession = null,
}: {
  children: ReactNode
  initialSession?: AuthUser | null
}) {
  const [role, setRole] = useState<Role>(initialSession?.role ?? "colaborador")
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(initialSession)
  const [isLoggedIn, setIsLoggedIn] = useState(initialSession !== null)
  const [users, setUsers] = useState<User[]>(initialUsers)
  const [orders, setOrders] = useState<Order[]>(initialOrders)
  const [states, setStates] = useState<OrderState[]>(DEFAULT_STATES)
  const [statesLoading, setStatesLoading] = useState(true)
  const [usersLoading, setUsersLoading] = useState(true)
  const [activeClientOrderId, setActiveClientOrderId] = useState<string | null>(null)

  // Carga los estados de orden reales desde Supabase al montar el provider.
  useEffect(() => {
    let cancelled = false
    fetchOrderStates().then((remoteStates) => {
      if (cancelled) return
      if (remoteStates.length > 0) {
        setStates(remoteStates)
      }
      setStatesLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [])

  // Carga los usuarios reales desde Supabase al montar el provider.
  useEffect(() => {
    let cancelled = false
    fetchUsers().then((remoteUsers) => {
      if (cancelled) return
      if (remoteUsers.length > 0) {
        setUsers(remoteUsers)
      }
      setUsersLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const value = useMemo<StoreValue>(() => {
    const employees = users.filter((u) => u.role === "colaborador" || u.role === "admin")

    function login(user: AuthUser) {
      setCurrentUser(user)
      setRole(user.role)
      setIsLoggedIn(true)
    }

    function logout() {
      logoutAction()
      setCurrentUser(null)
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
      const tempId = uid("u")
      const tempUser: User = {
        id: tempId,
        name: input.name,
        email: input.email,
        phone: input.phone,
        role: input.role,
        active: true,
        isCorporate: input.isCorporate,
        companyName: input.companyName,
        companyLogo: input.companyLogo,
        createdAt: now(),
      }
      // Actualización optimista
      setUsers((prev) => [...prev, tempUser])
      insertUserRemote(input).then((saved) => {
        if (!saved) {
          // Revertir si falló la persistencia
          setUsers((prev) => prev.filter((u) => u.id !== tempId))
        } else {
          // Reemplazar el usuario temporal con el real (UUID de la DB)
          setUsers((prev) => prev.map((u) => (u.id === tempId ? saved : u)))
        }
      })
    }

    function updateUser(id: string, input: { name: string; email: string; phone: string; role: Role; active: boolean; isCorporate?: boolean; companyName?: string; companyLogo?: string }) {
      const previousUsers = users
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...input } : u)))
      updateUserRemote(id, input).then((ok) => {
        if (!ok) {
          setUsers(previousUsers)
          console.error(`No se pudo persistir la actualización del usuario "${id}" en la base de datos.`)
        }
      })
    }

    function toggleUserActive(id: string) {
      const previousUsers = users
      const user = users.find((u) => u.id === id)
      const newActive = !user?.active ?? false
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, active: newActive } : u)))
      toggleUserActiveRemote(id, newActive).then((ok) => {
        if (!ok) {
          setUsers(previousUsers)
          console.error(`No se pudo persistir el cambio de estado del usuario "${id}" en la base de datos.`)
        }
      })
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
      // Actualización optimista para UI instantánea
      setStates((prev) => [...prev, newState])
      insertOrderState(newState).then((saved) => {
        if (!saved) {
          // Revertir si falló la persistencia
          setStates((prev) => prev.filter((s) => s.id !== newState.id))
        }
      })
    }

    function updateState(id: string, label: string, color: string) {
      setStates((prev) => prev.map((s) => (s.id === id ? { ...s, label, color } : s)))
      updateOrderStateRemote(id, label, color).then((ok) => {
        if (!ok) console.error(`No se pudo persistir la actualización del estado "${id}" en la base de datos.`)
      })
    }

    function deleteState(id: string) {
      // No permitir eliminar si es el único estado
      if (states.length <= 1) return
      const previousStates = states
      setStates((prev) => prev.filter((s) => s.id !== id))
      deleteOrderStateRemote(id).then((ok) => {
        if (!ok) {
          // Revertir si falló (ej: hay órdenes que referencian este estado)
          setStates(previousStates)
        }
      })
    }

    function reorderStates(ids: string[]) {
      const newStates = ids
        .map((id, idx) => {
          const state = states.find((s) => s.id === id)
          return state ? { ...state, position: idx } : null
        })
        .filter(Boolean) as OrderState[]
      setStates(newStates)
      reorderOrderStatesRemote(newStates.map((s) => ({ id: s.id, position: s.position }))).then((ok) => {
        if (!ok) console.error("No se pudo persistir el reordenamiento de estados en la base de datos.")
      })
    }

    return {
      role,
      setRole,
      currentUser,
      isLoggedIn,
      login,
      logout,
      users,
      orders,
      employees,
      states,
      statesLoading,
      usersLoading,
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
  }, [role, currentUser, isLoggedIn, users, orders, states, statesLoading, usersLoading, activeClientOrderId])

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error("useStore debe usarse dentro de StoreProvider")
  return ctx
}
