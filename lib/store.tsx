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
  deleteUserRemote,
} from "@/lib/queries/users"
import {
  fetchOrders,
  insertOrderRemote,
  updateOrderStatusRemote,
  updateOrderAssigneeRemote,
  insertBudgetItemRemote,
  deleteBudgetItemRemote,
  insertNotificationRemote,
  markNotificationsReadRemote,
} from "@/lib/queries/orders"

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

const initialOrders: Order[] = []

export interface NewOrderInput {
  clientId: string | null
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
  ordersLoading: boolean
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
  deleteUser: (id: string) => void
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
  const [ordersLoading, setOrdersLoading] = useState(true)
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

  // Carga las órdenes reales desde Supabase al montar el provider.
  useEffect(() => {
    let cancelled = false
    fetchOrders().then((remoteOrders) => {
      if (cancelled) return
      if (remoteOrders.length > 0) {
        setOrders(remoteOrders)
      }
      setOrdersLoading(false)
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
      const tempId = uid("o")
      const tempCode = `TF-TEMP-${tempId}`
      const tempOrder: Order = {
        id: tempId,
        code: tempCode,
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
      // Actualización optimista
      setOrders((prev) => [tempOrder, ...prev])

      // Persistir en la base de datos
      insertOrderRemote({
        clientId: input.clientId,
        clientName: input.clientName,
        clientPhone: input.clientPhone,
        clientEmail: input.clientEmail,
        deviceType: input.deviceType,
        deviceBrand: input.deviceBrand,
        deviceModel: input.deviceModel,
        fault: input.fault,
        assignedTo: input.assignedTo,
      }).then((saved) => {
        if (!saved) {
          // Revertir si falló la persistencia
          setOrders((prev) => prev.filter((o) => o.id !== tempId))
          console.error("No se pudo crear la orden en la base de datos.")
        } else {
          // Reemplazar la orden temporal con la real (UUID de la DB)
          setOrders((prev) => prev.map((o) => (o.id === tempId ? saved : o)))
        }
      })

      return tempOrder
    }

    function advanceStatus(orderId: string, status: OrderStatus, note?: string) {
      const statusLabel = getStatusLabel(status, states)
      const previousOrders = orders

      // Actualización optimista
      setOrders((prev) =>
        prev.map((o) => {
          if (o.id !== orderId) return o
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

      // Persistir en la base de datos
      updateOrderStatusRemote(orderId, status, statusLabel, note).then((ok) => {
        if (!ok) {
          // Revertir si falló
          setOrders(previousOrders)
          console.error(`No se pudo actualizar el estado de la orden "${orderId}" en la base de datos.`)
        }
      })
    }

    function reassignOrder(orderId: string, newAssignee: string) {
      const previousOrders = orders

      // Actualización optimista
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

      // Persistir en la base de datos
      updateOrderAssigneeRemote(orderId, newAssignee).then((ok) => {
        if (!ok) {
          // Revertir si falló
          setOrders(previousOrders)
          console.error(`No se pudo reasignar la orden "${orderId}" en la base de datos.`)
        }
      })
    }

    function addBudgetItem(orderId: string, description: string, amount: number) {
      const tempItem: BudgetItem = { id: uid("bi"), description, amount }

      // Actualización optimista
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, budget: [...o.budget, tempItem] } : o)))

      // Persistir en la base de datos
      insertBudgetItemRemote(orderId, description, amount).then((saved) => {
        if (!saved) {
          // Revertir si falló
          setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, budget: o.budget.filter((b) => b.id !== tempItem.id) } : o)))
          console.error(`No se pudo agregar el item de presupuesto a la orden "${orderId}" en la base de datos.`)
        } else {
          // Reemplazar el item temporal con el real (UUID de la DB)
          setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, budget: o.budget.map((b) => b.id === tempItem.id ? saved : b) } : o)))
        }
      })
    }

    function removeBudgetItem(orderId: string, itemId: string) {
      const previousOrders = orders

      // Actualización optimista
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, budget: o.budget.filter((b) => b.id !== itemId) } : o)),
      )

      // Persistir en la base de datos
      deleteBudgetItemRemote(itemId).then((ok) => {
        if (!ok) {
          // Revertir si falló
          setOrders(previousOrders)
          console.error(`No se pudo eliminar el item de presupuesto "${itemId}" en la base de datos.`)
        }
      })
    }

    function sendBudgetNotification(orderId: string) {
      const order = orders.find((o) => o.id === orderId)
      if (!order) return

      const total = order.budget.reduce((s, b) => s + b.amount, 0)
      const message = `Presupuesto actualizado disponible en tu portal. Total: ${formatCurrency(total)}.`
      const tempNotif: AppNotification = {
        id: uid("nt"),
        message,
        date: now(),
        read: false,
      }

      // Actualización optimista
      setOrders((prev) =>
        prev.map((o) => {
          if (o.id !== orderId) return o
          return { ...o, notifications: [...o.notifications, tempNotif] }
        }),
      )

      // Persistir en la base de datos
      insertNotificationRemote(orderId, message).then((saved) => {
        if (!saved) {
          // Revertir si falló
          setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, notifications: o.notifications.filter((n) => n.id !== tempNotif.id) } : o)))
          console.error(`No se pudo crear la notificación de presupuesto para la orden "${orderId}" en la base de datos.`)
        } else {
          // Reemplazar la notificación temporal con la real
          setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, notifications: o.notifications.map((n) => n.id === tempNotif.id ? saved : n) } : o)))
        }
      })
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
      const newActive = !(user?.active ?? false)
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, active: newActive } : u)))
      toggleUserActiveRemote(id, newActive).then((ok) => {
        if (!ok) {
          setUsers(previousUsers)
          console.error(`No se pudo persistir el cambio de estado del usuario "${id}" en la base de datos.`)
        }
      })
    }

    function deleteUser(id: string) {
      const previousUsers = users
      setUsers((prev) => prev.filter((u) => u.id !== id))
      deleteUserRemote(id).then((ok) => {
        if (!ok) {
          setUsers(previousUsers)
          console.error(`No se pudo eliminar el usuario "${id}" en la base de datos.`)
        }
      })
    }

    function markNotificationsRead(orderId: string) {
      const previousOrders = orders

      // Actualización optimista
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId ? { ...o, notifications: o.notifications.map((n) => ({ ...n, read: true })) } : o,
        ),
      )

      // Persistir en la base de datos
      markNotificationsReadRemote(orderId).then((ok) => {
        if (!ok) {
          // Revertir si falló
          setOrders(previousOrders)
          console.error(`No se pudo marcar las notificaciones como leídas para la orden "${orderId}" en la base de datos.`)
        }
      })
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
      ordersLoading,
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
      deleteUser,
      markNotificationsRead,
      addState,
      updateState,
      deleteState,
      reorderStates,
    }
  }, [role, currentUser, isLoggedIn, users, orders, states, statesLoading, usersLoading, ordersLoading, activeClientOrderId])

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error("useStore debe usarse dentro de StoreProvider")
  return ctx
}
