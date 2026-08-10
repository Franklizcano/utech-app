"use client"

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import { createOrderAction, fetchOrdersAction, markNotificationsReadAction } from "@/app/actions/orders"
import { fetchUsersAction } from "@/app/actions/users"
import {
  type AppNotification,
  type BudgetItem,
  type Order,
  type OrderCreationInput,
  type OrderDetailsInput,
  type OrderStatus,
  type OrderState,
  type Role,
  type User,
  DEFAULT_STATES,
  getStatusLabel,
} from "@/lib/types"
import { createUserWithPasswordAction, type AuthUser, type CreateUserResult, logoutAction } from "@/app/actions/auth"
import {
  fetchOrderStates,
  insertOrderState,
  updateOrderStateRemote,
  deleteOrderStateRemote,
  reorderOrderStatesRemote,
} from "@/lib/queries/order-states"
import {
  updateUserRemote,
  toggleUserActiveRemote,
  deleteUserRemote,
} from "@/lib/queries/users"
import {
  updateOrderStatusRemote,
  updateOrderAssigneeRemote,
  updateOrderDetailsRemote,
  insertBudgetItemRemote,
  deleteBudgetItemRemote,
  insertNotificationRemote,
} from "@/lib/queries/orders"
import {
  clearOrdersCache,
  getOrdersCache,
  getOrdersCacheKey,
  isOrdersCacheStale,
  revalidateOrdersCache,
  setOrdersCache,
} from "@/lib/order-cache"

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
const DEFAULT_ORDERS_CACHE_TTL_SECONDS = 60
const configuredOrdersCacheTtlSeconds = Number(process.env.NEXT_PUBLIC_ORDERS_CACHE_TTL_SECONDS)
const ORDERS_CACHE_TTL_MS =
  Number.isFinite(configuredOrdersCacheTtlSeconds) && configuredOrdersCacheTtlSeconds > 0
    ? configuredOrdersCacheTtlSeconds * 1000
    : DEFAULT_ORDERS_CACHE_TTL_SECONDS * 1000

