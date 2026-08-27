"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { createOrderAction, fetchOrderDetailAction, fetchOrdersAction, markNotificationsReadAction } from "@/app/actions/orders"
import { fetchOrderExpirationDaysAction } from "@/app/actions/order-settings"
import { updateBudgetItemDiscountAction } from "@/app/actions/budget"
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
  budgetTotal,
  FINAL_ORDER_STATUS,
  getStatusLabel,
  isProtectedOrderState,
  PROTECTED_ORDER_STATE_POSITIONS,
} from "@/lib/types"
import { createUserWithPasswordAction, type AuthUser, type CreateUserResult, logoutAction } from "@/app/actions/auth"
import {
  fetchOrderStates,
  fetchArchivedOrderStates,
  insertOrderState,
  updateOrderStateRemote,
  deleteOrderStateRemote,
  restoreOrderStateRemote,
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
import { invalidateCachedCompanies, invalidateCachedUsers, loadCachedUsersPage } from "@/lib/admin-cache"
import { invalidateOperationsCache } from "@/lib/operations-cache"

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

const initialOrders: Order[] = []
const ORDERS_PAGE_SIZE = 50
const DEFAULT_ORDERS_CACHE_TTL_SECONDS = 120
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
  archivedStates: OrderState[]
  statesLoading: boolean
  usersLoading: boolean
  usersPage: number
  usersHasMore: boolean
  loadUsersPage: (page: number, search?: string) => Promise<void>
  ordersLoading: boolean
  ordersLoadingMore: boolean
  ordersHasMore: boolean
  orderExpirationDays: number
  setOrderExpirationDays: (days: number) => void
  refreshOrders: () => Promise<void>
  loadMoreOrders: (query?: string) => Promise<void>
  searchOrders: (query: string) => Promise<void>
  loadOrderDetail: (orderId: string) => Promise<Order | null>
  // acciones
  addOrder: (input: NewOrderInput) => Order
  advanceStatus: (orderId: string, status: OrderStatus, note?: string) => void
  reassignOrder: (orderId: string, newAssignee: string) => void
  updateOrderDetails: (orderId: string, input: OrderDetailsInput) => void
  addBudgetItem: (orderId: string, description: string, amount: number) => void
  updateBudgetItemDiscount: (orderId: string, itemId: string, discountType: "fixed" | "percentage" | null, discountValue: number | null) => void
  removeBudgetItem: (orderId: string, itemId: string) => void
  sendBudgetNotification: (orderId: string) => void
  addUser: (input: { name: string; email: string; phone: string; role: Role; password: string; companyId?: string; referralCode?: string }) => Promise<CreateUserResult>
  updateUser: (id: string, input: { name: string; email: string; phone: string; role: Role; active: boolean; companyId?: string }) => void
  toggleUserActive: (id: string) => void
  deleteUser: (id: string) => void
  markNotificationsRead: (orderId: string) => void
  // estado management
  addState: (label: string, color: string) => void
  updateState: (id: string, label: string, color: string) => void
  deleteState: (id: string) => Promise<{ success: boolean; error?: string }>
  restoreState: (id: string) => Promise<{ success: boolean; error?: string }>
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
  const [users, setUsers] = useState<User[]>([])
  const [orders, setOrdersState] = useState<Order[]>(initialOrders)
  const [states, setStates] = useState<OrderState[]>(DEFAULT_STATES)
  const [archivedStates, setArchivedStates] = useState<OrderState[]>([])
  const [statesLoading, setStatesLoading] = useState(true)
  const [usersLoading, setUsersLoading] = useState(true)
  const [usersPage, setUsersPage] = useState(0)
  const [usersHasMore, setUsersHasMore] = useState(false)
  const [ordersLoading, setOrdersLoading] = useState(true)
  const [ordersLoadingMore, setOrdersLoadingMore] = useState(false)
  const [ordersHasMore, setOrdersHasMore] = useState(true)
  const [orderExpirationDays, setOrderExpirationDays] = useState(30)
  const ordersRef = useRef(orders)
  useEffect(() => {
    ordersRef.current = orders
  }, [orders])
  const ordersCacheKey = currentUser && isLoggedIn ? getOrdersCacheKey(currentUser.id, currentUser.role) : null
  const loadOrderDetail = useCallback(async (orderId: string): Promise<Order | null> => {
    const cachedDetail = ordersRef.current.find((order) => order.id === orderId)
    if (cachedDetail?.fault) return cachedDetail

    const detail = await fetchOrderDetailAction(orderId)
    if (detail) {
      setOrdersState((previous) => previous.map((order) => (order.id === detail.id ? detail : order)))
    }
    return detail
  }, [])
  const searchOrders = useCallback(async (query: string): Promise<void> => {
    setOrdersLoading(true)
    try {
      const results = await fetchOrdersAction(0, ORDERS_PAGE_SIZE, query)
      setOrdersState(results)
      setOrdersHasMore(results.length === ORDERS_PAGE_SIZE)
    } catch (error: unknown) {
      console.error("No se pudieron buscar las órdenes:", error)
    } finally {
      setOrdersLoading(false)
    }
  }, [])

  // Carga los estados de orden reales desde Supabase al montar el provider.
  useEffect(() => {
    let cancelled = false
    Promise.all([fetchOrderStates(), fetchArchivedOrderStates()]).then(([remoteStates, remoteArchivedStates]) => {
      if (cancelled) return
      setStates(remoteStates)
      setArchivedStates(remoteArchivedStates)
      setStatesLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!currentUser || !isLoggedIn) return
    let cancelled = false
    fetchOrderExpirationDaysAction().then((days) => {
      if (!cancelled) setOrderExpirationDays(days)
    })
    return () => {
      cancelled = true
    }
  }, [currentUser, isLoggedIn])

  const loadUsersPage = useCallback(async (page: number, search = "") => {
    if (!currentUser || !isLoggedIn || currentUser.role === "cliente" || page < 0) return
    setUsersLoading(true)
    try {
      const result = await loadCachedUsersPage(
        currentUser.id,
        page,
        search,
        () => fetchUsersAction(page, undefined, search),
      )
      setUsers(result.users)
      setUsersPage(page)
      setUsersHasMore(result.hasMore)
    } catch (error: unknown) {
      console.error("No se pudieron cargar los usuarios:", error)
    } finally {
      setUsersLoading(false)
    }
  }, [currentUser, isLoggedIn])

  // Carga los usuarios reales solo para personal autorizado.
  useEffect(() => {
    let cancelled = false
    if (!currentUser || !isLoggedIn || currentUser.role === "cliente") {
      Promise.resolve().then(() => {
        if (cancelled) return
        setUsers([])
        setUsersLoading(false)
      })
      return () => {
        cancelled = true
      }
    }

    Promise.resolve().then(() => {
      if (!cancelled) void loadUsersPage(0)
    })
    return () => {
      cancelled = true
    }
  }, [currentUser, isLoggedIn, loadUsersPage])

  // Carga solo las órdenes autorizadas para la sesión actual y reutiliza la caché fresca.
  useEffect(() => {
    let cancelled = false
    if (!currentUser || !isLoggedIn || !ordersCacheKey) {
      Promise.resolve().then(() => {
        if (cancelled) return
        setOrdersState([])
        setOrdersLoading(false)
        setOrdersHasMore(false)
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
        setOrdersHasMore(cachedOrders.length >= ORDERS_PAGE_SIZE)
      } else {
        setOrdersLoading(true)
      }
    })

    const refreshOrders = () => {
      revalidateOrdersCache(ordersCacheKey, fetchOrdersAction).then((remoteOrders) => {
        if (cancelled) return
        setOrdersState(remoteOrders)
        setOrdersLoading(false)
        setOrdersHasMore(remoteOrders.length === ORDERS_PAGE_SIZE)
      }).catch((error: unknown) => {
        if (cancelled) return
        console.error("No se pudieron cargar las órdenes:", error)
        setOrdersLoading(false)
      })
    }

    if (isOrdersCacheStale(ordersCacheKey, ORDERS_CACHE_TTL_MS)) {
      refreshOrders()
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && isOrdersCacheStale(ordersCacheKey, ORDERS_CACHE_TTL_MS)) {
        refreshOrders()
      }
    }
    document.addEventListener("visibilitychange", handleVisibilityChange)

    return () => {
      cancelled = true
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [currentUser, isLoggedIn, ordersCacheKey])

  const value = useMemo<StoreValue>(() => {
    const employees = users.filter((u) => u.role === "colaborador" || u.role === "presupuestador" || u.role === "admin")

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
      if (currentUser) {
        invalidateCachedUsers(currentUser.id)
        invalidateCachedCompanies(currentUser.id)
      }
      setCurrentUser(null)
      setIsLoggedIn(false)
      setOrdersState([])
    }

    function addOrder(input: NewOrderInput): Order {
      const tempId = uid("o")
      const tempCode = `TEMP-${tempId}`
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
        deviceSerial: input.deviceSerial,
        fault: input.fault,
        status: "recibido",
        assignedTo: input.assignedTo?.trim() || null,
        budgetAssignedTo: null,
        budgetDecision: null,
        budgetDecisionNote: null,
        budgetSubmittedAt: null,
        budgetDecidedAt: null,
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
          if (currentUser) invalidateOperationsCache(currentUser.id)
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
        prev.flatMap((o) => {
          if (o.id !== orderId) return [o]
          if (status === FINAL_ORDER_STATUS) return []
          return [{
            ...o,
            status,
            timeline: [...o.timeline, { id: uid("ev"), status, note, date: now() }],
            notifications: [
              ...o.notifications,
              { id: uid("nt"), message: `Estado actualizado: ${statusLabel}.${note ? ` ${note}` : ""}`, date: now(), read: false },
            ],
          }]
        }),
      )

      // Persistir en la base de datos
      updateOrderStatusRemote(orderId, status, statusLabel, note).then((ok) => {
        if (!ok) {
          // Revertir si falló
          setOrders(previousOrders)
          console.error(`No se pudo actualizar el estado de la orden "${orderId}" en la base de datos.`)
        } else {
          if (currentUser) invalidateOperationsCache(currentUser.id)
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
        } else {
          if (currentUser) invalidateOperationsCache(currentUser.id)
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
      const tempItem: BudgetItem = { id: uid("bi"), description, amount, discountType: null, discountValue: null }

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

    function updateBudgetItemDiscount(
      orderId: string,
      itemId: string,
      discountType: "fixed" | "percentage" | null,
      discountValue: number | null,
    ) {
      const previousOrders = orders
      setOrders((prev) => prev.map((order) => order.id !== orderId ? order : {
        ...order,
        budget: order.budget.map((item) => item.id !== itemId ? item : { ...item, discountType, discountValue }),
      }))

      updateBudgetItemDiscountAction(itemId, discountType, discountValue).then((ok) => {
        if (!ok) {
          setOrders(previousOrders)
          console.error(`No se pudo actualizar el descuento del item "${itemId}" en la base de datos.`)
          return
        }
        if (currentUser) invalidateOperationsCache(currentUser.id)
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

      const total = budgetTotal(order)
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

    async function addUser(input: { name: string; email: string; phone: string; role: Role; password: string; companyId?: string; referralCode?: string }): Promise<CreateUserResult> {
      const tempId = uid("u")
      const tempUser: User = {
        id: tempId,
        name: input.name,
        email: input.email,
        phone: input.phone,
        role: input.role,
        active: true,
        companyId: input.companyId,
        referralCode: "",
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
        if (currentUser) {
          invalidateCachedUsers(currentUser.id)
          invalidateCachedCompanies(currentUser.id)
        }
        return result
      } catch (error) {
        setUsers((prev) => prev.filter((u) => u.id !== tempId))
        console.error("No se pudo crear el usuario en la base de datos:", error)
        return { success: false, error: "No se pudo conectar con el servidor." }
      }
    }

    function updateUser(id: string, input: { name: string; email: string; phone: string; role: Role; active: boolean; companyId?: string }) {
      const previousUsers = users
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...input } : u)))
      updateUserRemote(id, input).then((ok) => {
        if (!ok) {
          setUsers(previousUsers)
          console.error(`No se pudo persistir la actualización del usuario "${id}" en la base de datos.`)
        } else if (currentUser) {
          invalidateCachedUsers(currentUser.id)
          invalidateCachedCompanies(currentUser.id)
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
        } else if (currentUser) {
          invalidateCachedUsers(currentUser.id)
          invalidateCachedCompanies(currentUser.id)
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
        } else if (currentUser) {
          invalidateCachedUsers(currentUser.id)
          invalidateCachedCompanies(currentUser.id)
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
      const newState: OrderState = { id: uid("st"), label, color, position: maxPosition + 1, isActive: true }
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

    async function deleteState(id: string): Promise<{ success: boolean; error?: string }> {
      if (isProtectedOrderState(id)) {
        return { success: false, error: "Este estado es estructural y no puede archivarse." }
      }
      // No permitir eliminar si es el único estado
      if (states.length <= 1) return { success: false, error: "Debe existir al menos un estado." }
      const previousStates = states
      setStates((prev) => prev.filter((s) => s.id !== id))
      const result = await deleteOrderStateRemote(id)
      if (!result.success) {
        setStates(previousStates)
      } else {
        const archivedState = previousStates.find((state) => state.id === id)
        if (archivedState) setArchivedStates((prev) => [...prev, { ...archivedState, isActive: false }])
      }
      return result
    }

    async function restoreState(id: string): Promise<{ success: boolean; error?: string }> {
      const archivedState = archivedStates.find((state) => state.id === id)
      if (!archivedState) return { success: false, error: "No se encontró el estado archivado." }
      const result = await restoreOrderStateRemote(id)
      if (!result.success) return result

      const maxPosition = Math.max(-1, ...states.map((state) => state.position))
      setArchivedStates((prev) => prev.filter((state) => state.id !== id))
      setStates((prev) => [...prev, { ...archivedState, isActive: true, position: maxPosition + 1 }])
      return result
    }

    function reorderStates(ids: string[]) {
      const protectedStatePositionsAreValid = Object.entries(PROTECTED_ORDER_STATE_POSITIONS).every(([id, position]) =>
        ids[position] === id,
      )
      if (!protectedStatePositionsAreValid) {
        console.error("No se pueden cambiar las posiciones de los estados estructurales.")
        return
      }

      const previousStates = states
      const newStates = ids
        .map((id, idx) => {
          const state = states.find((s) => s.id === id)
          return state ? { ...state, position: idx } : null
        })
        .filter(Boolean) as OrderState[]
      setStates(newStates)
      reorderOrderStatesRemote(newStates.map((s) => ({ id: s.id, position: s.position }))).then((ok) => {
        if (!ok) {
          setStates(previousStates)
          console.error("No se pudo persistir el reordenamiento de estados en la base de datos.")
        }
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
      orderExpirationDays,
      setOrderExpirationDays,
      employees,
      states,
      archivedStates,
      statesLoading,
      usersLoading,
      usersPage,
      usersHasMore,
      loadUsersPage,
      ordersLoading,
      ordersLoadingMore,
      ordersHasMore,
      refreshOrders,
      loadMoreOrders: async (query = "") => {
        if (!ordersCacheKey || ordersLoadingMore || !ordersHasMore) return
        setOrdersLoadingMore(true)
        try {
          const nextOrders = await fetchOrdersAction(orders.length, ORDERS_PAGE_SIZE, query)
          setOrdersState((previous) => [...previous, ...nextOrders])
          setOrdersCache(ordersCacheKey, [...orders, ...nextOrders])
          setOrdersHasMore(nextOrders.length === ORDERS_PAGE_SIZE)
        } catch (error: unknown) {
          console.error("No se pudieron cargar más órdenes:", error)
        } finally {
          setOrdersLoadingMore(false)
        }
      },
      searchOrders,
      loadOrderDetail,
      addOrder,
      advanceStatus,
      reassignOrder,
      updateOrderDetails,
      addBudgetItem,
      updateBudgetItemDiscount,
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
      restoreState,
      reorderStates,
    }
  }, [role, currentUser, isLoggedIn, users, orders, orderExpirationDays, states, archivedStates, statesLoading, usersLoading, usersPage, usersHasMore, ordersLoading, ordersLoadingMore, ordersHasMore, ordersCacheKey, searchOrders, loadOrderDetail, loadUsersPage])

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error("useStore debe usarse dentro de StoreProvider")
  return ctx
}
