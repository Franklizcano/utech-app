"use client"

import { useState } from "react"
import { AlertCircle, ClipboardPlus, Cpu } from "lucide-react"
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

export function ClientOrderForm({ onCreatedAction }: { onCreatedAction?: (orderId: string) => void }) {
  const { currentUser, addOrder } = useStore()
  const [deviceType, setDeviceType] = useState<DeviceType>("PC")
  const [deviceBrand, setDeviceBrand] = useState("")
  const [deviceModel, setDeviceModel] = useState("")
  const [fault, setFault] = useState("")

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!currentUser || !deviceBrand.trim() || !deviceModel.trim() || !fault.trim()) return

    const order = addOrder({
      clientId: currentUser.id,
      clientName: currentUser.name,
      clientPhone: currentUser.phone,
      clientEmail: currentUser.email,
      deviceType,
      deviceBrand: deviceBrand.trim(),
      deviceModel: deviceModel.trim(),
      fault: fault.trim(),
      assignedTo: null,
    })

    setDeviceType("PC")
    setDeviceBrand("")
    setDeviceModel("")
    setFault("")
    onCreatedAction?.(order.id)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm text-muted-foreground">
        La orden quedará pendiente hasta que un colaborador la tome. Vas a poder seguir su estado desde tu panel.
      </div>

      <section className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Cpu className="size-4 text-primary" />
          Equipo
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label>Tipo de equipo</Label>
            <Select value={deviceType} onValueChange={(value) => setDeviceType(value as DeviceType)}>
              <SelectTrigger>
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
          <div className="space-y-2">
            <Label htmlFor="client-order-brand">Marca *</Label>
            <Input
              id="client-order-brand"
              value={deviceBrand}
              onChange={(event) => setDeviceBrand(event.target.value)}
              placeholder="Ej: Sony"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="client-order-model">Modelo *</Label>
            <Input
              id="client-order-model"
              value={deviceModel}
              onChange={(event) => setDeviceModel(event.target.value)}
              placeholder="Ej: PS5 Slim"
              required
            />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <AlertCircle className="size-4 text-primary" />
          Falla reportada
        </div>
        <div className="space-y-2">
          <Label htmlFor="client-order-fault">Descripción de la falla *</Label>
          <Textarea
            id="client-order-fault"
            value={fault}
            onChange={(event) => setFault(event.target.value)}
            placeholder="Describí el problema que presenta tu equipo..."
            rows={5}
            required
          />
        </div>
      </section>

      <div className="flex justify-end">
        <Button type="submit" className="gap-2" disabled={!currentUser}>
          <ClipboardPlus className="size-4" />
          Crear orden
        </Button>
      </div>
    </form>
  )
}
