"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { INITIAL_MODULES_CONFIG } from "@/lib/constants"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Save, AlertCircle } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

export default function AdminConfigModulesPage() {
    const [settings, setSettings] = useState<Record<string, boolean>>({})
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
