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

  // Fetch Profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, last_name, department, job_title, national_id")
    .eq("id", user.id)
    .single()

  // Redirect to complete profile if necessary info is missing
  if (!profile?.first_name || !profile?.last_name || !profile?.national_id) {
    return redirect("/complete-profile")
  }

  return (
    <main className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center p-6">
      <div className="max-w-4xl w-full space-y-12">

        {/* HEADER */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-black text-white mb-2 shadow-2xl shadow-zinc-200">
            <ShieldCheck size={32} />
          </div>

          <div className="space-y-2">
            <h1 className="text-4xl font-bold text-zinc-900 tracking-tight">
              Hola, {profile?.first_name || 'Usuario'}
            </h1>
            {profile?.job_title && (
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-zinc-200 text-sm font-medium text-zinc-600 shadow-sm">
                <span>{profile.job_title}</span>
                {profile.department && (
                  <>
                    <span className="w-1 h-1 rounded-full bg-zinc-300" />
                    <span className="text-zinc-400">{profile.department}</span>
                  </>
                )}
              </div>
            )}
            {!profile?.job_title && (
              <p className="text-zinc-500 text-lg max-w-md mx-auto">
                Portal de Operaciones
              </p>
            )}
          </div>
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


