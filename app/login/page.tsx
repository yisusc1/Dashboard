"use client"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Chrome } from "lucide-react"
import Image from "next/image"
import { useState, useEffect } from "react"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useRouter } from "next/navigation"



export default function LoginPage() {
    const [loading, setLoading] = useState(false)

    const router = useRouter()
    const [email, setEmail] = useState("") // keep unused imports if they exist
    const [username, setUsername] = useState("")
    const [password, setPassword] = useState("")



    const handleLogin = async () => {
        setLoading(true)
        try {
            const supabase = createClient()



            // Web Flow
            const redirectTo = `${window.location.origin}/auth/callback`
            console.log("DEBUG LOGIN: Redirecting to:", redirectTo)

            const { error } = await supabase.auth.signInWithOAuth({
                provider: "google",
                options: {
                    redirectTo,
                },
            })

            if (error) throw error
        } catch (error: any) {
            console.error("Error logging in:", error)
            // Extract detailed error message if available
            const errorMessage = error?.message || error?.error?.message || JSON.stringify(error) || "Error desconocido"
            toast.error(`Error Google: ${errorMessage}`)
            setLoading(false)
        }
    }

    const handleEmailLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        const supabase = createClient()

        // Helper to get virtual email
        const getVirtualEmail = (user: string) => {
            if (user.includes('@')) return user;
            return `${user.toLowerCase().trim()}@dashboard.local`;
        }

        const virtualEmail = getVirtualEmail(username);

        const { error } = await supabase.auth.signInWithPassword({
            email: virtualEmail,
            password
        })

        if (error) {
            toast.error("Error: " + error.message)
            setLoading(false)
        } else {
            toast.success("Bienvenido")
            router.push("/")
            router.refresh()
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
                        <Image src="/logo.png" alt="Logo" width={64} height={64} className="w-16 h-16 object-contain" />
                    </div>

                    <div className="space-y-2 animate-in slide-in-from-bottom-4 duration-700 fade-in fill-mode-both delay-100">
                        <h1 className="text-3xl font-semibold tracking-tight text-gray-900">
                            Bienvenido
                        </h1>

                    </div>

                    <div className="w-full space-y-4 pt-4 animate-in slide-in-from-bottom-8 duration-700 fade-in fill-mode-both delay-200">

                        {/* Manual Login Form */}
                        <form onSubmit={handleEmailLogin} className="space-y-3 mb-6">
                            <div className="space-y-1 text-left">
                                <Label className="text-xs text-gray-500 ml-1">Usuario</Label>
                                <Input
                                    type="text"
                                    value={username}
                                    onChange={e => setUsername(e.target.value)}
                                    className="rounded-xl border-gray-200 bg-gray-50/50"
                                    placeholder="jlima"
                                />
                            </div>
                            <div className="space-y-1 text-left">
                                <Label className="text-xs text-gray-500 ml-1">Contraseña</Label>
                                <Input
                                    type="password"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    className="rounded-xl border-gray-200 bg-gray-50/50"
                                    placeholder="••••••••"
                                />
                            </div>
                            <Button
                                type="submit"
                                variant="outline"
                                className="w-full rounded-xl h-11 border-gray-200 text-gray-700 hover:bg-gray-50 mb-2"
                                disabled={loading || !username || !password}
                            >
                                {loading ? "Procesando..." : "Iniciar Sesión"}
                            </Button>

                            <div className="text-center">
                                <button
                                    type="button"
                                    onClick={async () => {
                                        if (!username) {
                                            toast.error("Ingresa tu Usuario primero para recuperar la contraseña");
                                            return;
                                        }
                                        setLoading(true);
                                        try {
                                            const { recoverPassword } = await import("./actions");
                                            const result = await recoverPassword(username);
                                            if (result.success) {
                                                toast.success(result.message, { duration: 8000 });
                                            } else {
                                                toast.error(result.message, { duration: 8000 });
                                            }
                                        } catch (e) {
                                            toast.error("Error al procesar la solicitud");
                                        } finally {
                                            setLoading(false);
                                        }
                                    }}
                                    className="text-xs text-blue-600 hover:underline"
                                    disabled={loading}
                                >
                                    ¿Olvidaste tu contraseña?
                                </button>
                            </div>
                        </form>

                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t border-gray-200" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-white px-2 text-gray-400">O continúa con</span>
                            </div>
                        </div>
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
