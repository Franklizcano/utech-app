"use client"

import { LayoutGrid, Users, BarChart3 } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ServiceWorkspace } from "@/components/service-workspace"
import { UserManagement } from "@/components/admin/user-management"
import { Stats } from "@/components/admin/stats"

export function AdminView() {
  return (
    <Tabs defaultValue="operaciones" className="space-y-6">
      <TabsList>
        <TabsTrigger value="operaciones" className="gap-2">
          <LayoutGrid className="size-4" />
          Operaciones
        </TabsTrigger>
        <TabsTrigger value="usuarios" className="gap-2">
          <Users className="size-4" />
          Usuarios
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
      <TabsContent value="estadisticas">
        <Stats />
      </TabsContent>
    </Tabs>
  )
}
