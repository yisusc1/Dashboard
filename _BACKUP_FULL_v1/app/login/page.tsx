"use client"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
        <main className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl font-bold">Bienvenido</CardTitle>
                    <CardDescription>Inicia sesión para acceder al sistema de gestión</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button
                        onClick={handleLogin}
                        className="w-full flex items-center gap-2 bg-white text-slate-900 hover:bg-slate-100 border border-slate-200"
                        disabled={loading}
                    >
                        {loading ? (
                            "Redirigiendo..."
                        ) : (
                            <>
                                <Chrome size={20} />
                                Continuar con Google
                            </>
                        )}
                    </Button>
                </CardContent>
            </Card>
        </main>
    )
}
