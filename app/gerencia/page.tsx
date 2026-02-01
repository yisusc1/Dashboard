
import { Suspense } from "react"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { getFleetStatus } from "./actions"
import { LiveFleetDashboard } from "./components/live-fleet-dashboard"
import { RealtimeNotifications } from "./components/realtime-notifications"

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
                        <Link href="/gerencia/debug" className="flex items-center gap-2 text-sm font-medium text-zinc-600 bg-white px-4 py-2 rounded-full border border-zinc-200 shadow-sm hover:bg-zinc-50">
                            🛠️ Diagnóstico
                        </Link>
                        <div className="flex items-center gap-2 text-sm font-medium text-zinc-500 bg-white px-4 py-2 rounded-full border border-zinc-200 shadow-sm">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                            </span>
                            Actualización en vivo
                        </div>
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
