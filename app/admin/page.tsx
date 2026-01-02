"use client"

import { Card, CardContent } from "@/components/ui/card"
import { ArrowLeft, UserCog, ShieldCheck, LayoutGrid, ArrowRight, Database } from "lucide-react"
import Link from "next/link"

export default function AdminDashboard() {
    return (
        <div className="min-h-screen bg-slate-50/50 p-6 md:p-10">
            <div className="max-w-4xl mx-auto mb-10">
                <div className="flex items-center gap-2 mb-2">
                    <Link href="/" className="p-2 -ml-2 rounded-full hover:bg-slate-200/50 transition-colors text-slate-500">
                        <ArrowLeft size={24} />
                    </Link>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">Panel de Administración</h1>
                </div>
                <p className="text-slate-500">Configuración global del sistema y accesos.</p>
            </div>

            <div className="max-w-4xl mx-auto space-y-6">

                {/* QUICK LINKS */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">

                    {/* GESTION DE MODULOS */}
                    <Link
                        href="/admin/configuracion"
                        className="group relative overflow-hidden bg-white rounded-[32px] p-8 border border-zinc-200 shadow-sm hover:shadow-xl hover:border-violet-300 transition-all duration-300"
                    >
                        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110 duration-500">
                            <LayoutGrid size={100} />
                        </div>
                        <div className="relative z-10 flex flex-col h-full justify-between space-y-6">
                            <div className="w-12 h-12 rounded-2xl bg-violet-50 flex items-center justify-center text-violet-600 group-hover:bg-violet-600 group-hover:text-white transition-colors">
                                <LayoutGrid size={24} />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-zinc-900 mb-2">Gestión de Módulos</h2>
                                <p className="text-zinc-500 text-sm font-medium">Habilitar o deshabilitar paneles del sistema.</p>
                            </div>
                            <div className="flex items-center text-violet-600 font-bold text-sm group-hover:translate-x-1 transition-transform">
                                Configurar <ArrowRight size={16} className="ml-2" />
                            </div>
                        </div>
                    </Link>

                    {/* USUARIOS */}
                    <Link href="/admin/usuarios" className="block">
                        <Card className="rounded-xl hover:shadow-md transition-shadow cursor-pointer border-slate-200">
                            <CardContent className="p-6 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-zinc-100 rounded-lg text-zinc-600">
                                        <UserCog size={24} />
                                    </div>
                                    <div className="space-y-1">
                                        <h3 className="font-bold text-slate-900">Gestión de Usuarios</h3>
                                        <p className="text-sm text-slate-500">Roles, departamentos y permisos de acceso.</p>
                                    </div>
                                </div>
                                <ArrowLeft className="rotate-180 text-slate-300" />
                            </CardContent>
                        </Card>
                    </Link>
                    <Link href="/admin/vehiculos" className="block">
                        <Card className="rounded-xl hover:shadow-md transition-shadow cursor-pointer border-slate-200">
                            <CardContent className="p-6 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-zinc-100 rounded-lg text-zinc-600">
                                        <ShieldCheck size={24} />
                                    </div>
                                    <div className="space-y-1">
                                        <h3 className="font-bold text-slate-900">Flota Vehicular</h3>
                                        <p className="text-sm text-slate-500">Coches, mantenimiento y asignaciones.</p>
                                    </div>
                                </div>
                                <ArrowLeft className="rotate-180 text-slate-300" />
                            </CardContent>
                        </Card>
                    </Link>

                    {/* DATABASE TOOLS */}
                    <Link href="/admin/database" className="block">
                        <Card className="rounded-xl hover:shadow-md transition-shadow cursor-pointer border-slate-200">
                            <CardContent className="p-6 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-slate-100 rounded-lg text-slate-600">
                                        <Database size={24} />
                                    </div>
                                    <div className="space-y-1">
                                        <h3 className="font-bold text-slate-900">Base de Datos</h3>
                                        <p className="text-sm text-slate-500">Limpieza y reseteo para testing.</p>
                                    </div>
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
