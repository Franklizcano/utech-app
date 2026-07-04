"use client"

import { useState } from "react"
import { ClipboardPlus, User2, Cpu, AlertCircle, Building2 } from "lucide-react"
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

export function OrderForm({ onCreated }: { onCreated?: (orderId: string) => void }) {
  const { addOrder, employees } = useStore()
  const activeEmployees = employees.filter((e) => e.active)

  const [clientName, setClientName] = useState("")
  const [clientPhone, setClientPhone] = useState("")
  const [clientEmail, setClientEmail] = useState("")
  const [isCorporate, setIsCorporate] = useState(false)
  const [companyName, setCompanyName] = useState("")
  const [companyLogo, setCompanyLogo] = useState("")
  const [deviceType, setDeviceType] = useState<DeviceType>("PC")
  const [deviceBrand, setDeviceBrand] = useState("")
  const [deviceModel, setDeviceModel] = useState("")
  const [fault, setFault] = useState("")
  const [assignedTo, setAssignedTo] = useState(activeEmployees[0]?.name ?? "")

  function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      setCompanyLogo(event.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!clientName || !fault) return
    if (isCorporate && !companyName) return
    const order = addOrder({
      clientName,
      clientPhone,
      clientEmail,
      isCorporate,
      companyName: isCorporate ? companyName : undefined,
      companyLogo: isCorporate ? companyLogo : undefined,
      deviceType,
      deviceBrand,
      deviceModel,
      fault,
      assignedTo,
    })
    setClientName("")
    setClientPhone("")
    setClientEmail("")
    setIsCorporate(false)
    setCompanyName("")
    setCompanyLogo("")
    setDeviceType("PC")
    setDeviceBrand("")
    setDeviceModel("")
    setFault("")
    onCreated?.(order.id)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <section className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <User2 className="size-4 text-primary" />
          Datos del cliente
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="clientName">Nombre y apellido *</Label>
            <Input id="clientName" value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Ej: Juan Pérez" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="clientPhone">Teléfono</Label>
            <Input id="clientPhone" value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} placeholder="+54 11 5555-1234" />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="clientEmail">Email</Label>
            <Input id="clientEmail" type="email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} placeholder="cliente@mail.com" />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={isCorporate}
                onChange={(e) => setIsCorporate(e.target.checked)}
                className="rounded border-input"
              />
              <span>Es cliente corporativo</span>
            </Label>
          </div>
        </div>

        {isCorporate && (
          <div className="grid gap-4 rounded-lg border border-border bg-secondary/20 p-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="companyName">Nombre de la empresa *</Label>
              <Input
                id="companyName"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Ej: Tech Solutions S.A."
                required={isCorporate}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyLogo">Logo de la empresa</Label>
              <Input
                id="companyLogo"
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
              />
              {companyLogo && (
                <div className="mt-2 flex items-center gap-2">
                  <img src={companyLogo} alt="logo" className="h-10 w-10 rounded object-contain" />
                  <button
                    type="button"
                    onClick={() => setCompanyLogo("")}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Remover
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
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
            <Select value={assignedTo} onValueChange={setAssignedTo}>
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
