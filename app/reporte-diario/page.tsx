import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import SupervisionFormLogic from "@/components/SupervisionFormLogic"

import Link from "next/link"

export default async function ReporteDiarioPage() {
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
      
      {/* Navegación Pestañas */}
      <div className="flex justify-center mb-8 relative z-10">
        <div className="bg-gray-200/60 p-1 rounded-xl flex items-center">
          <Link href="/reporte-diario" className="px-6 py-2 rounded-lg bg-white shadow-sm text-sm font-semibold text-gray-900">
            Nuevo Reporte
          </Link>
          <Link href="/historial-reportes" className="px-6 py-2 rounded-lg text-sm font-semibold text-gray-500 hover:text-gray-900 transition-colors">
            Mi Historial
          </Link>
        </div>
      </div>

      {/* Aquí inyectamos el componente modular */}
      <SupervisionFormLogic 
        usuarioActual={usuarioActual} 
      />
    </main>
  )
}

