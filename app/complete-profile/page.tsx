"use client"

import { Button } from "@/components/ui/button"
import { useRef, useEffect, useState } from "react"
import { Camera } from "@capacitor/camera"
import { Geolocation } from "@capacitor/geolocation"
import { PushNotifications } from "@capacitor/push-notifications"
import { VoiceRecorder } from "capacitor-voice-recorder"
import { Filesystem } from "@capacitor/filesystem"
import { updateProfile } from "./actions"
import { User, Phone, CreditCard } from "lucide-react"
import { toast } from "sonner"

export default function CompleteProfilePage() {
    const [loading, setLoading] = useState(false)

    // Request native permissions on mount
    useEffect(() => {
        const requestPermissions = async () => {
            try {
                // Geo
                await Geolocation.requestPermissions()
                // Camera & Gallery
                await Camera.requestPermissions()
                // Push
                const result = await PushNotifications.requestPermissions()
                if (result.receive === 'granted') {
                    await PushNotifications.register()
                }
                // Microphone
                await VoiceRecorder.requestAudioRecordingPermission()
                // Files
                await Filesystem.requestPermissions()
            } catch (e) {
                console.warn("Native permissions not available in browser or error:", e)
            }
        }
        requestPermissions()
    }, [])

    return (
        <main className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden bg-[#F2F2F7]">
            {/* Background Gradients - Subtle Silver/Gray */}
            <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-gray-200/50 blur-[100px]" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-slate-200/50 blur-[100px]" />

            {/* Glass Card */}
            <div className="w-full max-w-md relative z-10 backdrop-blur-xl bg-white/70 border border-white/40 rounded-[2.5rem] p-8 shadow-xl shadow-black/5 ring-1 ring-white/60">
                <div className="flex flex-col items-center text-center space-y-6 py-4">

                    <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center shadow-sm mb-2">
                        <User className="w-8 h-8 text-gray-900" />
                    </div>

                    <div className="space-y-2">
                        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
                            Configuración Inicial
                        </h1>
                        <p className="text-gray-500 text-sm font-medium">
                            Registra tus datos y habilita permisos nativos para continuar
                        </p>
                    </div>

                    <form
                        action={async (formData) => {
                            setLoading(true)
                            try {
                                const result = await updateProfile(formData)
                                if (result?.error) {
                                    toast.error(result.error)
                                    setLoading(false)
                                }
                            } catch (error) {
                                // If it's a redirect error, re-throw it so Next.js handles it
                                if ((error as Error).message.includes('NEXT_REDIRECT') || (error as any).digest?.includes('NEXT_REDIRECT')) {
                                    throw error
                                }
                                console.error(error)
                                toast.error("Error inesperado")
                                setLoading(false)
                            }
                        }}
                        className="w-full space-y-4 pt-2 text-left"
                    >
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-gray-400 theme-text-secondary uppercase tracking-wider ml-1">
                                    Nombre
                                </label>
                                <input
                                    name="first_name"
                                    type="text"
                                    required
                                    placeholder="Juan"
                                    className="w-full h-12 px-4 rounded-2xl bg-white/50 border border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none text-gray-900"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-gray-400 theme-text-secondary uppercase tracking-wider ml-1">
                                    Apellido
                                </label>
                                <input
                                    name="last_name"
                                    type="text"
                                    required
                                    placeholder="Pérez"
                                    className="w-full h-12 px-4 rounded-2xl bg-white/50 border border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none text-gray-900"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="national_id" className="text-xs font-semibold text-gray-400 uppercase tracking-wider ml-1 text-gray-400">
                                Cédula de Identidad
                            </label>
                            <div className="relative">
                                <CreditCard className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
                                <input
                                    id="national_id"
                                    name="national_id"
                                    type="text"
                                    required
                                    placeholder="V-12345678"
                                    className="w-full h-12 pl-12 pr-4 rounded-2xl bg-white/50 border border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none text-gray-900 placeholder:text-gray-400"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="phone" className="text-xs font-semibold text-gray-400 uppercase tracking-wider ml-1 text-gray-400">
                                Teléfono móvil
                            </label>
                            <div className="relative">
                                <Phone className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
                                <input
                                    id="phone"
                                    name="phone"
                                    type="tel"
                                    required
                                    placeholder="0414-1234567"
                                    className="w-full h-12 pl-12 pr-4 rounded-2xl bg-white/50 border border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none text-gray-900 placeholder:text-gray-400"
                                />
                            </div>
                        </div>

                        <Button
                            type="submit"
                            className="w-full h-14 mt-4 rounded-full text-base font-medium bg-gray-900 text-white hover:bg-black transition-all duration-300 shadow-lg shadow-gray-900/10 hover:scale-[1.02] active:scale-[0.98]"
                            disabled={loading}
                        >
                            {loading ? "Habilitando funciones..." : "Activar y Continuar"}
                        </Button>
                    </form>
                </div>
            </div>
        </main>
    )
}
