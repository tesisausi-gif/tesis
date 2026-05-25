'use client'

import { useState, useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import TecnicosTab from '@/components/admin/tecnicos/TecnicosTab'
import SolicitudesTab from '@/components/admin/tecnicos/SolicitudesTab'
import EspecialidadesTab from '@/components/admin/tecnicos/EspecialidadesTab'
import { getAdminBadgeCounts } from '@/features/notificaciones/badge-counts.service'

export default function TecnicosPage() {
  const [solicitudesCount, setSolicitudesCount] = useState(0)

  useEffect(() => {
    getAdminBadgeCounts().then((counts) => setSolicitudesCount(counts.solicitudes))
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Gestión de Técnicos</h1>
        <p className="text-gray-600 mt-1">
          Administra técnicos, solicitudes y especialidades
        </p>
      </div>

      <Tabs defaultValue="tecnicos" className="space-y-4">
        <TabsList className="flex flex-wrap h-auto gap-1 bg-slate-100 p-1 rounded-xl">
          <TabsTrigger value="tecnicos" className="rounded-lg px-3.5 py-2 text-xs font-semibold h-auto data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-slate-900 data-[state=inactive]:text-slate-500">
            Técnicos
          </TabsTrigger>
          <TabsTrigger value="solicitudes" className="flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold h-auto data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-slate-900 data-[state=inactive]:text-slate-500">
            Solicitudes
            {solicitudesCount > 0 && (
              <span className="inline-flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold leading-none w-4 h-4 min-w-4">
                {solicitudesCount > 99 ? '99+' : solicitudesCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="especialidades" className="rounded-lg px-3.5 py-2 text-xs font-semibold h-auto data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-slate-900 data-[state=inactive]:text-slate-500">
            Especialidades
          </TabsTrigger>
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
      </Tabs>
    </div>
  )
}
