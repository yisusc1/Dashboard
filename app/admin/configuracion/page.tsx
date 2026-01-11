"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { INITIAL_MODULES_CONFIG } from "@/lib/constants"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Save, AlertCircle, Bot, Zap, Mic, MicOff } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import { getSystemSettings, toggleGeminiEnabled, toggleVoiceEnabled } from "../settings-actions"

export default function AdminConfigModulesPage() {
    const [settings, setSettings] = useState<Record<string, boolean>>({})
    const [systemSettings, setSystemSettings] = useState<Record<string, any>>({})
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [tableExists, setTableExists] = useState(true)

    useEffect(() => {
        loadSettings()
    }, [])

    async function loadSettings() {
        try {
            const supabase = createClient()
            const { data, error } = await supabase.from('app_settings').select('*')

            if (error) {
                // Determine if error is "table not found"
                if (error.code === '42P01') {
                    setTableExists(false)
                }
                console.error("Config load error:", error)
            }

            // Defaults
            const currentSettings: Record<string, boolean> = {}
            INITIAL_MODULES_CONFIG.forEach(m => {
                currentSettings[m.key] = m.default
            })

            // Merge DB
            if (data) {
                data.forEach((item: any) => {
                    currentSettings[item.key] = item.value
                })
            }

            setSettings(currentSettings)

            // Load System Settings (Backend Flags)
            const sys = await getSystemSettings()
            setSystemSettings(sys)

        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    async function handleSave() {
        setSaving(true)
        try {
            const supabase = createClient()

            if (!tableExists) {
                toast.error("Error: Tabla 'app_settings' no existe en DB.")
                return
            }

            const updates = Object.entries(settings).map(([key, value]) => ({
                key,
                value,
                label: INITIAL_MODULES_CONFIG.find(m => m.key === key)?.label
            }))

            const { error } = await supabase.from('app_settings').upsert(updates)

            if (error) throw error

            toast.success("Configuración guardada")
        } catch (error) {
            console.error(error)
            toast.error("Error al guardar")
        } finally {
            setSaving(false)
        }
    }

    const toggle = (key: string) => {
        setSettings(prev => ({
            ...prev,
            [key]: !prev[key]
        }))
    }

    if (loading) return <div className="p-10 text-center">Cargando configuración...</div>

    return (
        <main className="min-h-screen bg-zinc-50 p-6 md:p-12">
            <div className="max-w-3xl mx-auto">
                <div className="mb-8">
                    <Link href="/admin" className="text-zinc-500 hover:text-zinc-900 flex items-center mb-4 transition-colors">
                        <ArrowLeft size={16} className="mr-2" />
                        Volver al Panel
                    </Link>
                    <h1 className="text-3xl font-bold text-zinc-900">Gestión de Módulos</h1>
                    <p className="text-zinc-500 mt-1">Habilita o deshabilita secciones del sistema.</p>
                </div>

                {!tableExists && (
                    <div className="mb-8 bg-amber-50 border border-amber-200 rounded-2xl p-6 flex flex-col gap-4">
                        <div className="flex items-center gap-2 text-amber-700 font-bold">
                            <AlertCircle />
                            <span>Configuración de Base de Datos Necesaria</span>
                        </div>
                        <p className="text-sm text-amber-700">
                            Para usar esta función, ejecuta el siguiente comando SQL en Supabase:
                        </p>
                        <pre className="bg-white p-4 rounded-xl border border-amber-100 text-xs font-mono overflow-auto">
                            {`create table if not exists app_settings (
    key text primary key,
    value boolean default true,
    label text
);

-- Habilitar RLS público por simplicidad o restringir a admin
alter table app_settings enable row level security;
create policy "Public Read" on app_settings for select using (true);
create policy "Admin Update" on app_settings for all using (true); -- Ajustar en prod`}
                        </pre>
                    </div>
                )}
                {/* SYSTEM AI SETTINGS */}
                <Card className="rounded-[32px] border-none shadow-sm mb-8 overflow-hidden">
                    <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50/50">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-lg shadow-blue-200">
                                <Bot size={20} />
                            </div>
                            <div>
                                <CardTitle className="text-blue-900">Inteligencia Artificial (Gemini)</CardTitle>
                                <CardDescription className="text-blue-700/80">Control global del modelo de lenguaje.</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6 pt-6">
                        <div className="flex items-center justify-between p-4 rounded-2xl bg-white border border-blue-100 shadow-sm">
                            <div className="flex items-start gap-3">
                                <div className={`mt-1 h-2 w-2 rounded-full ${systemSettings["GEMINI_ENABLED"] !== false ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" : "bg-red-400"}`}></div>
                                <div>
                                    <div className="font-semibold text-zinc-900 flex items-center gap-2">
                                        Activar Linky (AI Assistant)
                                        {systemSettings["GEMINI_ENABLED"] !== false && <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">ACTIVO</span>}
                                    </div>
                                    <div className="text-xs text-zinc-500 max-w-sm mt-1">
                                        Si se desactiva, el asistente responderá "Deshabilitado por el administrador" y no consumirá cuota de API.
                                    </div>
                                </div>
                            </div>
                            <Switch
                                checked={systemSettings["GEMINI_ENABLED"] !== false}
                                onCheckedChange={async () => {
                                    // Optimistic update
                                    setSystemSettings(prev => ({ ...prev, "GEMINI_ENABLED": !prev["GEMINI_ENABLED"] }))
                                    try {
                                        await toggleGeminiEnabled()
                                        toast.success("Estado de IA actualizado")
                                    } catch (e) {
                                        toast.error("Error al actualizar")
                                        loadSettings() // Revert
                                    }
                                }}
                                className="data-[state=checked]:bg-blue-600"
                            />
                        </div>

                        {/* VOICE UI TOGGLE */}
                        <div className="flex items-center justify-between p-4 rounded-2xl bg-white border border-indigo-100 shadow-sm">
                            <div className="flex items-start gap-3">
                                <div className={`mt-2 h-8 w-8 rounded-full flex items-center justify-center ${systemSettings["VOICE_ENABLED"] !== false ? "bg-indigo-100 text-indigo-600" : "bg-gray-100 text-gray-400"}`}>
                                    {systemSettings["VOICE_ENABLED"] !== false ? <Mic size={16} /> : <MicOff size={16} />}
                                </div>
                                <div>
                                    <div className="font-semibold text-zinc-900 flex items-center gap-2">
                                        Interfaz de Voz (Micrófono)
                                        {systemSettings["VOICE_ENABLED"] !== false && <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-bold">VISIBLE</span>}
                                    </div>
                                    <div className="text-xs text-zinc-500 max-w-sm mt-1">
                                        Ocultar completamente el botón flotante y desactivar la escucha en toda la aplicación.
                                    </div>
                                </div>
                            </div>
                            <Switch
                                checked={systemSettings["VOICE_ENABLED"] !== false}
                                onCheckedChange={async () => {
                                    setSystemSettings(prev => ({ ...prev, "VOICE_ENABLED": !prev["VOICE_ENABLED"] }))
                                    try {
                                        await toggleVoiceEnabled()
                                        toast.success("Interfaz de voz actualizada. Recarga si es necesario.")
                                    } catch (e) {
                                        toast.error("Error al actualizar")
                                        loadSettings()
                                    }
                                }}
                                className="data-[state=checked]:bg-indigo-600"
                            />
                        </div>
                    </CardContent>
                </Card>

                <Card className="rounded-[32px] border-none shadow-sm">
                    <CardHeader>
                        <CardTitle>Visibilidad de Paneles</CardTitle>
                        <CardDescription>Los paneles deshabilitados se ocultarán del menú principal para todos los usuarios.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {INITIAL_MODULES_CONFIG.map((module) => (
                            <div key={module.key} className="flex items-center justify-between p-4 rounded-2xl bg-zinc-50 border border-zinc-100">
                                <div>
                                    <div className="font-semibold text-zinc-900">{module.label}</div>
                                    <div className="text-xs text-zinc-400 font-mono">{module.path}</div>
                                </div>
                                <Switch
                                    checked={settings[module.key]}
                                    onCheckedChange={() => toggle(module.key)}
                                />
                            </div>
                        ))}

                        <div className="pt-4 flex justify-end">
                            <Button
                                onClick={handleSave}
                                disabled={saving || !tableExists}
                                className="h-12 px-8 rounded-xl bg-black text-white hover:bg-zinc-800"
                            >
                                {saving ? "Guardando..." : "Guardar Cambios"}
                                <Save size={18} className="ml-2" />
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </main>
    )
}
