import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Package, ArrowRight, History, Plus, AlertTriangle, ArrowUpRight, ArrowDownRight, ArrowLeft, Search, Box, QrCode, CheckCircle2 } from "lucide-react"
import Link from "next/link"
import { DashboardActions } from "@/components/almacen/dashboard-actions"
import { RecentTransactions } from "@/components/almacen/recent-transactions"
import { DesktopModeToggle } from "@/components/desktop-mode-toggle"

interface Product {
    id: string
    name: string
    sku: string
    current_stock: number
    min_stock: number
}

interface Transaction {
    id: string
    type: 'IN' | 'OUT' | 'ADJUST'
    quantity: number
    reason: string
    created_at: string
    inventory_products: {
        name: string
    } | null
}

export default async function WarehouseDashboard() {
    const supabase = await createClient()

    // Fetch stats
    const { count: productsCount } = await supabase
        .from("inventory_products")
        .select("*", { count: "exact", head: true })

    // Low stock items - Fetching all to filter by dynamic min_stock
    const { data: allProducts } = await supabase
        .from("inventory_products")
        .select("id, name, sku, current_stock, min_stock")

    const lowStockItems = (allProducts as Product[] | null)?.filter(
        item => item.current_stock <= item.min_stock
    ).slice(0, 5) || []

    // Recent transactions
    const { data: recentTransactions } = await supabase
        .from("inventory_transactions")
        .select("*, inventory_products(name)")
        .order("created_at", { ascending: false })
        .limit(5)

    const typedTransactions = (recentTransactions || []) as unknown as Transaction[]

    // Combos Asignados stats (Assignments)
    // Filter out 'ASG-' (Supervisor Spools)
    const { count: assignmentsCount } = await supabase
        .from("inventory_assignments")
        .select("*", { count: "exact", head: true })
        .not("code", "ilike", "ASG-%")

    const totalBundles = assignmentsCount || 0

    // Movimientos Hoy stats
    const today = new Date().toISOString().split('T')[0]
    const { count: dailyMovementsCount } = await supabase
        .from("inventory_transactions")
        .select("*", { count: "exact", head: true })
        .gte("created_at", today)

    return (
        <div className="min-h-screen bg-slate-50/50 p-4 md:p-10">
            {/* HERD HEADER */}
            <div className="max-w-7xl mx-auto mb-10">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <Link href="/" className="p-2 -ml-2 rounded-full hover:bg-slate-200/50 transition-colors text-slate-500">
                                <ArrowLeft size={24} />
                            </Link>
                            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Almacén Central</h1>

                        </div>
                        <p className="text-slate-500 max-w-lg">
                            Gestión integral de inventario, stock y movimientos logísticos.
                        </p>
                    </div>

                    <div className="flex gap-3 items-center">
                        <DesktopModeToggle />
                        <DashboardActions /> {/* Assuming this button is already styled or I can't style it easily from here without peeking, but it likely renders a Button */}
                    </div>
                </div>

                {/* SUB NAVIGATION */}
                <div className="flex items-center gap-2 mt-6 overflow-x-auto pb-2">
                    <Link href="/almacen/productos">
                        <Button variant="ghost" className="rounded-xl h-10 border border-transparent hover:bg-white hover:border-slate-200 hover:shadow-sm text-slate-600">
                            <Box size={16} className="mr-2" />
                            Productos
                        </Button>
                    </Link>
                    <Link href="/almacen/historial">
                        <Button variant="ghost" className="rounded-xl h-10 border border-transparent hover:bg-white hover:border-slate-200 hover:shadow-sm text-slate-600">
                            <History size={16} className="mr-2" />
                            Historial
                        </Button>
                    </Link>
                    <Link href="/almacen/rastreo">
                        <Button variant="ghost" className="rounded-xl h-10 border border-transparent hover:bg-white hover:border-slate-200 hover:shadow-sm text-blue-600">
                            <Search size={16} className="mr-2" />
                            Rastreo
                        </Button>
                    </Link>
                    <Link href="/almacen/seriales">
                        <Button variant="ghost" className="rounded-xl h-10 border border-transparent hover:bg-white hover:border-slate-200 hover:shadow-sm text-purple-600">
                            <QrCode size={16} className="mr-2" />
                            Seriales
                        </Button>
                    </Link>
                </div>
            </div>

            <div className="max-w-7xl mx-auto space-y-8">
                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <Link href="/almacen/productos" className="block h-full group">
                        <Card className="rounded-2xl border-slate-200 shadow-sm relative overflow-hidden h-full group-hover:shadow-xl group-hover:-translate-y-1 transition-all duration-300 bg-white">
                            <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-10 transition-opacity">
                                <Package size={100} />
                            </div>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-400">Total Productos</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-4xl font-bold text-slate-900">{productsCount || 0}</div>
                                <p className="text-xs text-slate-400 mt-2 font-medium">Items registrados</p>
                            </CardContent>
                        </Card>
                    </Link>

                    <Link href="/almacen/historial-asignaciones" className="block h-full group">
                        <Card className="rounded-2xl border-blue-100 shadow-sm relative overflow-hidden bg-blue-50/50 h-full group-hover:shadow-xl group-hover:-translate-y-1 transition-all duration-300">
                            <div className="absolute top-0 right-0 p-6 opacity-[0.05] group-hover:opacity-10 transition-opacity">
                                <Package size={100} className="text-blue-600" />
                            </div>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-bold uppercase tracking-wider text-blue-400">Asignaciones</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-4xl font-bold text-blue-700">{totalBundles}</div>
                                <p className="text-xs text-blue-400/80 mt-2 font-medium">Combos entregados</p>
                            </CardContent>
                        </Card>
                    </Link>

                    <Link href="/almacen/productos?view=low_stock" className="block h-full group">
                        <Card className="rounded-2xl border-amber-100 shadow-sm relative overflow-hidden h-full group-hover:shadow-xl group-hover:-translate-y-1 transition-all duration-300 bg-amber-50/30">
                            <div className="absolute top-0 right-0 p-6 opacity-[0.05] group-hover:opacity-10 transition-opacity">
                                <AlertTriangle size={100} className="text-amber-600" />
                            </div>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-bold uppercase tracking-wider text-amber-500">Stock Crítico</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-4xl font-bold text-amber-600">{(allProducts as Product[] | null)?.filter(p => p.current_stock <= p.min_stock).length || 0}</div>
                                <p className="text-xs text-amber-500/80 mt-2 font-medium">Requieren atención</p>
                            </CardContent>
                        </Card>
                    </Link>

                    <Link href="/almacen/historial?date=today" className="block h-full group">
                        <Card className="rounded-2xl border-slate-200 shadow-sm relative overflow-hidden h-full group-hover:shadow-xl group-hover:-translate-y-1 transition-all duration-300 bg-white">
                            <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-10 transition-opacity">
                                <History size={100} />
                            </div>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-400">Movimientos Hoy</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-4xl font-bold text-slate-900">{dailyMovementsCount || 0}</div>
                                <p className="text-xs text-slate-400 mt-2 font-medium">Transacciones</p>
                            </CardContent>
                        </Card>
                    </Link>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Low Stock List */}
                    <Card className="rounded-2xl border-slate-200 shadow-sm bg-white overflow-hidden">
                        <CardHeader className="border-b border-slate-50 bg-slate-50/30">
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <AlertTriangle size={20} className="text-amber-500" />
                                Alertas de Reposición
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="divide-y divide-slate-100">
                                {lowStockItems.length > 0 ? (
                                    lowStockItems.map((item) => (
                                        <div key={item.id} className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                                            <div className="flex flex-col">
                                                <span className="font-semibold text-slate-900">{item.name}</span>
                                                <span className="text-xs text-slate-400 font-mono">SKU: {item.sku}</span>
                                            </div>
                                            <div className="text-right">
                                                <span className="font-bold text-amber-600 text-lg">{item.current_stock}</span>
                                                <span className="text-[10px] uppercase text-slate-400 font-bold block">Unidades</span>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-12 text-slate-400 flex flex-col items-center">
                                        <CheckCircle2 size={48} className="text-slate-200 mb-2" />
                                        <p>Inventario Saludable</p>
                                    </div>
                                )}
                            </div>
                            {lowStockItems.length > 0 && (
                                <div className="p-3 bg-slate-50 border-t border-slate-100 text-center">
                                    <Link href="/almacen/productos?view=low_stock" className="text-xs font-bold text-blue-600 hover:underline">
                                        Ver todos
                                    </Link>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Recent Transactions */}
                    <Card className="rounded-2xl border-slate-200 shadow-sm bg-white overflow-hidden">
                        <CardHeader className="border-b border-slate-50 bg-slate-50/30">
                            <CardTitle className="text-lg">Últimos Movimientos</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <RecentTransactions transactions={typedTransactions} />
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}

