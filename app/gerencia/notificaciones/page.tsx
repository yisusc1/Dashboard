import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { getNotificationHistory } from "../actions"
import { AlertTriangle, Car, ArrowRightLeft, Clock, ArrowLeft } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"

export const dynamic = "force-dynamic"

export default async function NotificationsPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) redirect("/login")

    const notifications = await getNotificationHistory()

    const getIcon = (type: string) => {
        switch (type) {
            case 'FALLA': return <AlertTriangle size={16} />
            case 'SALIDA': return <Car size={16} />
            case 'ENTRADA': return <ArrowRightLeft size={16} />
            default: return <Clock size={16} />
        }
    }

    const getLocationStyles = (type: string) => {
        switch (type) {
            case 'FALLA': return 'text-amber-600 bg-amber-50 border-amber-100'
            case 'SALIDA': return 'text-blue-600 bg-blue-50 border-blue-100'
            case 'ENTRADA': return 'text-green-600 bg-green-50 border-green-100'
            default: return 'text-zinc-500 bg-zinc-50 border-zinc-100'
        }
    }

    return (
        <main className="min-h-screen bg-white p-4">
            <div className="max-w-lg mx-auto">
                <div className="flex items-center gap-4 mb-6 sticky top-0 bg-white/90 backdrop-blur-xl py-4 z-20 border-b border-zinc-50">
                    <Link href="/gerencia" className="p-2 -ml-2 rounded-full hover:bg-zinc-50 transition-colors text-zinc-900">
                        <ArrowLeft size={20} />
                    </Link>
                    <div>
                        <h1 className="text-lg font-bold text-zinc-900 tracking-tight">Notificaciones</h1>
                    </div>
                </div>

                <div className="space-y-3">
                    {notifications.length === 0 ? (
                        <div className="text-center py-20">
                            <div className="h-12 w-12 bg-zinc-50 rounded-full flex items-center justify-center mx-auto mb-3 text-zinc-300">
                                <Clock size={24} />
                            </div>
                            <p className="text-sm text-zinc-400 font-medium">Sin actividad reciente</p>
                        </div>
                    ) : (
                        notifications.map((item, index) => (
                            <div key={`${item.id}-${index}`} className="flex gap-3 p-3 border border-zinc-100 hover:border-zinc-200 bg-white shadow-sm rounded-xl transition-all">
                                {/* Minimalist Icon Bubble */}
                                <div className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center border ${getLocationStyles(item.type)}`}>
                                    {getIcon(item.type)}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start gap-2">
                                        <h3 className="font-semibold text-zinc-900 truncate text-sm">
                                            {item.title}
                                        </h3>
                                        <span className="flex-shrink-0 text-[10px] text-zinc-400 font-medium">
                                            {format(new Date(item.timestamp), "h:mm a")}
                                        </span>
                                    </div>

                                    <p className="text-xs text-zinc-500 mt-0.5 line-clamp-1">
                                        {item.description}
                                    </p>

                                    {item.type === 'FALLA' && (
                                        <div className="flex gap-2 mt-2">
                                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${item.metadata.priority === 'Crítica' ? 'bg-red-50 text-red-700 border-red-100' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>
                                                {item.metadata.priority}
                                            </span>
                                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-zinc-50 text-zinc-600 border border-zinc-100">
                                                {item.metadata.status}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </main>
    )
}
