
import { Suspense } from "react"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { getFleetStatus } from "./actions"
import { LiveFleetDashboard } from "./components/live-fleet-dashboard"
import { RealtimeNotifications } from "./components/realtime-notifications"
import { Bell } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function GerenciaDashboard() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) redirect("/login")

    // Fetch Fleet Data
    const fleet = await getFleetStatus()

    return (
        <main className="min-h-screen bg-zinc-50 p-4 md:p-12 pb-24">
            <RealtimeNotifications />

            <div className="max-w-7xl mx-auto space-y-8">
                {/* HEADER */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-bold text-zinc-900 tracking-tight">Centro de Control</h1>
                        <p className="text-zinc-500 font-medium mt-2 text-base md:text-lg">Monitoreo de flota y operaciones en tiempo real.</p>
                    </div>

                    <div className="flex gap-3 items-center">
                        <Link href="/gerencia/notificaciones" className="flex items-center justify-center h-10 w-10 rounded-full bg-white/80 backdrop-blur-md border border-zinc-100/50 text-zinc-400 hover:text-zinc-900 hover:bg-white hover:shadow-md transition-all duration-300" title="Ver Historial de Notificaciones">
                            <span className="sr-only">Notificaciones</span>
                            <Bell size={20} strokeWidth={2} />
                        </Link>
                        <Link href="/" className="flex items-center gap-2 text-sm font-medium text-zinc-500 hover:text-zinc-900 bg-transparent hover:bg-white/50 px-4 py-2 rounded-full transition-all duration-300">
                            ⬅ Volver al Menú
                        </Link>
                    </div>
                </div>

                {/* MAIN DASHBOARD */}
                <Suspense fallback={<div className="h-96 flex items-center justify-center">Cargando flota...</div>}>
                    <LiveFleetDashboard vehicles={fleet} />
                </Suspense>
            </div>
        </main>
    )
}
