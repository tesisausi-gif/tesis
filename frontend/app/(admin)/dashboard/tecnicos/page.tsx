'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import TecnicosTab from '@/components/admin/tecnicos/TecnicosTab'
import SolicitudesTab from '@/components/admin/tecnicos/SolicitudesTab'
import EspecialidadesTab from '@/components/admin/tecnicos/EspecialidadesTab'
import CalificacionesTab from '@/components/admin/tecnicos/CalificacionesTab'

export default function TecnicosPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Gestión de Técnicos</h1>
        <p className="text-gray-600 mt-1">
          Administra técnicos, solicitudes, especialidades y calificaciones
        </p>
      </div>

      <Tabs defaultValue="tecnicos" className="space-y-4">
        <TabsList>
          <TabsTrigger value="tecnicos">Técnicos</TabsTrigger>
          <TabsTrigger value="solicitudes">Solicitudes</TabsTrigger>
          <TabsTrigger value="especialidades">Especialidades</TabsTrigger>
          <TabsTrigger value="calificaciones">Calificaciones</TabsTrigger>
        </TabsList>

        <TabsContent value="tecnicos" className="space-y-4">
          <TecnicosTab />
        </TabsContent>

        <TabsContent value="solicitudes" className="space-y-4">
          <SolicitudesTab />
        </TabsContent>

        <TabsContent value="especialidades" className="space-y-4">
          <EspecialidadesTab />
        </TabsContent>

        <TabsContent value="calificaciones" className="space-y-4">
          <CalificacionesTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
