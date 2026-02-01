"use client"

import { useState, useEffect } from "react"
import { Capacitor } from "@capacitor/core"
import { X, Download, Smartphone } from "lucide-react"
import { Button } from "@/components/ui/button"
import Image from "next/image"

export function InstallPrompt() {
    const [isVisible, setIsVisible] = useState(false)

    useEffect(() => {
        // 1. Check if Native (Don't show on Android/iOS app)
        if (Capacitor.isNativePlatform()) return

        // 2. Check if dismissed recently (e.g., 24h cooldown)
        const dismissedAt = localStorage.getItem("install_prompt_dismissed")
        if (dismissedAt) {
            const diff = Date.now() - parseInt(dismissedAt)
            // 24 hours = 86400000 ms
            if (diff < 86400000) return
        }

        // Show after small delay
        setTimeout(() => setIsVisible(true), 2000)
    }, [])

    const handleDismiss = () => {
        setIsVisible(false)
        localStorage.setItem("install_prompt_dismissed", Date.now().toString())
    }

    if (!isVisible) return null

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6 animate-in slide-in-from-bottom-full duration-500">
            <div className="max-w-md mx-auto bg-white/90 backdrop-blur-xl border border-zinc-200 shadow-2xl rounded-3xl p-5 relative overflow-hidden">

                {/* Background Decor */}
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

                <button
                    onClick={handleDismiss}
                    className="absolute top-4 right-4 p-1 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-full transition-colors"
                >
                    <X size={18} />
                </button>

                <div className="flex gap-5 items-start">
                    <div className="relative w-16 h-16 shrink-0 rounded-2xl overflow-hidden shadow-lg border border-zinc-100 bg-white">
                        <Image src="/logo.png" alt="App Logo" fill className="object-contain p-2" />
                    </div>

                    <div className="flex-1 pt-1">
                        <h3 className="font-bold text-lg text-zinc-900 leading-tight mb-1">
                            Descarga la App Oficial
                        </h3>
                        <p className="text-sm text-zinc-500 mb-4 leading-relaxed">
                            Obtén la mejor experiencia con notificaciones, acceso offline y GPS.
                        </p>

                        <div className="flex gap-2">
                            <Button
                                className="rounded-full bg-zinc-900 text-white hover:bg-zinc-800 shadow-lg shadow-zinc-900/10 text-xs h-9 px-4"
                                onClick={() => window.open("/app-release.apk", "_blank")}
                            >
                                <Download size={14} className="mr-2" />
                                Descargar APK
                            </Button>
                            <Button
                                variant="ghost"
                                className="rounded-full text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 text-xs h-9 px-4"
                                onClick={handleDismiss}
                            >
                                Quizás luego
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
