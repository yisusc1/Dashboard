import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import CuadrillasManager from "@/components/CuadrillasManager"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export default async function AdminCuadrillasPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return redirect("/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("roles")
    .eq("id", user.id)
    .single()

  const roles = (profile?.roles || []).map((r: string) => r.toLowerCase())
  if (!roles.includes("admin")) {
    return redirect("/unauthorized")
  }

  return (
    <main className="min-h-screen bg-slate-50/50 p-6 md:p-10 relative overflow-hidden">
      <div className="max-w-4xl mx-auto mb-10">
        <div className="flex items-center gap-2 mb-2">
            <Link href="/admin" className="p-2 -ml-2 rounded-full hover:bg-slate-200/50 transition-colors text-slate-500">
                <ArrowLeft size={24} />
            </Link>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Gestión de Cuadrillas</h1>
        </div>
        <p className="text-slate-500">Administra los equipos de técnicos, asignando líderes y auxiliares.</p>
      </div>

      <div className="max-w-4xl mx-auto">
        <CuadrillasManager />
      </div>
    </main>
  )
}
