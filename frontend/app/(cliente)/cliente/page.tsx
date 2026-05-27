import { createClient } from '@/shared/lib/supabase/server'
import {
  AlertCircle, Plus, ArrowRight, FileText, Bell,
} from 'lucide-react'
import Link from 'next/link'
import { getClienteBadgeCounts } from '@/features/notificaciones/badge-counts.service'
import { getNotificacionesCliente } from '@/features/notificaciones/notificaciones-inapp.service'
import { NotificacionesPanel } from '@/components/shared/notificaciones-panel.client'

export default async function ClienteDashboard() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('*, clientes(*)')
    .eq('id', user.id)
    .single()

  const { data: inmuebles } = await supabase
    .from('inmuebles')
    .select('id_inmueble')
    .eq('id_cliente', usuario?.id_cliente)

  const totalInmuebles = inmuebles?.length ?? 0

  const [badgeCounts, notificaciones] = await Promise.all([
    getClienteBadgeCounts().catch(() => ({ presupuestos: 0, pagos: 0, notificaciones: 0 })),
    getNotificacionesCliente().catch(() => []),
  ])

  const iniciales = usuario?.nombre
    ? `${usuario.nombre[0]}${usuario.apellido?.[0] ?? ''}`.toUpperCase()
    : '?'

  return (
    <div className="min-h-screen bg-gray-50 pb-8">

      {/* ── Header ──────────────────────────────────────── */}
      <div className="bg-white px-5 pt-6 pb-5 border-b border-slate-100">
        <div className="flex items-center gap-3 mb-1">
          <div className="h-10 w-10 rounded-full bg-slate-900 flex items-center justify-center shrink-0">
            <span className="text-sm font-bold text-white">{iniciales}</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 leading-tight">
              Hola, {usuario?.nombre ?? 'Cliente'}
            </h1>
            <p className="text-xs text-slate-400">Panel de incidentes</p>
          </div>
        </div>
      </div>

      <div className="px-4 space-y-4 pt-4">

        {/* ── Aviso: sin inmuebles ──────────────────────── */}
        {totalInmuebles === 0 && (
          <div className="rounded-2xl bg-blue-50 border border-blue-200 px-4 py-3 flex items-start gap-3">
            <AlertCircle className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
            <p className="text-xs text-blue-700">
              <strong>Antes de reportar</strong> un incidente, registrá al menos un inmueble.
            </p>
          </div>
        )}

        {/* ── Alerta: presupuesto pendiente ────────────── */}
        {badgeCounts.presupuestos > 0 && (
          <Link href="/cliente/presupuestos">
            <div className="rounded-2xl border-l-4 border-l-amber-400 bg-gradient-to-r from-amber-50/70 to-white shadow-sm p-4 flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                <Bell className="h-4 w-4 text-amber-600 animate-pulse" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-amber-800">
                  {badgeCounts.presupuestos === 1 ? '1 presupuesto para revisar' : `${badgeCounts.presupuestos} presupuestos para revisar`}
                </p>
                <p className="text-xs text-amber-600">Tocá para ver →</p>
              </div>
            </div>
          </Link>
        )}

        {/* ── Acciones rápidas ─────────────────────────── */}
        <div className="space-y-2">
          <Link href="/cliente/incidentes/nuevo">
            <div className="rounded-2xl bg-slate-900 text-white px-5 py-4 flex items-center justify-between shadow-sm active:bg-slate-800 transition-colors">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-white/10 flex items-center justify-center">
                  <Plus className="h-4 w-4 text-white" />
                </div>
                <span className="text-sm font-semibold">Reportar nuevo incidente</span>
              </div>
              <ArrowRight className="h-4 w-4 opacity-60" />
            </div>
          </Link>

          <Link href="/cliente/incidentes">
            <div className="rounded-2xl bg-white border border-slate-200 px-5 py-4 flex items-center justify-between shadow-sm active:bg-slate-50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center">
                  <FileText className="h-4 w-4 text-slate-600" />
                </div>
                <span className="text-sm font-semibold text-slate-800">Ver todos mis incidentes</span>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-400" />
            </div>
          </Link>
        </div>

        {/* ── Notificaciones ───────────────────────────── */}
        <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 pt-4 pb-2">
            <NotificacionesPanel notificaciones={notificaciones} rol="cliente" />
          </div>
        </div>

      </div>
    </div>
  )
}
