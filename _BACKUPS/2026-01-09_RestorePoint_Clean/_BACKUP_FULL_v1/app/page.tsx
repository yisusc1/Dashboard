import { ShieldCheck } from "lucide-react"
import { LogoutButton } from "@/components/ui/logout-button"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { DashboardMenu } from "@/components/dashboard-menu"

export default async function Home() {
  const supabase = await createClient()

  // Verify auth
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return redirect("/login")
  }

  return (
    <main className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center p-6">
      <div className="max-w-4xl w-full space-y-12">

        {/* HEADER */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-black text-white mb-2 shadow-2xl shadow-zinc-200">
            <ShieldCheck size={32} />
          </div>
          <h1 className="text-4xl font-bold text-zinc-900 tracking-tight">Portal de Operaciones</h1>
          <p className="text-zinc-500 text-lg max-w-md mx-auto">
            Seleccione el módulo al que desea acceder
          </p>
        </div>

        {/* MODULE CARDS */}
        <DashboardMenu />

        {/* LOGOUT */}
        <div className="text-center">
          <LogoutButton />
        </div>

      </div>
    </main>
  )
}


