import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import { FileText, ArrowLeft, Wrench } from "lucide-react"

export default async function SupervisionHubPage() {
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
    .select("roles")
    .eq("id", user.id)
    .single()

  const roles = (profile?.roles || []).map((r: string) => r.toLowerCase())
  const hasAccess = roles.includes("admin") || roles.includes("reportes")

  if (!hasAccess) {
    return redirect("/unauthorized")
  }

  return (
    <main className="min-h-screen bg-[#F2F2F7] p-6 md:p-12 relative overflow-hidden">
      {/* Background Gradients */}
      <div className="absolute top-0 left-0 w-full h-96 bg-blue-600/5 blur-[120px] pointer-events-none" />
      
      <div className="max-w-4xl mx-auto relative z-10">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Supervisión</h1>
            <p className="text-gray-500 mt-2">Módulo de control para operaciones en calle y almacén.</p>
          </div>
          <Link 
            href="/"
            className="flex items-center px-4 py-2 bg-white rounded-[14px] text-sm font-semibold text-gray-700 hover:text-gray-900 shadow-sm border border-gray-200 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver al Inicio
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link
            href="/supervision/reporte-diario"
            className="group relative overflow-hidden bg-white rounded-[32px] p-8 border border-zinc-200 shadow-sm hover:shadow-xl hover:border-blue-200 transition-all duration-300 block"
          >
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110 duration-500">
                <FileText size={120} />
            </div>
            <div className="relative z-10 flex flex-col h-full justify-between space-y-8">
                <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    <FileText size={28} />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-zinc-900 mb-2">Reporte Diario</h2>
                    <p className="text-zinc-500 font-medium">Llenar el reporte de las operaciones realizadas.</p>
                </div>
                <div className="flex items-center text-blue-600 font-semibold group-hover:translate-x-2 transition-transform">
                    Acceder <span className="ml-2">→</span>
                </div>
            </div>
          </Link>

          <Link
            href="/supervision/control-equipamiento"
            className="group relative overflow-hidden bg-white rounded-[32px] p-8 border border-zinc-200 shadow-sm hover:shadow-xl hover:border-orange-200 transition-all duration-300 block"
          >
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110 duration-500">
                <Wrench size={120} />
            </div>
            <div className="relative z-10 flex flex-col h-full justify-between space-y-8">
                <div className="w-14 h-14 rounded-2xl bg-orange-50 flex items-center justify-center text-orange-600 group-hover:bg-orange-600 group-hover:text-white transition-colors">
                    <Wrench size={28} />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-zinc-900 mb-2">Control de Equipamiento</h2>
                    <p className="text-zinc-500 font-medium">Auditoría de herramientas y kits FTTH del equipo de técnicos.</p>
                </div>
                <div className="flex items-center text-orange-600 font-semibold group-hover:translate-x-2 transition-transform">
                    Auditar Equipos <span className="ml-2">→</span>
                </div>
            </div>
          </Link>
        </div>
      </div>
    </main>
  )
}