export type NewOrderInput = OrderCreationInput

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
  refreshOrders: () => Promise<void>
  // acciones
  addOrder: (input: NewOrderInput) => Order
  advanceStatus: (orderId: string, status: OrderStatus, note?: string) => void
  reassignOrder: (orderId: string, newAssignee: string) => void
  updateOrderDetails: (orderId: string, input: OrderDetailsInput) => void
  addBudgetItem: (orderId: string, description: string, amount: number) => void
  removeBudgetItem: (orderId: string, itemId: string) => void
  sendBudgetNotification: (orderId: string) => void
  addUser: (input: { name: string; email: string; phone: string; role: Role; password: string; isCorporate?: boolean; companyName?: string; companyLogo?: string }) => Promise<CreateUserResult>
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
  const [users, setUsers] = useState<User[]>(initialSession?.role === "cliente" ? [] : initialUsers)
  const [orders, setOrdersState] = useState<Order[]>(initialOrders)
  const [states, setStates] = useState<OrderState[]>(DEFAULT_STATES)
  const [statesLoading, setStatesLoading] = useState(true)
  const [usersLoading, setUsersLoading] = useState(true)
  const [ordersLoading, setOrdersLoading] = useState(true)
  const ordersCacheKey = currentUser && isLoggedIn ? getOrdersCacheKey(currentUser.id, currentUser.role) : null

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

  // Carga los usuarios reales solo para personal autorizado.
  useEffect(() => {
    let cancelled = false
    if (!currentUser || !isLoggedIn || currentUser.role === "cliente") {
      Promise.resolve().then(() => {
        if (cancelled) return
        setUsers(currentUser?.role === "cliente" ? [] : initialUsers)
        setUsersLoading(false)
      })
      return () => {
        cancelled = true
      }
    }

    Promise.resolve().then(() => {
      if (!cancelled) setUsersLoading(true)
    })
    fetchUsersAction().then((remoteUsers) => {
      if (cancelled) return
      setUsers(remoteUsers)
      setUsersLoading(false)
    }).catch((error: unknown) => {
      if (cancelled) return
      console.error("No se pudieron cargar los usuarios:", error)
      setUsersLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [currentUser, isLoggedIn])

  // Carga solo las órdenes autorizadas para la sesión actual y reutiliza la caché fresca.
  useEffect(() => {
    let cancelled = false
    if (!currentUser || !isLoggedIn || !ordersCacheKey) {
      Promise.resolve().then(() => {
        if (cancelled) return
        setOrdersState([])
        setOrdersLoading(false)
      })
      return () => {
        cancelled = true
      }
    }

    const cachedOrders = getOrdersCache(ordersCacheKey)
    Promise.resolve().then(() => {
      if (cancelled) return
      if (cachedOrders) {
        setOrdersState(cachedOrders)
        setOrdersLoading(false)
      } else {
        setOrdersLoading(true)
      }
    })

    const refreshOrders = () => {
      revalidateOrdersCache(ordersCacheKey, fetchOrdersAction).then((remoteOrders) => {
        if (cancelled) return
        setOrdersState(remoteOrders)
        setOrdersLoading(false)
      }).catch((error: unknown) => {
        if (cancelled) return
        console.error("No se pudieron cargar las órdenes:", error)
        setOrdersLoading(false)
      })
    }

    if (isOrdersCacheStale(ordersCacheKey, ORDERS_CACHE_TTL_MS)) {
      refreshOrders()
    }

    const intervalId = window.setInterval(refreshOrders, ORDERS_CACHE_TTL_MS)
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && isOrdersCacheStale(ordersCacheKey, ORDERS_CACHE_TTL_MS)) {
        refreshOrders()
      }
    }
    document.addEventListener("visibilitychange", handleVisibilityChange)

    return () => {
      cancelled = true
      window.clearInterval(intervalId)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [currentUser, isLoggedIn, ordersCacheKey])

  const value = useMemo<StoreValue>(() => {
    const employees = users.filter((u) => u.role === "colaborador" || u.role === "admin")

    function setOrders(updater: Order[] | ((previous: Order[]) => Order[])) {
      setOrdersState((previous) => {
        const next = typeof updater === "function" ? updater(previous) : updater
        if (ordersCacheKey) setOrdersCache(ordersCacheKey, next)
        return next
      })
    }

    function login(user: AuthUser) {
      setCurrentUser(user)
      setRole(user.role)
      setIsLoggedIn(true)
    }

    function logout() {
      logoutAction()
      if (ordersCacheKey) clearOrdersCache(ordersCacheKey)
      setCurrentUser(null)
      setIsLoggedIn(false)
      setOrdersState([])
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
        assignedTo: input.assignedTo?.trim() || null,
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
      createOrderAction(input).then((result) => {
        if (!result.success || !result.order) {
          // Revertir si falló la persistencia
          setOrders((prev) => prev.filter((o) => o.id !== tempId))
          console.error(result.error ?? "No se pudo crear la orden en la base de datos.")
        } else {
          // Reemplazar la orden temporal con la real (UUID de la DB)
          setOrders((prev) => prev.map((o) => (o.id === tempId ? result.order! : o)))
        }
      }).catch((error: unknown) => {
        setOrders((prev) => prev.filter((o) => o.id !== tempId))
        console.error("No se pudo crear la orden en la base de datos:", error)
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

    function updateOrderDetails(orderId: string, input: OrderDetailsInput) {
      const previousOrders = orders

      // Actualización optimista
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, ...input } : o)))

      // Persistir en la base de datos
      updateOrderDetailsRemote(orderId, input).then((ok) => {
        if (!ok) {
          // Revertir si falló
          setOrders(previousOrders)
          console.error(`No se pudieron actualizar los datos de reparación de la orden "${orderId}" en la base de datos.`)
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

    async function addUser(input: { name: string; email: string; phone: string; role: Role; password: string; isCorporate?: boolean; companyName?: string; companyLogo?: string }): Promise<CreateUserResult> {
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

      try {
        const result = await createUserWithPasswordAction(input)
        if (!result.success || !result.user) {
          // Revertir si falló la persistencia
          setUsers((prev) => prev.filter((u) => u.id !== tempId))
          return result
        }

        // Reemplazar el usuario temporal con el real (UUID de la DB)
        setUsers((prev) => prev.map((u) => (u.id === tempId ? result.user! : u)))
        return result
      } catch (error) {
        setUsers((prev) => prev.filter((u) => u.id !== tempId))
        console.error("No se pudo crear el usuario en la base de datos:", error)
        return { success: false, error: "No se pudo conectar con el servidor." }
      }
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
      markNotificationsReadAction(orderId).then((ok) => {
        if (!ok) {
          // Revertir si falló
          setOrders(previousOrders)
          console.error(`No se pudo marcar las notificaciones como leídas para la orden "${orderId}" en la base de datos.`)
        }
      })
    }

    async function refreshOrders() {
      if (!ordersCacheKey) return

      try {
        const remoteOrders = await revalidateOrdersCache(ordersCacheKey, fetchOrdersAction)
        setOrdersState(remoteOrders)
        setOrdersLoading(false)
      } catch (error: unknown) {
        console.error("No se pudieron actualizar las órdenes:", error)
      }
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
      refreshOrders,
      addOrder,
      advanceStatus,
      reassignOrder,
      updateOrderDetails,
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
  }, [role, currentUser, isLoggedIn, users, orders, states, statesLoading, usersLoading, ordersLoading, ordersCacheKey])

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error("useStore debe usarse dentro de StoreProvider")
  return ctx
}
