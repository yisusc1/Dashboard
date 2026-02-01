import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { getNotificationHistory } from "../actions"
import { ArrowLeft } from "lucide-react"
import { NotificationList } from "./notification-list"

export const dynamic = "force-dynamic"

export default async function NotificationsPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) redirect("/login")

    const notifications = await getNotificationHistory()

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

                <NotificationList initialNotifications={notifications} />
            </div>
        </main>
    )
}
