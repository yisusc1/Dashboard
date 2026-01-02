"use server"

import { getSystemSettings, toggleInstallationRestriction } from "./settings-actions"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Settings, ShieldAlert, Lock, Unlock, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { revalidatePath } from "next/cache"
import { ToggleSetting } from "./toggle-setting"

export default async function AdminDashboard() {
    const settings = await getSystemSettings()
    const restrictionsEnabled = settings["INSTALLATION_RESTRICTIONS_ENABLED"]

    return (
        <div className="min-h-screen bg-slate-50/50 p-6 md:p-10">
            <div className="max-w-4xl mx-auto mb-10">
                <div className="flex items-center gap-2 mb-2">
                    <Link href="/" className="p-2 -ml-2 rounded-full hover:bg-slate-200/50 transition-colors text-slate-500">
                        <ArrowLeft size={24} />
                    </Link>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">Panel de Administración</h1>
                </div>
                <p className="text-slate-500">Configuración global del sistema.</p>
            </div>

            <div className="max-w-4xl mx-auto space-y-6">

                {/* SETTINGS CARD */}
                <Card className="rounded-2xl border-slate-200 shadow-sm bg-white overflow-hidden">
                    <CardHeader className="bg-slate-50 border-b border-slate-100">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
                                <Settings size={24} />
                            </div>
                            <div>
                                <CardTitle>Configuración de Operaciones</CardTitle>
                                <CardDescription>Controla las reglas de negocio globales</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-6 divide-y divide-slate-100">

                        {/* RESTRICTION TOGGLE */}
                        <div className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
                            <div className="flex items-start gap-4">
                                <div className={`p-2 rounded-full ${restrictionsEnabled ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                                    {restrictionsEnabled ? <Lock size={20} /> : <Unlock size={20} />}
                                </div>
                                <div>
                                    <h3 className="font-semibold text-slate-900">Restricciones de Instalación (Kit Mínimo)</h3>
                                    <p className="text-sm text-slate-500 max-w-lg mt-1">
                                        Si está activo, los técnicos NO podrán iniciar una instalación si no tienen el inventario completo (ONU, Cable, Conectores, etc).
                                    </p>
                                    <div className="mt-2">
                                        {restrictionsEnabled ? (
                                            <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none">Activo</Badge>
                                        ) : (
                                            <Badge variant="outline" className="text-slate-500 bg-slate-50">Desactivado</Badge>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <ToggleSetting
                                initialState={restrictionsEnabled}
                                action={toggleInstallationRestriction}
                            />
                        </div>

                    </CardContent>
                </Card>

                {/* QUICK LINKS */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Link href="/admin/usuarios" className="block">
                        <Card className="rounded-xl hover:shadow-md transition-shadow cursor-pointer border-slate-200">
                            <CardContent className="p-6 flex items-center justify-between">
                                <div className="space-y-1">
                                    <h3 className="font-bold text-slate-900">Gestión de Usuarios</h3>
                                    <p className="text-sm text-slate-500">Roles y Accesos</p>
                                </div>
                                <ArrowLeft className="rotate-180 text-slate-300" />
                            </CardContent>
                        </Card>
                    </Link>
                    <Link href="/admin/vehiculos" className="block">
                        <Card className="rounded-xl hover:shadow-md transition-shadow cursor-pointer border-slate-200">
                            <CardContent className="p-6 flex items-center justify-between">
                                <div className="space-y-1">
                                    <h3 className="font-bold text-slate-900">Flota Vehicular</h3>
                                    <p className="text-sm text-slate-500">Coches y Mantenimiento</p>
                                </div>
                                <ArrowLeft className="rotate-180 text-slate-300" />
                            </CardContent>
                        </Card>
                    </Link>
                </div>

            </div>
        </div>
    )
}
