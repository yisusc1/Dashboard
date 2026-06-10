import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import EquipmentHistoryViewer from "@/components/EquipmentHistoryViewer"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export default async function EquipmentHistoryPage() {
  const supabase = createClient()

  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    redirect('/login')
  }

  // Verificar rol (supervisor o admin)
  const { data: profile } = await supabase
    .from('profiles')
    .select('roles')
    .eq('id', session.user.id)
    .single()

  const hasAccess = profile?.roles?.some((r: string) => 
    ['admin', 'supervisor', 'gerencia', 'reportes'].includes(r)
  )

  if (!hasAccess) {
    redirect('/')
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] p-4 md:p-8">
      <div className="max-w-6xl mx-auto mb-6">
        <Link 
          href="/supervision/control-equipamiento"
          className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver a Control de Equipamiento
        </Link>
      </div>

      <EquipmentHistoryViewer />
    </div>
  )
}
