
import { Suspense } from "react"
import { AlertCircle, Activity, TrendingUp, Users, Wrench, AlertTriangle, LayoutGrid, BarChart3, Car, MapPin, Truck, Bike } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { getDashboardStats, getFleetStatus, getAdvancedStats } from "./actions"
import { OperationsCharts, VehicleStatusChart } from "./components/operations-charts"
import { RealtimeNotifications } from "./components/realtime-notifications"
import { FleetGrid } from "./components/fleet-grid"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export const dynamic = "force-dynamic"

export default async function GerenciaDashboard() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) redirect("/login")

    // TODO: Add Role Check (Admin/Manager only)

    // Parallel Data Fetching
    const [stats, fleet, advanced] = await Promise.all([
        getDashboardStats(),
        getFleetStatus(),
        getAdvancedStats()
    ])

    return (
        <main className="min-h-screen bg-zinc-50 p-4 md:p-12 pb-24">
            <RealtimeNotifications />

            <div className="max-w-7xl mx-auto space-y-8">
                {/* HEADER */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-bold text-zinc-900 tracking-tight">Tablero de Gerencia</h1>
                        <p className="text-zinc-500 font-medium mt-2 text-base md:text-lg">Resumen operativo y control de flota.</p>
                    </div>
                </div>

                <Tabs defaultValue="summary" className="w-full">
                    {/* SCROLLABLE TABS LIST FOR MOBILE */}
                    <TabsList className="bg-zinc-100/80 backdrop-blur-md p-1.5 rounded-full border-0 mb-8 flex h-14 items-center gap-1 w-full overflow-x-auto no-scrollbar justify-start md:justify-center">
                        <TabsTrigger value="summary" className="rounded-full px-6 h-11 whitespace-nowrap data-[state=active]:bg-white data-[state=active]:text-zinc-900 data-[state=active]:shadow-sm text-zinc-500 font-medium transition-all hover:text-zinc-700 flex-shrink-0">
                            <LayoutGrid size={18} className="mr-2" /> Resumen
                        </TabsTrigger>
                        <TabsTrigger value="fleet" className="rounded-full px-6 h-11 whitespace-nowrap data-[state=active]:bg-white data-[state=active]:text-zinc-900 data-[state=active]:shadow-sm text-zinc-500 font-medium transition-all hover:text-zinc-700 flex-shrink-0">
                            <Car size={18} className="mr-2" /> Flota en Vivo
                            {fleet.some(v => v.status === 'IN_ROUTE') && (
                                <span className="ml-2 flex h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                            )}
                        </TabsTrigger>
                        <TabsTrigger value="analytics" className="rounded-full px-6 h-11 whitespace-nowrap data-[state=active]:bg-white data-[state=active]:text-zinc-900 data-[state=active]:shadow-sm text-zinc-500 font-medium transition-all hover:text-zinc-700 flex-shrink-0">
                            <BarChart3 size={18} className="mr-2" /> Analítica
                        </TabsTrigger>
                    </TabsList>

                    {/* === RESUMEN TAB === */}
                    <TabsContent value="summary" className="space-y-8 focus:outline-none mt-0">
                        {/* KPI CARDS (From previous step) */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="bg-white/70 backdrop-blur-2xl p-6 rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/50 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-500 group">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="p-3 bg-white/50 rounded-2xl text-zinc-900 group-hover:bg-green-50 group-hover:text-green-600 transition-colors"><Activity /></div>
                                    <span className="text-xs font-bold bg-green-100/50 text-green-700 px-2.5 py-1 rounded-full border border-green-100">Hoy</span>
                                </div>
                                <div className="text-4xl font-bold text-zinc-900 tracking-tight">{stats.installationsToday}</div>
                                <div className="text-sm text-zinc-500 font-medium mt-2">Instalaciones Realizadas</div>
                            </div>

                            <div className="bg-white/70 backdrop-blur-2xl p-6 rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/50 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-500 group">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="p-3 bg-white/50 rounded-2xl text-zinc-900 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors"><Wrench /></div>
                                    <span className="text-xs font-bold bg-blue-100/50 text-blue-700 px-2.5 py-1 rounded-full border border-blue-100">Hoy</span>
                                </div>
                                <div className="text-4xl font-bold text-zinc-900 tracking-tight">{stats.supportsToday}</div>
                                <div className="text-sm text-zinc-500 font-medium mt-2">Soportes Realizados</div>
                            </div>

                            <div className="bg-white/70 backdrop-blur-2xl p-6 rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/50 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-500 group">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="p-3 bg-white/50 rounded-2xl text-zinc-900 group-hover:bg-red-50 group-hover:text-red-600 transition-colors"><AlertTriangle /></div>
                                    {stats.activeFaults > 0 && <span className="text-xs font-bold bg-red-100/50 text-red-700 px-2.5 py-1 rounded-full border border-red-100 animate-pulse">Atención</span>}
                                </div>
                                <div className="text-4xl font-bold text-zinc-900 tracking-tight">{stats.activeFaults}</div>
                                <div className="text-sm text-zinc-500 font-medium mt-2">Fallas de Vehículos Activas</div>
                            </div>

                            <div className="bg-white/70 backdrop-blur-2xl p-6 rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/50 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-500 group">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="p-3 bg-white/50 rounded-2xl text-zinc-900 group-hover:bg-amber-50 group-hover:text-amber-600 transition-colors"><TrendingUp /></div>
                                </div>
                                <div className="text-4xl font-bold text-zinc-900 tracking-tight">{stats.vehiclesInMaintenance}</div>
                                <div className="text-sm text-zinc-500 font-medium mt-2">Vehículos en Taller</div>
                            </div>
                        </div>

                        {/* === MINIMALIST FLEET SUMMARY === */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* ACTIVE / EN RUTA */}
                            <div className="bg-white/70 backdrop-blur-2xl p-8 rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/50 relative overflow-hidden group hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-500">
                                <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                                    <MapPin size={120} className="text-green-600" />
                                </div>
                                <div className="relative z-10">
                                    <div className="flex items-center gap-4 mb-6">
                                        <div className="p-4 bg-green-50 rounded-2xl text-green-600 shadow-sm"><Truck size={24} /></div>
                                        <div>
                                            <h3 className="text-xl font-bold text-zinc-900">En Ruta</h3>
                                            <p className="text-zinc-500 font-medium text-sm">Vehículos activos actualmente</p>
                                        </div>
                                    </div>
                                    <div className="text-5xl font-bold text-zinc-900 mb-8 tracking-tighter">
                                        {fleet.filter(v => v.status === 'IN_ROUTE').length}
                                    </div>

                                    <div className="space-y-3">
                                        {fleet.filter(v => v.status === 'IN_ROUTE').length > 0 ? (
                                            fleet.filter(v => v.status === 'IN_ROUTE').map(v => (
                                                <div key={v.id} className="flex items-center justify-between p-3 bg-white/60 backdrop-blur-sm rounded-2xl border border-white/60 shadow-sm hover:scale-[1.02] transition-transform">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-full bg-green-50/50 flex items-center justify-center text-green-600 shadow-inner">
                                                            {v.tipo === 'Moto' ? <Bike size={18} /> : <Car size={18} />}
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="font-bold text-zinc-900 text-sm leading-tight">{v.model}</span>
                                                            <span className="text-xs text-zinc-500 font-mono mt-0.5">{v.plate}</span>
                                                        </div>
                                                    </div>
                                                    <span className="text-xs font-bold text-green-700 bg-green-50/80 px-3 py-1.5 rounded-xl border border-green-100/50">
                                                        {v.driver?.split(' ')[0]}
                                                    </span>
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-zinc-400 italic text-sm">Ningún vehículo en ruta.</p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* GARAGE / EN GALPON */}
                            <div className="bg-white/70 backdrop-blur-2xl p-8 rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/50 relative overflow-hidden group hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-500">
                                <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                                    <Car size={120} className="text-zinc-600" />
                                </div>
                                <div className="relative z-10">
                                    <div className="flex items-center gap-4 mb-6">
                                        <div className="p-4 bg-zinc-50 rounded-2xl text-zinc-600 shadow-sm"><Car size={24} /></div>
                                        <div>
                                            <h3 className="text-xl font-bold text-zinc-900">En Galpón</h3>
                                            <p className="text-zinc-500 font-medium text-sm">Vehículos disponibles o en taller</p>
                                        </div>
                                    </div>
                                    <div className="text-5xl font-bold text-zinc-900 mb-8 tracking-tighter">
                                        {fleet.filter(v => v.status !== 'IN_ROUTE').length}
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-4 bg-zinc-50/50 rounded-[24px] border border-zinc-100/50 text-center flex flex-col justify-center hover:bg-zinc-50 transition-colors">
                                            <span className="block text-3xl font-bold text-zinc-900">{fleet.filter(v => v.status === 'AVAILABLE').length}</span>
                                            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider mt-1">Disponibles</span>
                                        </div>
                                        <div className="p-4 bg-amber-50/50 rounded-[24px] border border-amber-100/50 text-center flex flex-col justify-center hover:bg-amber-50 transition-colors">
                                            <span className="block text-3xl font-bold text-amber-900">{fleet.filter(v => v.status === 'MAINTENANCE').length}</span>
                                            <span className="text-xs font-bold text-amber-600 uppercase tracking-wider mt-1">Taller</span>
                                        </div>
                                    </div>

                                    {/* Maintenance List */}
                                    {fleet.filter(v => v.status === 'MAINTENANCE').length > 0 && (
                                        <div className="mt-4 space-y-2">
                                            <p className="text-xs font-bold text-amber-600 uppercase mb-1">Vehículos en Revisión</p>
                                            {fleet.filter(v => v.status === 'MAINTENANCE').map(v => (
                                                <div key={v.id} className="flex items-center justify-between p-2 bg-amber-50/50 rounded-xl border border-amber-100/50">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-amber-600">{v.tipo === 'Moto' ? <Bike size={14} /> : <Car size={14} />}</span>
                                                        <span className="font-bold text-zinc-800 text-xs">{v.model}</span>
                                                    </div>
                                                    <span className="text-[10px] font-mono font-bold text-amber-700 bg-white px-1.5 py-0.5 rounded-md border border-amber-100">
                                                        {v.plate}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </TabsContent>

                    {/* === FLOTA TAB === */}
                    <TabsContent value="fleet" className="focus:outline-none mt-0">
                        <div className="bg-indigo-50 border border-indigo-100 p-6 rounded-3xl mb-8 flex items-start gap-4">
                            <div className="p-3 bg-white rounded-full shadow-sm text-indigo-600">
                                <Activity className="animate-pulse" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-indigo-900">Monitoreo en Tiempo Real</h3>
                                <p className="text-indigo-700">
                                    Los vehículos marcados como <strong>En Ruta</strong> tienen un reporte de salida activo sin cierre detectado.
                                </p>
                            </div>
                        </div>
                        <FleetGrid vehicles={fleet} />
                    </TabsContent>

                    {/* === ANALITICA TAB === */}
                    <TabsContent value="analytics" className="focus:outline-none mt-0">
                        {/* CHARTS MOVED HERE */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8 min-w-0">
                            <div className="lg:col-span-2 min-h-[400px] min-w-0">
                                <OperationsCharts data={stats.chartData} />
                            </div>
                            <div className="min-h-[400px] min-w-0">
                                <VehicleStatusChart stats={stats.vehicleStats} />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Productivity Card */}
                            <div className="bg-white p-8 rounded-[32px] border border-zinc-200 shadow-sm">
                                <h3 className="text-xl font-bold mb-6">Top Técnicos (Instalaciones)</h3>
                                <div className="space-y-4">
                                    {advanced.productivity.map((tech, i) => (
                                        <div key={i} className="flex items-center justify-between p-4 bg-zinc-50 rounded-2xl">
                                            <div className="flex items-center gap-4">
                                                <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${i === 0 ? 'bg-yellow-100 text-yellow-700' : 'bg-zinc-200 text-zinc-600'}`}>
                                                    #{i + 1}
                                                </span>
                                                <span className="font-semibold">{tech.team}</span>
                                            </div>
                                            <div className="font-bold text-lg">{tech.installs}</div>
                                        </div>
                                    ))}
                                    {advanced.productivity.length === 0 && <p className="text-zinc-400 italic">No hay datos suficientes.</p>}
                                </div>
                            </div>

                            {/* Material Efficiency */}
                            <div className="bg-white p-8 rounded-[32px] border border-zinc-200 shadow-sm">
                                <h3 className="text-xl font-bold mb-6">Consumo Promedio Material</h3>
                                <div className="space-y-4">
                                    {advanced.materialWaste.map((item, i) => (
                                        <div key={i} className="flex flex-col gap-2 p-4 bg-zinc-50 rounded-2xl">
                                            <div className="flex justify-between font-semibold text-zinc-700">
                                                <span>{item.item}</span>
                                                <span>{item.avgPerInstall} / und</span>
                                            </div>
                                            <div className="w-full bg-zinc-200 rounded-full h-2">
                                                <div
                                                    className="bg-zinc-900 h-2 rounded-full"
                                                    style={{ width: `${(item.avgPerInstall / 3) * 100}%` }}
                                                ></div>
                                            </div>
                                            <p className="text-xs text-zinc-400 mt-1">Promedio por instalación exitosa</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </main>
    )
}

