"use client"

import { useState } from "react"
import { Plus, Trash2, Send, ArrowRight, Phone, Mail, UserRound, MoreVertical, Pencil, X, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { StatusBadge } from "@/components/status-badge"
import { RepairTimeline } from "@/components/repair-timeline"
import { ReassignDialog } from "@/components/employee/reassign-dialog"
import { sendBudgetToClientAction, submitOrderForBudgetAction } from "@/app/actions/budget"
import { useStore, formatCurrency } from "@/lib/store"
import { invalidateOperationsCache } from "@/lib/operations-cache"
import { budgetDiscountTotal, budgetItemDiscountAmount, budgetItemTotal, budgetSubtotal, budgetTotal, getStatusFlow, getStatusLabel, type DeviceType, type Order, type OrderStatus } from "@/lib/types"
import Image from "next/image"

const DEVICE_TYPES: DeviceType[] = ["PC", "Notebook", "PlayStation", "Xbox", "Nintendo", "Otro"]

export function OrderDetail({ order }: { order: Order }) {
  const { role, currentUser, addBudgetItem, updateBudgetItemDiscount, removeBudgetItem, advanceStatus, updateOrderDetails, states, users, refreshOrders } = useStore()
  const [desc, setDesc] = useState("")
  const [amount, setAmount] = useState("")
  const [nextStatus, setNextStatus] = useState<OrderStatus>(order.status)
  const [statusNote, setStatusNote] = useState("")
  const [reassignOpen, setReassignOpen] = useState(false)
  const [editingDetails, setEditingDetails] = useState(false)
  const [draftDeviceType, setDraftDeviceType] = useState<DeviceType>(order.deviceType)
  const [draftDeviceBrand, setDraftDeviceBrand] = useState(order.deviceBrand)
  const [draftDeviceModel, setDraftDeviceModel] = useState(order.deviceModel)
  const [draftDeviceSerial, setDraftDeviceSerial] = useState(order.deviceSerial ?? "")
  const [draftFault, setDraftFault] = useState(order.fault)
  const [submittingBudget, setSubmittingBudget] = useState(false)
  const [discountDrafts, setDiscountDrafts] = useState<Record<string, string>>({})

  const total = budgetTotal(order)
  const canManageBudget = role === "admin" || role === "presupuestador"
  const statusFlow = getStatusFlow(states).filter((status) => canManageBudget || !status.startsWith("presupuesto") && status !== "pendiente_presupuesto")
  const client = users.find((u) => u.id === order.clientId)
  const detailsChanged =
    draftDeviceType !== order.deviceType ||
    draftDeviceBrand !== order.deviceBrand ||
    draftDeviceModel !== order.deviceModel ||
    draftDeviceSerial !== (order.deviceSerial ?? "") ||
    draftFault !== order.fault

  function handleAddItem(e: React.FormEvent) {
    e.preventDefault()
    const value = Number.parseFloat(amount)
    if (!desc.trim() || Number.isNaN(value) || value <= 0) return
    addBudgetItem(order.id, desc.trim(), value)
    setDesc("")
    setAmount("")
  }

  function handleAdvance() {
    if (nextStatus === order.status) return
    advanceStatus(order.id, nextStatus, statusNote.trim() || undefined)
    setStatusNote("")
  }

  function handleStartEditingDetails() {
    setDraftDeviceType(order.deviceType)
    setDraftDeviceBrand(order.deviceBrand)
    setDraftDeviceModel(order.deviceModel)
    setDraftDeviceSerial(order.deviceSerial ?? "")
    setDraftFault(order.fault)
    setEditingDetails(true)
  }

  function handleCancelEditingDetails() {
    setDraftDeviceType(order.deviceType)
    setDraftDeviceBrand(order.deviceBrand)
    setDraftDeviceModel(order.deviceModel)
    setDraftDeviceSerial(order.deviceSerial ?? "")
    setDraftFault(order.fault)
    setEditingDetails(false)
  }

  function handleSaveDetails() {
    const fault = draftFault.trim()
    if (!fault || !detailsChanged) return

    updateOrderDetails(order.id, {
      deviceType: draftDeviceType,
      deviceBrand: draftDeviceBrand.trim(),
      deviceModel: draftDeviceModel.trim(),
      deviceSerial: draftDeviceSerial.trim() || null,
      fault,
    })
    setEditingDetails(false)
  }

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            {client?.companyId && client.company?.logo && (
              <Image src={client.company.logo} alt={client.company.name} width={48} height={48} unoptimized className="h-12 w-12 rounded object-contain" />
            )}
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold text-foreground">{order.clientName}</h3>
                <span className="rounded-md bg-secondary px-2 py-0.5 font-mono text-xs text-secondary-foreground">
                  {order.code}
                </span>
              </div>
              {client?.companyId && client.company?.name && (
                <p className="mt-0.5 text-sm text-muted-foreground">{client.company.name}</p>
              )}
              {editingDetails ? (
                <div className="mt-3 space-y-2">
                  <div className="grid gap-2 sm:grid-cols-4">
                    <div className="space-y-1">
                      <Label htmlFor="order-device-type" className="text-xs">
                        Tipo
                      </Label>
                      <Select value={draftDeviceType} onValueChange={(value) => setDraftDeviceType(value as DeviceType)}>
                        <SelectTrigger id="order-device-type" className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {DEVICE_TYPES.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="order-device-brand" className="text-xs">
                        Marca
                      </Label>
                      <Input
                        id="order-device-brand"
                        value={draftDeviceBrand}
                        onChange={(e) => setDraftDeviceBrand(e.target.value)}
                        placeholder="Ej: Sony"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="order-device-model" className="text-xs">
                        Modelo
                      </Label>
                      <Input
                        id="order-device-model"
                        value={draftDeviceModel}
                        onChange={(e) => setDraftDeviceModel(e.target.value)}
                        placeholder="Ej: PS5 Slim"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="order-device-serial" className="text-xs">
                        Serial
                      </Label>
                      <Input
                        id="order-device-serial"
                        value={draftDeviceSerial}
                        onChange={(e) => setDraftDeviceSerial(e.target.value)}
                        placeholder="Ej: SN123456789"
                        autoComplete="off"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={handleCancelEditingDetails}
                      aria-label="Cancelar edición de datos de reparación"
                      title="Cancelar"
                    >
                      <X />
                    </Button>
                    <Button
                      type="button"
                      size="icon-sm"
                      onClick={handleSaveDetails}
                      disabled={!detailsChanged || !draftFault.trim()}
                      aria-label="Guardar datos de reparación"
                      title="Aplicar cambios"
                    >
                      <Check />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                  <span>
                    {order.deviceType} · {order.deviceBrand} {order.deviceModel}
                    {order.deviceSerial && ` · Serial: ${order.deviceSerial}`}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="size-6"
                    onClick={handleStartEditingDetails}
                    aria-label="Editar datos de reparación"
                    title="Editar datos de reparación"
                  >
                    <Pencil />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={order.status} />
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8" />}>
              <MoreVertical className="h-4 w-4" />
              <span className="sr-only">Abrir menú de acciones</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setReassignOpen(true)}>
                <ArrowRight className="mr-2 h-4 w-4" />
                <span>Reasignar técnico</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
        {order.clientPhone && (
          <span className="inline-flex items-center gap-1.5">
            <Phone className="size-3.5" /> {order.clientPhone}
          </span>
        )}
        {order.clientEmail && (
          <span className="inline-flex items-center gap-1.5">
            <Mail className="size-3.5" /> {order.clientEmail}
          </span>
        )}
        <span className="inline-flex items-center gap-1.5">
          <UserRound className="size-3.5" /> Colaborador: {order.assignedTo ?? "Sin asignar"}
        </span>
      </div>

      <div className="rounded-lg border border-border bg-secondary/30 p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Falla reportada</p>
        {editingDetails ? (
          <Textarea
            id="order-fault"
            value={draftFault}
            onChange={(e) => setDraftFault(e.target.value)}
            className="mt-2"
            rows={3}
            aria-label="Falla reportada"
          />
        ) : (
          <p className="mt-1 text-sm text-foreground">{order.fault}</p>
        )}
      </div>

      <ReassignDialog order={order} open={reassignOpen} onOpenChange={setReassignOpen} />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Presupuesto */}
        {canManageBudget ? <div className="space-y-4">
          <h4 className="text-sm font-semibold text-foreground">Presupuesto</h4>

          <div className="space-y-2">
            {order.budget.length === 0 && (
              <p className="rounded-md border border-dashed border-border px-3 py-4 text-center text-sm text-muted-foreground">
                Todavía no hay ítems cargados.
              </p>
            )}
            {order.budget.map((item) => (
              <div key={item.id} className="space-y-2 rounded-md border border-border bg-card px-3 py-3">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm text-foreground">{item.description}</span>
                  <span className="text-sm font-medium tabular-nums text-foreground">{formatCurrency(item.amount)}</span>
                </div>
                <div className="flex flex-wrap items-end gap-2 border-t border-border pt-2">
                  <div className="min-w-40 flex-1 space-y-1">
                    <Label className="text-[11px] text-muted-foreground">Descuento</Label>
                    <Select
                      value={item.discountType ?? "none"}
                      onValueChange={(value) => {
                        const nextType = value === "none" ? null : value as "fixed" | "percentage"
                        const nextValue = nextType === null ? null : item.discountType === nextType ? item.discountValue ?? 0 : 0
                        setDiscountDrafts((current) => ({ ...current, [item.id]: nextValue === null ? "" : String(nextValue) }))
                        updateBudgetItemDiscount(order.id, item.id, nextType, nextValue)
                      }}
                    >
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Sin descuento" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sin descuento</SelectItem>
                        <SelectItem value="fixed">Importe fijo (ARS)</SelectItem>
                        <SelectItem value="percentage">Porcentaje (%)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {item.discountType && (
                    <div className="w-28 space-y-1">
                      <Label htmlFor={`discount-${item.id}`} className="text-[11px] text-muted-foreground">Valor</Label>
                      <Input
                        id={`discount-${item.id}`}
                        type="number"
                        min="0"
                        max={item.discountType === "percentage" ? "100" : String(item.amount)}
                        step="0.01"
                        value={discountDrafts[item.id] ?? String(item.discountValue ?? "")}
                        onChange={(event) => setDiscountDrafts((current) => ({ ...current, [item.id]: event.target.value }))}
                        onBlur={() => {
                          const value = Number.parseFloat(discountDrafts[item.id] ?? "")
                          if (Number.isFinite(value) && value >= 0) {
                            updateBudgetItemDiscount(order.id, item.id, item.discountType, value)
                          }
                        }}
                        aria-label={`Valor del descuento para ${item.description}`}
                      />
                    </div>
                  )}
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="size-7 text-muted-foreground hover:text-destructive"
                    onClick={() => removeBudgetItem(order.id, item.id)}
                    aria-label="Eliminar ítem"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
                {item.discountType && (
                  <div className="flex items-center justify-between border-t border-border pt-2 text-xs">
                    <span className="text-muted-foreground">Descuento: -{formatCurrency(budgetItemDiscountAmount(item))}</span>
                    <span className="font-medium tabular-nums text-primary">Subtotal: {formatCurrency(budgetItemTotal(item))}</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {order.budget.length > 0 && (
            <div className="space-y-1 rounded-md bg-primary/10 px-3 py-2">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Subtotal</span>
                <span className="tabular-nums">{formatCurrency(budgetSubtotal(order))}</span>
              </div>
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Descuentos</span>
                <span className="tabular-nums">-{formatCurrency(budgetDiscountTotal(order))}</span>
              </div>
              <div className="flex items-center justify-between border-t border-primary/20 pt-1">
                <span className="text-sm font-medium text-foreground">Total final</span>
                <span className="text-base font-semibold tabular-nums text-primary">{formatCurrency(total)}</span>
              </div>
            </div>
          )}

          <form onSubmit={handleAddItem} className="space-y-3 rounded-lg border border-border p-3">
            <div className="space-y-2">
              <Label htmlFor="bi-desc" className="text-xs">
                Detalle del ítem
              </Label>
              <Input
                id="bi-desc"
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                placeholder="Ej: Cambio de módulo HDMI de PS5"
              />
            </div>
            <div className="flex items-end gap-2">
              <div className="flex-1 space-y-2">
                <Label htmlFor="bi-amount" className="text-xs">
                  Importe (ARS)
                </Label>
                <Input
                  id="bi-amount"
                  type="number"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0"
                />
              </div>
              <Button type="submit" variant="secondary" className="gap-1">
                <Plus className="size-4" />
                Agregar
              </Button>
            </div>
          </form>

          <Button
            type="button"
            variant="outline"
            className="w-full gap-2"
            disabled={order.budget.length === 0}
            onClick={async () => { if (await sendBudgetToClientAction(order.id)) { if (currentUser) invalidateOperationsCache(currentUser.id); await refreshOrders() } }}
          >
            <Send className="size-4" />
            Notificar presupuesto al cliente
          </Button>
        </div> : <div className="space-y-4 rounded-lg border border-dashed border-border p-4">
          <h4 className="text-sm font-semibold text-foreground">Análisis técnico</h4>
          <p className="text-sm text-muted-foreground">El presupuesto es gestionado por el responsable de presupuestos y no está visible para colaboradores.</p>
          <Button type="button" className="w-full" disabled={submittingBudget || order.status !== "recibido"} onClick={async () => { setSubmittingBudget(true); try { if (await submitOrderForBudgetAction(order.id)) { if (currentUser) invalidateOperationsCache(currentUser.id); await refreshOrders() } } finally { setSubmittingBudget(false) } }}>
            {submittingBudget ? "Enviando…" : "Finalizar análisis y enviar a presupuesto"}
          </Button>
        </div>}

        {/* Estado + timeline */}
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-foreground">Gestión de estado</h4>

          <div className="space-y-3 rounded-lg border border-border p-3">
            <div className="space-y-2">
              <Label className="text-xs">Cambiar estado</Label>
              <Select value={nextStatus} onValueChange={(v) => setNextStatus(v as OrderStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusFlow.map((s) => (
                    <SelectItem key={s} value={s}>
                      {getStatusLabel(s, states)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status-note" className="text-xs">
                Nota (opcional)
              </Label>
              <Input
                id="status-note"
                value={statusNote}
                onChange={(e) => setStatusNote(e.target.value)}
                placeholder="Ej: Llegó el repuesto, iniciamos reparación"
              />
            </div>
            <Button type="button" className="w-full gap-2" disabled={nextStatus === order.status} onClick={handleAdvance}>
              <ArrowRight className="size-4" />
              Actualizar estado
            </Button>
          </div>

          <Separator />

          <div>
            <h4 className="mb-4 text-sm font-semibold text-foreground">Historial</h4>
            <RepairTimeline order={order} />
          </div>
        </div>
      </div>
    </div>
  )
}
