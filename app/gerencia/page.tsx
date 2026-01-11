
import { Suspense } from "react"
import { AlertCircle, Activity, TrendingUp, Users, Wrench, AlertTriangle, LayoutGrid, BarChart3, Car } from "lucide-react"
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
        <main className="min-h-screen bg-zinc-50 p-6 md:p-12 pb-24">
            <RealtimeNotifications />

            <div className="max-w-7xl mx-auto space-y-8">
                {/* HEADER */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                    <div>
                        <h1 className="text-4xl font-bold text-zinc-900 tracking-tight">Tablero de Gerencia</h1>
                        <p className="text-zinc-500 font-medium mt-2 text-lg">Resumen operativo y control de flota.</p>
                    </div>
                </div>

                <Tabs defaultValue="summary" className="w-full">
                    <TabsList className="bg-white p-1 rounded-full border border-zinc-200 mb-8 inline-flex h-14 items-center">
                        <TabsTrigger value="summary" className="rounded-full px-6 h-12 data-[state=active]:bg-black data-[state=active]:text-white text-zinc-500 font-medium transition-all">
                            <LayoutGrid size={18} className="mr-2" /> Resumen
                        </TabsTrigger>
                        <TabsTrigger value="fleet" className="rounded-full px-6 h-12 data-[state=active]:bg-black data-[state=active]:text-white text-zinc-500 font-medium transition-all">
                            <Car size={18} className="mr-2" /> Flota en Vivo
                            {fleet.some(v => v.status === 'IN_ROUTE') && (
                                <span className="ml-2 flex h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                            )}
                        </TabsTrigger>
                        <TabsTrigger value="analytics" className="rounded-full px-6 h-12 data-[state=active]:bg-black data-[state=active]:text-white text-zinc-500 font-medium transition-all">
                            <BarChart3 size={18} className="mr-2" /> Analítica
                        </TabsTrigger>
                    </TabsList>

                    {/* === RESUMEN TAB === */}
                    <TabsContent value="summary" className="space-y-8 focus:outline-none mt-0">
                        {/* KPI CARDS (From previous step) */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="bg-white p-6 rounded-3xl shadow-sm border border-zinc-100 hover:shadow-md transition-shadow">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="p-3 bg-zinc-50 rounded-2xl text-zinc-900"><Activity /></div>
                                    <span className="text-xs font-bold bg-green-100 text-green-700 px-2 py-1 rounded-full">Hoy</span>
                                </div>
                                <div className="text-3xl font-bold text-zinc-900">{stats.installationsToday}</div>
                                <div className="text-sm text-zinc-500 font-medium mt-1">Instalaciones Realizadas</div>
                            </div>

                            <div className="bg-white p-6 rounded-3xl shadow-sm border border-zinc-100 hover:shadow-md transition-shadow">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="p-3 bg-blue-50 rounded-2xl text-blue-600"><Wrench /></div>
                                    <span className="text-xs font-bold bg-blue-100 text-blue-700 px-2 py-1 rounded-full">Hoy</span>
                                </div>
                                <div className="text-3xl font-bold text-zinc-900">{stats.supportsToday}</div>
                                <div className="text-sm text-zinc-500 font-medium mt-1">Soportes Realizados</div>
                            </div>

                            <div className="bg-white p-6 rounded-3xl shadow-sm border border-zinc-100 hover:shadow-md transition-shadow">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="p-3 bg-red-50 rounded-2xl text-red-600"><AlertTriangle /></div>
                                    {stats.activeFaults > 0 && <span className="text-xs font-bold bg-red-100 text-red-700 px-2 py-1 rounded-full animate-pulse">Atención</span>}
                                </div>
                                <div className="text-3xl font-bold text-zinc-900">{stats.activeFaults}</div>
                                <div className="text-sm text-zinc-500 font-medium mt-1">Fallas de Vehículos Activas</div>
                            </div>

                            <div className="bg-white p-6 rounded-3xl shadow-sm border border-zinc-100 hover:shadow-md transition-shadow">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="p-3 bg-amber-50 rounded-2xl text-amber-600"><TrendingUp /></div>
                                </div>
                                <div className="text-3xl font-bold text-zinc-900">{stats.vehiclesInMaintenance}</div>
                                <div className="text-sm text-zinc-500 font-medium mt-1">Vehículos en Taller</div>
                            </div>
                        </div>

                        {/* CHARTS SECTION */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-2 min-h-[400px]">
                                <OperationsCharts data={stats.chartData} />
                            </div>
                            <div className="min-h-[400px]">
                                <VehicleStatusChart stats={stats.vehicleStats} />
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

