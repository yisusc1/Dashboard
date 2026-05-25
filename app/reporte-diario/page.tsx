import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import SupervisionFormLogic from "@/components/SupervisionFormLogic"

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
    .select("first_name, last_name")
    .eq("id", user.id)
    .single()

  const usuarioActual = {
    id: user.id,
    nombre: `${profile?.first_name || ""} ${profile?.last_name || ""}`.trim() || "Usuario",
  }

  return (
    <main className="min-h-screen bg-[#F2F2F7] p-6 md:p-12 relative overflow-hidden">
      {/* Background Gradients */}
      <div className="absolute top-0 left-0 w-full h-96 bg-blue-600/5 blur-[120px] pointer-events-none" />
      
      {/* Aquí inyectamos el componente modular */}
      <SupervisionFormLogic 
        usuarioActual={usuarioActual} 
      />
    </main>
  )
}

