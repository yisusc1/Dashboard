"use client"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Chrome } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

export default function LoginPage() {
    const [loading, setLoading] = useState(false)

    const handleLogin = async () => {
        setLoading(true)
        try {
            const supabase = createClient()
            const { error } = await supabase.auth.signInWithOAuth({
                provider: "google",
                options: {
                    redirectTo: `${window.location.origin}/auth/callback`,
                },
            })

            if (error) throw error
        } catch (error) {
            console.error("Error logging in:", error)
            toast.error("Error al iniciar sesión")
            setLoading(false)
        }
    }

    return (
        <main className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden bg-[#F2F2F7]">
            {/* Background Gradients - Subtle Silver/Gray */}
            <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-gray-200/50 blur-[100px]" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-slate-200/50 blur-[100px]" />

            {/* Glass Card - Light Mode iOS Style */}
            <div className="w-full max-w-md relative z-10 backdrop-blur-xl bg-white/70 border border-white/40 rounded-[2.5rem] p-8 shadow-xl shadow-black/5 ring-1 ring-white/60">
                <div className="flex flex-col items-center text-center space-y-8 py-8">
                    {/* Logo Area */}
                    <div className="w-24 h-24 bg-gradient-to-br from-white to-gray-100 rounded-2xl flex items-center justify-center shadow-[0_8px_30px_rgb(0,0,0,0.04)] mb-2 animate-in zoom-in duration-500 border border-white/60">
                        <div className="w-12 h-12 border-4 border-gray-900 rounded-xl" />
                    </div>

                    <div className="space-y-2 animate-in slide-in-from-bottom-4 duration-700 fade-in fill-mode-both delay-100">
                        <h1 className="text-3xl font-semibold tracking-tight text-gray-900">
                            Bienvenido
                        </h1>
                        <p className="text-gray-500 text-sm font-medium tracking-wide uppercase">
                            Sistema de Gestión y Operatividad
                        </p>
                    </div>

                    <div className="w-full space-y-4 pt-4 animate-in slide-in-from-bottom-8 duration-700 fade-in fill-mode-both delay-200">
                        <Button
                            onClick={handleLogin}
                            className="w-full h-14 rounded-full text-base font-medium bg-gray-900 text-white hover:bg-black transition-all duration-300 shadow-lg shadow-gray-900/10 hover:scale-[1.02] active:scale-[0.98]"
                            disabled={loading}
                        >
                            {loading ? (
                                <span className="animate-pulse">Conectando...</span>
                            ) : (
                                <div className="flex items-center justify-center gap-3">
                                    <Chrome className="w-5 h-5 text-white" />
                                    <span>Continuar con Google</span>
                                </div>
                            )}
                        </Button>

                        <p className="text-xs text-center text-gray-400">
                            Acceso seguro restringido a personal autorizado
                        </p>
                    </div>
                </div>
            </div>
        </main>
    )
}
