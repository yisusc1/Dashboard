"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Bell } from "lucide-react"
import { getNotificationHistory } from "../actions"

export function NotificationBell() {
    const [unreadCount, setUnreadCount] = useState(0)

    useEffect(() => {
        const checkUnread = async () => {
            const lastCheck = localStorage.getItem('last_notification_check') || new Date(0).toISOString()
            const notifications = await getNotificationHistory(0, 20) // Fetch just enough to check recent ones

            const count = notifications.filter(n => new Date(n.timestamp) > new Date(lastCheck)).length
            setUnreadCount(count)
        }

        checkUnread()
        // Optional: Poll every minute or listen to realtime events if needed
        const interval = setInterval(checkUnread, 60000)
        return () => clearInterval(interval)
    }, [])

    return (
        <Link href="/gerencia/notificaciones" className="relative flex items-center justify-center h-10 w-10 rounded-full bg-white/80 backdrop-blur-md border border-zinc-100/50 text-zinc-400 hover:text-zinc-900 hover:bg-white hover:shadow-md transition-all duration-300" title="Ver Historial de Notificaciones">
            <span className="sr-only">Notificaciones</span>
            <Bell size={20} strokeWidth={2} />

            {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-zinc-50 shadow-sm animate-in zoom-in-50 duration-300">
                    {unreadCount > 9 ? '9+' : unreadCount}
                </span>
            )}
        </Link>
    )
}
