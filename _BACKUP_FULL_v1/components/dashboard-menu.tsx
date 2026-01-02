"use client"

import Link from "next/link"
import { Wrench, Truck, ShieldCheck, UserCog, Package, Settings } from "lucide-react"
import { useUser } from "@/components/providers/user-provider"

export function DashboardMenu() {
    const { hasRole, isAdmin, isLoading } = useUser()

    if (isLoading) {
        return <div className="text-center text-zinc-500">Cargando permisos...</div>
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* TECNICOS CARD */}
            {(hasRole("tecnico") || isAdmin) && (
                <Link
                    href="/tecnicos"
                    className="group relative overflow-hidden bg-white rounded-[32px] p-8 border border-zinc-200 shadow-sm hover:shadow-xl hover:border-zinc-300 transition-all duration-300"
                >
                    <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110 duration-500">
                        <Wrench size={120} />
                    </div>
                    <div className="relative z-10 flex flex-col h-full justify-between space-y-8">
                        <div className="w-14 h-14 rounded-2xl bg-zinc-100 flex items-center justify-center text-zinc-900 group-hover:bg-black group-hover:text-white transition-colors">
                            <Wrench size={28} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-zinc-900 mb-2">Técnicos</h2>
                            <p className="text-zinc-500 font-medium">Gestión de instalaciones de fibra óptica y reportes de servicio.</p>
                        </div>
                        <div className="flex items-center text-zinc-900 font-semibold group-hover:translate-x-2 transition-transform">
                            Acceder al Módulo <span className="ml-2">→</span>
                        </div>
                    </div>
                </Link>
            )}

            {/* TRANSPORTE CARD */}
            {(hasRole("transporte") || isAdmin) && (
                <Link
                    href="/transporte"
                    className="group relative overflow-hidden bg-white rounded-[32px] p-8 border border-zinc-200 shadow-sm hover:shadow-xl hover:border-zinc-300 transition-all duration-300"
                >
                    <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110 duration-500">
                        <Truck size={120} />
                    </div>
                    <div className="relative z-10 flex flex-col h-full justify-between space-y-8">
                        <div className="w-14 h-14 rounded-2xl bg-zinc-100 flex items-center justify-center text-zinc-900 group-hover:bg-black group-hover:text-white transition-colors">
                            <Truck size={28} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-zinc-900 mb-2">Transporte</h2>
                            <p className="text-zinc-500 font-medium">Control de flota, auditoría de salidas y reporte de kilometraje.</p>
                        </div>
                        <div className="flex items-center text-zinc-900 font-semibold group-hover:translate-x-2 transition-transform">
                            Acceder al Módulo <span className="ml-2">→</span>
                        </div>
                    </div>
                </Link>
            )}

            {/* TALLER CARD */}
            {(hasRole("taller") || isAdmin) && (
                <Link
                    href="/taller"
                    className="group relative overflow-hidden bg-white rounded-[32px] p-8 border border-zinc-200 shadow-sm hover:shadow-xl hover:border-zinc-300 transition-all duration-300"
                >
                    <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110 duration-500">
                        <Wrench size={120} />
                    </div>
                    <div className="relative z-10 flex flex-col h-full justify-between space-y-8">
                        <div className="w-14 h-14 rounded-2xl bg-zinc-100 flex items-center justify-center text-zinc-900 group-hover:bg-black group-hover:text-white transition-colors">
                            <Wrench size={28} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-zinc-900 mb-2">Taller Mecánico</h2>
                            <p className="text-zinc-500 font-medium">Gestión de fallas, mantenimiento y reparaciones.</p>
                        </div>
                        <div className="flex items-center text-zinc-900 font-semibold group-hover:translate-x-2 transition-transform">
                            Ir al Taller <span className="ml-2">→</span>
                        </div>
                    </div>
                </Link>
            )}

            {/* ADMIN VEHICULOS (Only Admin) */}
            {isAdmin && (
                <Link
                    href="/admin/vehiculos"
                    className="group relative overflow-hidden bg-white rounded-[32px] p-8 border border-zinc-200 shadow-sm hover:shadow-xl hover:border-zinc-300 transition-all duration-300"
                >
                    <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110 duration-500">
                        <ShieldCheck size={120} />
                    </div>
                    <div className="relative z-10 flex flex-col h-full justify-between space-y-8">
                        <div className="w-14 h-14 rounded-2xl bg-zinc-100 flex items-center justify-center text-zinc-900 group-hover:bg-black group-hover:text-white transition-colors">
                            <ShieldCheck size={28} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-zinc-900 mb-2">Administración de Flota</h2>
                            <p className="text-zinc-500 font-medium">Gestionar inventario de vehículos, fotos y características.</p>
                        </div>
                        <div className="flex items-center text-zinc-900 font-semibold group-hover:translate-x-2 transition-transform">
                            Gestionar Vehículos <span className="ml-2">→</span>
                        </div>
                    </div>
                </Link>
            )}

            {/* ADMIN USERS (Only Admin) */}
            {isAdmin && (
                <Link
                    href="/admin/usuarios"
                    className="group relative overflow-hidden bg-white rounded-[32px] p-8 border border-zinc-200 shadow-sm hover:shadow-xl hover:border-zinc-300 transition-all duration-300"
                >
                    <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110 duration-500">
                        <UserCog size={120} />
                    </div>
                    <div className="relative z-10 flex flex-col h-full justify-between space-y-8">
                        <div className="w-14 h-14 rounded-2xl bg-zinc-100 flex items-center justify-center text-zinc-900 group-hover:bg-black group-hover:text-white transition-colors">
                            <UserCog size={28} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-zinc-900 mb-2">Gestión de Usuarios</h2>
                            <p className="text-zinc-500 font-medium">Asignación de roles y permisos a empleados.</p>
                        </div>
                        <div className="flex items-center text-zinc-900 font-semibold group-hover:translate-x-2 transition-transform">
                            Gestionar Usuarios <span className="ml-2">→</span>
                        </div>
                    </div>
                </Link>
            )}

            {/* ADMIN GENERAL (Only Admin) */}
            {isAdmin && (
                <Link
                    href="/admin"
                    className="group relative overflow-hidden bg-white rounded-[32px] p-8 border border-zinc-200 shadow-sm hover:shadow-xl hover:border-zinc-300 transition-all duration-300"
                >
                    <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110 duration-500">
                        <Settings size={120} />
                    </div>
                    <div className="relative z-10 flex flex-col h-full justify-between space-y-8">
                        <div className="w-14 h-14 rounded-2xl bg-zinc-100 flex items-center justify-center text-zinc-900 group-hover:bg-black group-hover:text-white transition-colors">
                            <Settings size={28} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-zinc-900 mb-2">Panel Admin</h2>
                            <p className="text-zinc-500 font-medium">Configuración global y ajustes del sistema.</p>
                        </div>
                        <div className="flex items-center text-zinc-900 font-semibold group-hover:translate-x-2 transition-transform">
                            Configurar <span className="ml-2">→</span>
                        </div>
                    </div>
                </Link>
            )}

            {/* ALMACEN CARD */}
            {(hasRole("almacen") || isAdmin) && (
                <Link
                    href="/almacen"
                    className="group relative overflow-hidden bg-white rounded-[32px] p-8 border border-zinc-200 shadow-sm hover:shadow-xl hover:border-zinc-300 transition-all duration-300"
                >
                    <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110 duration-500">
                        <Package size={120} />
                    </div>
                    <div className="relative z-10 flex flex-col h-full justify-between space-y-8">
                        <div className="w-14 h-14 rounded-2xl bg-zinc-100 flex items-center justify-center text-zinc-900 group-hover:bg-black group-hover:text-white transition-colors">
                            <Package size={28} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-zinc-900 mb-2">Almacén</h2>
                            <p className="text-zinc-500 font-medium">Control de inventario, productos y stock.</p>
                        </div>
                        <div className="flex items-center text-zinc-900 font-semibold group-hover:translate-x-2 transition-transform">
                            Ir al Almacén <span className="ml-2">→</span>
                        </div>
                    </div>
                </Link>
            )}

            {/* CONTROL Y AUDITORIA CARD */}
            {(hasRole("transporte") || hasRole("almacen") || isAdmin) && (
                <Link
                    href="/control"
                    className="group relative overflow-hidden bg-white rounded-[32px] p-8 border border-zinc-200 shadow-sm hover:shadow-xl hover:border-zinc-300 transition-all duration-300"
                >
                    <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110 duration-500">
                        <ShieldCheck size={120} />
                    </div>
                    <div className="relative z-10 flex flex-col h-full justify-between space-y-8">
                        <div className="w-14 h-14 rounded-2xl bg-zinc-100 flex items-center justify-center text-zinc-900 group-hover:bg-black group-hover:text-white transition-colors">
                            <ShieldCheck size={28} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-zinc-900 mb-2">Auditoría</h2>
                            <p className="text-zinc-500 font-medium">Fiscalización de material y vehículos por técnico.</p>
                        </div>
                        <div className="flex items-center text-zinc-900 font-semibold group-hover:translate-x-2 transition-transform">
                            Iniciar Auditoría <span className="ml-2">→</span>
                        </div>
                    </div>
                </Link>
            )}

            {/* NO ROLES fallback */}
            {!isLoading && !isAdmin && !hasRole('transporte') && !hasRole('taller') && !hasRole('tecnico') && !hasRole('almacen') && (
                <div className="col-span-full text-center p-8 bg-white rounded-[32px] border border-zinc-200">
                    <p className="text-zinc-500">No tienes roles asignados. Contacta al administrador.</p>
                </div>
            )}

            {/* MI PERFIL */}
            <Link
                href="/perfil"
                className="group relative overflow-hidden bg-zinc-900 rounded-[32px] p-8 border border-zinc-800 shadow-sm hover:shadow-xl hover:border-zinc-700 transition-all duration-300 md:col-span-2"
            >
                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity transform group-hover:scale-110 duration-500">
                    <UserCog size={120} className="text-white" />
                </div>
                <div className="relative z-10 flex flex-col h-full justify-between space-y-8">
                    <div className="flex items-center justify-between">
                        <div className="w-14 h-14 rounded-2xl bg-zinc-800 flex items-center justify-center text-white group-hover:bg-white group-hover:text-black transition-colors">
                            <UserCog size={28} />
                        </div>
                    </div>

                    <div>
                        <h2 className="text-2xl font-bold text-white mb-2">Mi Perfil</h2>
                        <p className="text-zinc-400 font-medium">Ver información de cuenta y roles asignados.</p>
                    </div>
                    <div className="flex items-center text-white font-semibold group-hover:translate-x-2 transition-transform">
                        Ver Perfil <span className="ml-2">→</span>
                    </div>
                </div>
            </Link>

        </div>
    )
}
