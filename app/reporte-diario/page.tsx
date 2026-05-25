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
    .select("first_name, last_name, department, job_title")
    .eq("id", user.id)
    .single()

  // 3. Determinar el Rol basado en el departamento o puesto
  // Ajusta esta lógica según cómo tengas guardado el departamento en tu base de datos.
  // Por defecto asumo que si el departamento dice "Almacen" es ROLE_ALMACEN, de lo contrario ROLE_CALLE.
  const isAlmacen = profile?.department?.toLowerCase().includes("almacen") || profile?.department?.toLowerCase().includes("almacén")
  
  const usuarioActual = {
    id: user.id,
    nombre: `${profile?.first_name || ""} ${profile?.last_name || ""}`.trim() || "Usuario",
    rol: (isAlmacen ? "ROLE_ALMACEN" : "ROLE_CALLE") as "ROLE_CALLE" | "ROLE_ALMACEN",
  }

  // 4. Generar un ID para el reporte (Ej: basado en la fecha de hoy)
  const reportId = `reporte-${new Date().toISOString().split("T")[0]}`

  return (
    <main className="min-h-screen bg-zinc-50 p-6 md:p-12">
      <div className="max-w-4xl mx-auto mb-6">
        <h1 className="text-3xl font-bold text-zinc-900">Operaciones Diarias</h1>
        <p className="text-zinc-500 mt-1">Completa tu sección del reporte correspondiente al día de hoy.</p>
      </div>

      {/* Aquí inyectamos el componente que creamos */}
      <SupervisionFormLogic 
        usuarioActual={usuarioActual} 
        reportId={reportId} 
      />
    </main>
  )
}
