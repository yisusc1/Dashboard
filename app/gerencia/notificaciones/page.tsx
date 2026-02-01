import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { getNotificationHistory } from "../actions"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
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
            case 'FALLA': return <AlertTriangle className="text-white" size={20} />
            case 'SALIDA': return <Car className="text-white" size={20} />
            case 'ENTRADA': return <ArrowRightLeft className="text-white" size={20} />
            default: return <Clock className="text-white" size={20} />
        }
    }

    const getColor = (type: string, priority?: string) => {
        if (type === 'FALLA') {
            if (priority === 'Crítica') return "bg-red-500 shadow-red-200"
            if (priority === 'Alta') return "bg-orange-500 shadow-orange-200"
            return "bg-amber-500 shadow-amber-200"
        }
        if (type === 'SALIDA') return "bg-blue-500 shadow-blue-200"
        if (type === 'ENTRADA') return "bg-green-500 shadow-green-200"
        return "bg-zinc-500"
    }

    return (
        <main className="min-h-screen bg-zinc-50 p-4 md:p-8 max-w-4xl mx-auto">
            <div className="flex items-center gap-4 mb-8">
                <Link href="/gerencia" className="p-2 rounded-full bg-white border border-zinc-200 hover:bg-zinc-50 transition-colors">
                    <ArrowLeft size={20} className="text-zinc-600" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-zinc-900">Historial de Notificaciones</h1>
                    <p className="text-zinc-500 text-sm">Registro de actividad y alertas</p>
                </div>
            </div>

            <div className="space-y-4 relative">
                {/* Timeline Line */}
                <div className="absolute left-[27px] top-4 bottom-4 w-[2px] bg-zinc-200 z-0 hidden md:block" />

                {notifications.length === 0 ? (
                    <div className="text-center py-12 text-zinc-400">
                        No hay notificaciones recientes.
                    </div>
                ) : (
                    notifications.map((item, index) => (
                        <div key={`${item.id}-${index}`} className="flex gap-4 relative z-10">
                            {/* Icon Bubble */}
                            <div className={`flex-shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg ${getColor(item.type, item.metadata.priority)}`}>
                                {getIcon(item.type)}
                            </div>

                            {/* Content Card */}
                            <Card className="flex-1 p-4 border-zinc-100 shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex justify-between items-start mb-1">
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline" className="font-bold bg-zinc-50">
                                            {item.vehicle_plate}
                                        </Badge>
                                        <span className="text-sm font-bold text-zinc-900">{item.title}</span>
                                    </div>
                                    <span className="text-xs text-zinc-400 whitespace-nowrap capitalize">
                                        {format(new Date(item.timestamp), "d MMM, h:mm a", { locale: es })}
                                    </span>
                                </div>

                                <p className="text-zinc-600 text-sm leading-relaxed">
                                    {item.description}
                                </p>

                                {item.type === 'FALLA' && (
                                    <div className="mt-2 flex gap-2">
                                        <Badge className={`text-[10px] ${item.metadata.priority === 'Crítica' ? 'bg-red-100 text-red-700 hover:bg-red-100' : 'bg-amber-100 text-amber-700 hover:bg-amber-100'}`}>
                                            Prioridad: {item.metadata.priority}
                                        </Badge>
                                        <Badge variant="secondary" className="text-[10px]">
                                            Estado: {item.metadata.status}
                                        </Badge>
                                    </div>
                                )}
                            </Card>
                        </div>
                    ))
                )}
            </div>
        </main>
    )
}
