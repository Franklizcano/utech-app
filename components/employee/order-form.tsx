"use client"

import { useState } from "react"
import { ClipboardPlus, User2, Cpu, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useStore } from "@/lib/store"
import type { DeviceType } from "@/lib/types"

const DEVICE_TYPES: DeviceType[] = ["PC", "Notebook", "PlayStation", "Xbox", "Nintendo", "Otro"]

export function OrderForm({ onCreatedAction }: { onCreatedAction?: (orderId: string) => void }) {
  const { addOrder, employees, users } = useStore()
  const activeEmployees = employees.filter((e) => e.active)
  const clients = users.filter((u) => u.role === "cliente")

  const [clientType, setClientType] = useState<"registered" | "occasional">("registered")
  const [clientId, setClientId] = useState(clients[0]?.id ?? "")
  const [occasionalName, setOccasionalName] = useState("")
  const [occasionalPhone, setOccasionalPhone] = useState("")
  const [occasionalEmail, setOccasionalEmail] = useState("")
  const [deviceType, setDeviceType] = useState<DeviceType>("PC")
  const [deviceBrand, setDeviceBrand] = useState("")
  const [deviceModel, setDeviceModel] = useState("")
  const [fault, setFault] = useState("")
  const [assignedTo, setAssignedTo] = useState(activeEmployees[0]?.name ?? "")

  const selectedClient = clients.find((c) => c.id === clientId)
  const isUsingOccasional = clientType === "occasional"

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    let clientName: string
    let clientPhone: string
    let clientEmail: string
    let useClientId: string | null

    if (isUsingOccasional) {
      if (!occasionalName.trim() || !occasionalPhone.trim() || !occasionalEmail.trim() || !fault) return
      clientName = occasionalName
      clientPhone = occasionalPhone
      clientEmail = occasionalEmail
      useClientId = null // null para cliente ocasional
    } else {
      if (!clientId || !fault) return
      if (!selectedClient) return
      clientName = selectedClient.name
      clientPhone = selectedClient.phone
      clientEmail = selectedClient.email
      useClientId = clientId
    }
    
    const order = addOrder({
      clientId: useClientId,
      clientName,
      clientPhone,
      clientEmail,
      deviceType,
      deviceBrand,
      deviceModel,
      fault,
      assignedTo,
    })
    
    // Reset form
    setDeviceType("PC")
    setDeviceBrand("")
    setDeviceModel("")
    setFault("")
    setOccasionalName("")
    setOccasionalPhone("")
    setOccasionalEmail("")
    onCreatedAction?.(order.id)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <section className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <User2 className="size-4 text-primary" />
          Cliente
        </div>
        <div className="space-y-4">
          <div className="flex gap-3">
            <Label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={clientType === "registered"}
                onChange={() => setClientType("registered")}
                className="rounded-full border-input"
              />
              <span>Cliente registrado</span>
            </Label>
            <Label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={clientType === "occasional"}
                onChange={() => setClientType("occasional")}
                className="rounded-full border-input"
              />
              <span>Cliente ocasional</span>
            </Label>
          </div>

          {clientType === "registered" ? (
            <div className="space-y-2">
              {clients.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border bg-secondary/30 p-4 text-center text-sm text-muted-foreground">
                  No hay clientes registrados. Crea uno en la gestión de usuarios o selecciona &quot;Cliente ocasional&quot;.
                </div>
              ) : (
                <>
                  <Label>Seleccionar cliente *</Label>
                  <Select value={clientId} onValueChange={(v) => setClientId(v || "")}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </>
              )}

              {selectedClient && (
                <div className="rounded-lg border border-border bg-secondary/20 p-4 space-y-3">
                  {selectedClient.isCorporate && selectedClient.companyLogo && (
                    <div className="flex items-center gap-3">
                      <img
                        src={selectedClient.companyLogo}
                        alt={selectedClient.companyName}
                        className="h-12 w-12 rounded object-contain"
                      />
                      <div>
                        <p className="text-sm font-medium text-foreground">{selectedClient.companyName}</p>
                        <p className="text-xs text-muted-foreground">Contacto: {selectedClient.name}</p>
                      </div>
                    </div>
                  )}
                  {!selectedClient.isCorporate && (
                    <div>
                      <p className="text-sm font-medium text-foreground">{selectedClient.name}</p>
                    </div>
                  )}
                  <div className="space-y-1 text-sm">
                    <p className="text-muted-foreground">
                      <span className="font-medium text-foreground">Teléfono:</span> {selectedClient.phone}
                    </p>
                    <p className="text-muted-foreground">
                      <span className="font-medium text-foreground">Email:</span> {selectedClient.email}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="grid gap-4 rounded-lg border border-border bg-secondary/20 p-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="occ-name">Nombre y apellido *</Label>
                <Input
                  id="occ-name"
                  value={occasionalName}
                  onChange={(e) => setOccasionalName(e.target.value)}
                  placeholder="Ej: Juan García"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="occ-phone">Teléfono *</Label>
                <Input
                  id="occ-phone"
                  type="tel"
                  value={occasionalPhone}
                  onChange={(e) => setOccasionalPhone(e.target.value)}
                  placeholder="+54 11 0000-0000"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="occ-email">Email *</Label>
                <Input
                  id="occ-email"
                  type="email"
                  value={occasionalEmail}
                  onChange={(e) => setOccasionalEmail(e.target.value)}
                  placeholder="cliente@mail.com"
                  required
                />
              </div>
              <div className="rounded-lg border border-dashed border-border bg-background p-3 text-xs text-muted-foreground sm:col-span-2">
                El cliente podrá consultar el estado de su orden usando el código de seguimiento.
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Cpu className="size-4 text-primary" />
          Equipo
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label>Tipo de equipo</Label>
            <Select value={deviceType} onValueChange={(v) => setDeviceType(v as DeviceType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DEVICE_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="brand">Marca</Label>
            <Input id="brand" value={deviceBrand} onChange={(e) => setDeviceBrand(e.target.value)} placeholder="Ej: Sony" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="model">Modelo</Label>
            <Input id="model" value={deviceModel} onChange={(e) => setDeviceModel(e.target.value)} placeholder="Ej: PS5 Slim" />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <AlertCircle className="size-4 text-primary" />
          Falla reportada
        </div>
        <div className="space-y-2">
          <Label htmlFor="fault">Descripción de la falla *</Label>
          <Textarea
            id="fault"
            value={fault}
            onChange={(e) => setFault(e.target.value)}
            placeholder="Describí el problema que reporta el cliente..."
            rows={4}
            required
          />
        </div>
        {activeEmployees.length > 0 && (
          <div className="space-y-2 sm:max-w-xs">
            <Label>Técnico asignado</Label>
            <Select value={assignedTo} onValueChange={(v) => setAssignedTo(v || "")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {activeEmployees.map((e) => (
                  <SelectItem key={e.id} value={e.name}>
                    {e.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </section>

      <div className="flex justify-end">
        <Button type="submit" className="gap-2">
          <ClipboardPlus className="size-4" />
          Cargar pedido
        </Button>
      </div>
    </form>
  )
}
