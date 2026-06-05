import { SidebarProvider } from '@/components/ui/sidebar'
import { AdminSidebar } from '@/components/admin/admin-sidebar'
import { AdminHeader } from '@/components/admin/admin-header.client'
import { RealtimeNotificacionesAdmin } from '@/components/admin/realtime-notificaciones.client'
import { AIHelpChat } from '@/components/ai-help-chat'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SidebarProvider>
      <RealtimeNotificacionesAdmin />
      <div className="min-h-screen w-full flex overflow-x-hidden">
        <AdminSidebar />
        <main className="flex-1 min-w-0 flex flex-col">
          <AdminHeader />
          <div className="flex-1 p-6 overflow-x-auto">
            {children}
          </div>
        </main>
      </div>
      <AIHelpChat variant="admin" />
    </SidebarProvider>
  )
}
