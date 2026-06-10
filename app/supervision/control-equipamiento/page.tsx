import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import EquipmentControlFormLogic from "@/components/EquipmentControlFormLogic"

export default async function ControlEquipamientoPage() {
  const supabase = await createClient()

  // 1. Verificar autenticación
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return redirect("/login")
  }

  // 2. Obtener Perfil del Usuario
  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, last_name, roles")
    .eq("id", user.id)
    .single()

  const roles = (profile?.roles || []).map((r: string) => r.toLowerCase())
  const hasAccess = roles.includes("admin") || roles.includes("reportes")

  if (!hasAccess) {
    return redirect("/unauthorized")
  }

  const usuarioActual = {
    id: user.id,
    nombre: `${profile?.first_name || ""} ${profile?.last_name || ""}`.trim() || "Usuario",
  }

  return (
    <main className="min-h-screen bg-[#F2F2F7] p-6 md:p-12 relative overflow-hidden">
      {/* Background Gradients */}
      <div className="absolute top-0 left-0 w-full h-96 bg-blue-600/5 blur-[120px] pointer-events-none" />
      
      {/* Navegación y Volver */}
      <div className="flex justify-start mb-8 relative z-10 max-w-5xl mx-auto">
        <Link 
          href="/supervision"
          className="flex items-center px-4 py-2 bg-white rounded-xl text-sm font-semibold text-gray-700 hover:text-gray-900 shadow-sm border border-gray-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver a Supervisión
        </Link>
      </div>

      {/* Aquí inyectamos el componente modular */}
      <EquipmentControlFormLogic 
        usuarioActual={usuarioActual} 
      />
    </main>
  )
}
