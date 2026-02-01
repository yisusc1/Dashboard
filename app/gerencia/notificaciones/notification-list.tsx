"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { AlertTriangle, Car, ArrowRightLeft, Clock, Trash2 } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import type { NotificationItem } from "../actions"

export function NotificationList({ initialNotifications }: { initialNotifications: NotificationItem[] }) {
    const [notifications, setNotifications] = useState(initialNotifications)

    const removeNotification = (id: string) => {
        setNotifications((prev) => prev.filter((n) => n.id !== id))
    }

    const getIcon = (type: string) => {
        switch (type) {
            case 'FALLA': return <AlertTriangle size={18} className="text-zinc-900" />
            case 'SALIDA': return <Car size={18} className="text-zinc-900" />
            case 'ENTRADA': return <ArrowRightLeft size={18} className="text-zinc-900" />
            default: return <Clock size={18} className="text-zinc-900" />
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

    const getTypeLabel = (type: string) => {
        switch (type) {
            case 'FALLA': return 'Falla'
            case 'SALIDA': return 'Salida'
            case 'ENTRADA': return 'Entrada'
            default: return 'Alerta'
        }
    }

    const getTypeBadgeStyles = (type: string) => {
        switch (type) {
            case 'FALLA': return 'bg-amber-50 text-amber-700 border border-amber-200'
            case 'SALIDA': return 'bg-blue-50 text-blue-700 border border-blue-200'
            case 'ENTRADA': return 'bg-green-50 text-green-700 border border-green-200'
            default: return 'bg-zinc-50 text-zinc-700 border border-zinc-200'
        }
    }

    // Group notifications by date
    const groupedNotifications = notifications.reduce((groups, notification) => {
        const date = new Date(notification.timestamp)
        let key = 'Anterior'

        const today = new Date()
        const yesterday = new Date()
        yesterday.setDate(yesterday.getDate() - 1)

        if (date.toDateString() === today.toDateString()) {
            key = 'Hoy'
        } else if (date.toDateString() === yesterday.toDateString()) {
            key = 'Ayer'
        } else {
            key = format(date, "d 'de' MMMM", { locale: es })
        }

        if (!groups[key]) {
            groups[key] = []
        }
        groups[key].push(notification)
        return groups
    }, {} as Record<string, NotificationItem[]>)

    return (
        <div className="space-y-6">
            {notifications.length === 0 ? (
                <div className="text-center py-20">
                    <div className="h-12 w-12 bg-zinc-50 rounded-full flex items-center justify-center mx-auto mb-3 text-zinc-300">
                        <Clock size={24} />
                    </div>
                    <p className="text-sm text-zinc-400 font-medium">Sin actividad reciente</p>
                </div>
            ) : (
                Object.entries(groupedNotifications).map(([dateLabel, groupItems]) => (
                    <div key={dateLabel} className="space-y-3">
                        <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider ml-1">{dateLabel}</h2>
                        <AnimatePresence>
                            {groupItems.map((item) => (
                                <motion.div
                                    key={item.id}
                                    layout
                                    initial={{ opacity: 1, x: 0, height: "auto" }}
                                    exit={{ opacity: 0, x: 200, height: 0, marginBottom: 0 }}
                                    transition={{ duration: 0.2 }}
                                    drag="x"
                                    dragConstraints={{ left: 0, right: 0 }}
                                    onDragEnd={(_, info) => {
                                        if (info.offset.x > 100) {
                                            removeNotification(item.id)
                                        }
                                    }}
                                    className="relative group cursor-grab active:cursor-grabbing touch-pan-y"
                                >
                                    {/* Background Trash Icon (Revealed on Drag) */}
                                    <div className="absolute inset-y-0 left-0 bg-red-500 rounded-xl flex items-center px-4 w-full justify-start -z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Trash2 className="text-white" size={20} />
                                    </div>

                                    <div className="flex gap-3 p-3 border border-zinc-100 hover:border-zinc-200 bg-white shadow-sm rounded-xl transition-all relative z-10">
                                        {/* Minimalist Icon Bubble */}
                                        <div className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center border ${getLocationStyles(item.type)}`}>
                                            {getIcon(item.type)}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start gap-2">
                                                <div className="flex items-center gap-2 overflow-hidden">
                                                    <h3 className="font-semibold text-zinc-900 truncate text-sm">
                                                        {item.title}
                                                    </h3>
                                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${getTypeBadgeStyles(item.type)}`}>
                                                        {getTypeLabel(item.type)}
                                                    </span>
                                                </div>
                                                <span className="flex-shrink-0 text-[10px] text-zinc-400 font-medium">
                                                    {format(new Date(item.timestamp), "h:mm a")}
                                                </span>
                                            </div>

                                            <div className="text-xs text-zinc-500 mt-0.5 flex items-center gap-1.5">
                                                <span>{item.description}</span>
                                                {(item.type === 'SALIDA' || item.type === 'ENTRADA') && (
                                                    <>
                                                        <span className="text-zinc-300">•</span>
                                                        <span className="font-medium text-zinc-600">
                                                            {format(new Date(item.timestamp), "h:mm a")}
                                                        </span>
                                                    </>
                                                )}
                                            </div>

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
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                ))
            )}
        </div>
    )
}
