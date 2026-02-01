"use client"

import { useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { AlertTriangle, Wrench } from "lucide-react"
import { useRouter } from "next/navigation" // [NEW]

export function RealtimeNotifications() {
    const router = useRouter() // [NEW]

    useEffect(() => {
        const supabase = createClient()

        // Listener for FAULTS (Fallas)
        const faultsChannel = supabase
            .channel('realtime-faults')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'fallas' },
                (payload) => {
                    const newFault = payload.new as any

                    // Custom Toast - Premium Style
                    toast.custom((t) => (
                        <div className="w-[356px] flex items-center gap-4 bg-white/80 backdrop-blur-xl border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.12)] p-4 rounded-[24px] pointer-events-auto transition-all animate-in slide-in-from-top-5 fade-in duration-300">
                            {/* Icon Container - Red for Faults */}
                            <div className="flex-shrink-0 w-12 h-12 bg-black rounded-2xl flex items-center justify-center shadow-lg shadow-black/20 text-white">
                                <AlertTriangle size={20} />
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                                <h3 className="text-[15px] font-bold text-zinc-900 leading-tight mb-1">
                                    ¡Nueva Falla Reportada!
                                </h3>
                                <p className="text-[13px] text-zinc-500 leading-snug line-clamp-2">
                                    {newFault.descripcion}
                                </p>
                                {/* Priority Tag */}
                                <div className="mt-1.5 inline-flex items-center px-2 py-0.5 rounded-md bg-zinc-100 border border-zinc-200">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-600">
                                        Prioridad: {newFault.prioridad}
                                    </span>
                                </div>
                            </div>

                            {/* Dismiss Indicator */}
                            <div className="h-full flex flex-col justify-start py-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                            </div>
                        </div>
                    ), { duration: 5000 })

                    // Audio Alert
                    const audio = new Audio('/notification.mp3') // Assuming we might add one, or browser default beep not possible without interaction. 
                    // Use Speech Synthesis for alert
                    if (window.speechSynthesis) {
                        const u = new SpeechSynthesisUtterance("Alerta gerente. Nueva falla de vehículo reportada.")
                        window.speechSynthesis.speak(u)
                    }

                    // Refresh data
                    router.refresh()
                }
            )
            .subscribe()

        // [NEW] Listener for TRIPS (Reports)
        const tripsChannel = supabase
            .channel('realtime-trips')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'reportes' }, // Listen to everything on reportes
                (payload) => {
                    console.log("Trip update detected, refreshing dashboard...", payload)
                    router.refresh()
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(faultsChannel)
            supabase.removeChannel(tripsChannel)
        }
    }, [router])

    return null // Invisible component
}
