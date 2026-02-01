"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { usePushNotifications } from "@/hooks/usePushNotifications"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

export default function DebugPage() {
    const [user, setUser] = useState<any>(null)
    const [profile, setProfile] = useState<any>(null)
    const [dbDevice, setDbDevice] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    // Use the hook to get the ACTUAL client-side token
    const { token: clientToken } = usePushNotifications(user?.id)

    const supabase = createClient()

    useEffect(() => {
        loadData()
    }, [])

    useEffect(() => {
        if (user && clientToken) {
            checkDbDevice(user.id, clientToken)
        }
    }, [user, clientToken])

    async function loadData() {
        const { data: { user } } = await supabase.auth.getUser()
        setUser(user)

        if (user) {
            const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
            setProfile(data)
        }
        setLoading(false)
    }

    async function checkDbDevice(userId: string, token: string) {
        const { data } = await supabase
            .from('user_devices')
            .select('*')
            .eq('user_id', userId)
            .eq('fcm_token', token)
            .maybeSingle()
        setDbDevice(data)
    }

    const [apiResponse, setApiResponse] = useState<any>(null)

    async function testPush() {
        if (!clientToken) return toast.error("No hay token para probar")

        toast.info("Enviando prueba directa...")
        setApiResponse("Enviando...")

        try {
            const { data, error } = await supabase.functions.invoke('send-push', {
                body: {
                    type: 'INSERT',
                    table: 'fallas',
                    record: {
                        prioridad: 'Alta',
                        descripcion: 'PRUEBA DIRECTA DE DIAGNOSTICO - ' + new Date().toLocaleTimeString()
                    }
                }
            })

            console.log("Function response:", data, error)
            setApiResponse(error || data)

            if (data && data.success) {
                toast.success(`Enviado! Success: ${data.successCount}, Fail: ${data.failureCount}`)
            } else if (error) {
                toast.error("Error invoando función: " + error.message)
            }
        } catch (e: any) {
            console.error(e)
            setApiResponse({ error: e.message })
            toast.error("Excepción invocando función")
        }
    }

    if (loading) return <div className="p-10">Cargando diagnóstico...</div>

    return (
        <div className="p-8 max-w-2xl mx-auto space-y-8 bg-zinc-50 min-h-screen">
            <h1 className="text-2xl font-bold">Diagnóstico de Notificaciones</h1>

            <section className="bg-white p-6 rounded-2xl border border-zinc-200 space-y-4">
                <h2 className="font-bold text-lg border-b pb-2">1. Usuario Local</h2>
                <div className="grid grid-cols-2 gap-2 text-sm">
                    <span className="text-zinc-500">User ID:</span>
                    <span className="font-mono text-xs">{user?.id}</span>

                    <span className="text-zinc-500">Job Title:</span>
                    <span className={`font-bold ${['Presidente', 'Gerente General', 'Gerente de Operaciones', 'Mecánico'].includes(profile?.job_title) ? 'text-green-600' : 'text-red-500'}`}>
                        {profile?.job_title || 'N/A'}
                        {['Presidente', 'Gerente General', 'Gerente de Operaciones', 'Mecánico'].includes(profile?.job_title) ? ' (VALIDO)' : ' (INVALIDO)'}
                    </span>
                </div>
            </section>

            <section className="bg-white p-6 rounded-2xl border border-zinc-200 space-y-4">
                <h2 className="font-bold text-lg border-b pb-2">2. Token del Dispositivo (Client Side)</h2>
                {clientToken ? (
                    <div className="bg-green-50 text-green-800 p-4 rounded-xl break-all font-mono text-xs border border-green-200">
                        {clientToken}
                    </div>
                ) : (
                    <div className="bg-red-50 text-red-800 p-4 rounded-xl border border-red-200">
                        No se ha generado Token FCM. ¿Estás en un dispositivo real/emulador con Google Play Services?
                    </div>
                )}
            </section>

            <section className="bg-white p-6 rounded-2xl border border-zinc-200 space-y-4">
                <h2 className="font-bold text-lg border-b pb-2">3. Persistencia en Base de Datos</h2>
                {dbDevice ? (
                    <div className="flex items-center gap-2 text-green-600 font-bold">
                        <span>✅ Token guardado correctamente en backend.</span>
                    </div>
                ) : (
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-red-600 font-bold">
                            <span>❌ El token NO está en la base de datos.</span>
                        </div>
                        <p className="text-xs text-zinc-500">El backend no puede enviar nada si no tiene este token registrado.</p>
                    </div>
                )}
            </section>

            <section className="space-y-4">
                <Button onClick={testPush} className="w-full h-12 text-lg" disabled={!clientToken}>
                    Provocar Evento de Prueba (Test Directo)
                </Button>

                {apiResponse && (
                    <div className="bg-zinc-900 text-green-400 p-4 rounded-xl font-mono text-xs overflow-auto max-h-60">
                        <h3 className="text-white font-bold mb-2">Respuesta del Servidor:</h3>
                        <pre>{JSON.stringify(apiResponse, null, 2)}</pre>
                    </div>
                )}
            </section>
        </div>
    )
}
