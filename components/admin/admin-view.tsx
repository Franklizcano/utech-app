"use client"

import { LayoutGrid, Users, BarChart3, Settings, Building2 } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ServiceWorkspace } from "@/components/service-workspace"
import { UserManagement } from "@/components/admin/user-management"
import { Stats } from "@/components/admin/stats"
import { StateManagement } from "@/components/admin/state-management"
import { CompanyManagement } from "@/components/admin/company-management"

export function AdminView() {
  return (
    <Tabs defaultValue="operaciones" className="animate-utech-enter space-y-6">
      <TabsList>
        <TabsTrigger value="operaciones" className="gap-2">
          <LayoutGrid className="size-4" />
          Operaciones
        </TabsTrigger>
        <TabsTrigger value="usuarios" className="gap-2">
          <Users className="size-4" />
          Usuarios
        </TabsTrigger>
        <TabsTrigger value="empresas" className="gap-2">
          <Building2 className="size-4" />
          Empresas
        </TabsTrigger>
        <TabsTrigger value="estados" className="gap-2">
          <Settings className="size-4" />
          Estados
        </TabsTrigger>
        <TabsTrigger value="estadisticas" className="gap-2">
          <BarChart3 className="size-4" />
          Estadísticas
        </TabsTrigger>
      </TabsList>
      <TabsContent value="operaciones">
        <ServiceWorkspace />
      </TabsContent>
      <TabsContent value="usuarios">
        <UserManagement />
      </TabsContent>
      <TabsContent value="empresas">
        <CompanyManagement />
      </TabsContent>
      <TabsContent value="estados">
        <StateManagement />
      </TabsContent>
      <TabsContent value="estadisticas">
        <Stats />
      </TabsContent>
    </Tabs>
  )
}
