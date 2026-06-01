import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { AdminSidebar } from '@/components/admin/admin-sidebar'
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
      <div className="min-h-screen w-full flex">
        <AdminSidebar />
        <main className="flex-1 flex flex-col">
          <header className="sticky top-0 z-10 flex h-12 items-center gap-3 border-b bg-background/95 backdrop-blur-sm px-4">
            <SidebarTrigger />
          </header>
          <div className="flex-1 p-6">
            {children}
          </div>
        </main>
      </div>
      <AIHelpChat variant="admin" />
    </SidebarProvider>
  )
}
