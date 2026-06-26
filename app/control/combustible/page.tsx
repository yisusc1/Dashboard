"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns"
import { es } from "date-fns/locale"
import { ArrowLeft, Fuel, Plus, FileSpreadsheet, Filter, QrCode, Truck, User as UserIcon, X, Trash2, AlertTriangle, CheckCircle, Image as ImageIcon, CalendarDays, ChevronRight, RotateCcw, Send } from "lucide-react"
import { DateRange } from "react-day-picker"
import { DailyReportDialog } from "./daily-report-dialog"
import { cleanMonthData } from "./cleanAction"
import * as XLSX from "xlsx"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { toast } from "sonner"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose } from "@/components/ui/drawer"
import { Calendar } from "@/components/ui/calendar"

import { getFuelLogs, getVehicles, getTodayStats, annulFuelLog, getDailyReports } from "./actions"

export default function FuelControlPage() {
    const [logs, setLogs] = useState<any[]>([])
    const [vehicles, setVehicles] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [isMounted, setIsMounted] = useState(false)

    // Filters
    const [selectedVehicle, setSelectedVehicle] = useState("all")
    const [dateRange, setDateRange] = useState<DateRange | undefined>()
    const [selectedLog, setSelectedLog] = useState<any | null>(null)
    const [todayStats, setTodayStats] = useState({ totalLiters: 0, count: 0 })
    const [filterDrawerOpen, setFilterDrawerOpen] = useState(false)
    const [activePreset, setActivePreset] = useState<string | null>(null)
    
    // Reports State
    const [dailyReports, setDailyReports] = useState<any[]>([])
    const [selectedDailyReport, setSelectedDailyReport] = useState<any | null>(null)
    
    // Annulment State
    const [annulDialogOpen, setAnnulDialogOpen] = useState(false)
    const [annulReason, setAnnulReason] = useState("")
    const [logToAnnul, setLogToAnnul] = useState<string | null>(null)
    const [annulling, setAnnulling] = useState(false)
    
    // Cleanup State
    const [cleanupDialogOpen, setCleanupDialogOpen] = useState(false)
    const [cleaning, setCleaning] = useState(false)

    // Tab State
    const [activeTab, setActiveTab] = useState("logs")

    useEffect(() => {
        setIsMounted(true)
        loadInitialData()
    }, [])

    async function loadInitialData() {
        setLoading(true)
        try {
            const [vehData, logData, statsData, reportData] = await Promise.all([
                getVehicles(),
                getFuelLogs(),
                getTodayStats(format(new Date(), "yyyy-MM-dd")),
                getDailyReports()
            ])
            setVehicles(vehData || [])
            setLogs(logData || [])
            setTodayStats(statsData || { totalLiters: 0, count: 0 })
            setDailyReports(reportData || [])
        } catch (error) {
            toast.error("Error cargando datos")
        } finally {
            setLoading(false)
        }
    }

    if (!isMounted) return null

    const handleFilter = async (vId?: string, range?: DateRange) => {
        const vehicleId = vId ?? selectedVehicle
        const dr = range ?? dateRange
        setLoading(true)
        const data = await getFuelLogs({
            vehicleId,
            startDate: dr?.from ? format(dr.from, "yyyy-MM-dd") : undefined,
            endDate: dr?.to ? format(dr.to, "yyyy-MM-dd") : undefined
        })
        setLogs(data || [])
        setLoading(false)
        setFilterDrawerOpen(false)
    }

    const applyPreset = (preset: string) => {
        const today = new Date()
        let range: DateRange | undefined
        if (preset === "today") {
            range = { from: today, to: today }
        } else if (preset === "week") {
            range = { from: startOfWeek(today, { weekStartsOn: 1 }), to: endOfWeek(today, { weekStartsOn: 1 }) }
        } else if (preset === "month") {
            range = { from: startOfMonth(today), to: endOfMonth(today) }
        }
        setDateRange(range)
        setActivePreset(preset)
        handleFilter(undefined, range)
    }

    const clearFilters = () => {
        setSelectedVehicle("all")
        setDateRange(undefined)
        setActivePreset(null)
        setFilterDrawerOpen(false)
        handleFilter("all", undefined)
    }

    const hasActiveFilters = selectedVehicle !== "all" || !!dateRange
    const activeFilterCount = (selectedVehicle !== "all" ? 1 : 0) + (dateRange ? 1 : 0)
    const selectedVehicleName = vehicles.find(v => v.id === selectedVehicle)

    const handleAnnul = async () => {
        if (!logToAnnul || !annulReason) {
            toast.error("Debes indicar un motivo")
            return
        }
        setAnnulling(true)
        try {
            const res = await annulFuelLog(logToAnnul, annulReason)
            if (res.success) {
                toast.success("Ticket anulado correctamente")
                setAnnulDialogOpen(false)
                setLogToAnnul(null)
                setAnnulReason("")
                loadInitialData()
            } else {
                toast.error("Error: " + res.error)
            }
        } catch (error) {
            toast.error("Error inesperado")
        } finally {
            setAnnulling(false)
        }
    }
    
    const handleCleanup = async () => {
        setCleaning(true)
        try {
            const res = await cleanMonthData()
            if (res.success) {
                toast.success(res.message || "Limpieza completada")
                setCleanupDialogOpen(false)
                loadInitialData()
            } else {
                toast.error("Error: " + res.error)
            }
        } catch (error: any) {
            toast.error("Error inesperado al limpiar")
        } finally {
            setCleaning(false)
        }
    }

    const exportToExcel = () => {
        if (logs.length === 0) return
        
        // Sort logs by Vehicle and then by Date
        const sortedLogs = [...logs].sort((a, b) => {
            const vA = a.vehicle?.codigo || ""
            const vB = b.vehicle?.codigo || ""
            if (vA < vB) return -1
            if (vA > vB) return 1
            return new Date(a.fuel_date).getTime() - new Date(b.fuel_date).getTime()
        })

        const excelData = sortedLogs.map(log => {
            const date = new Date(log.fuel_date)
            const motivo = [log.notes, log.void_reason].filter(Boolean).join(" - ")
            
            let talonarioInfo = "Propio";
            if (log.talonario_vehiculo_id && log.talonario_vehiculo_id !== log.vehicle_id) {
                const owner = vehicles.find(v => v.id === log.talonario_vehiculo_id);
                talonarioInfo = owner ? `Prestado de: ${owner.codigo}` : "Prestado";
            }

            return {
                "ID": log.id,
                "Ticket": log.ticket_number,
                "Talonario": talonarioInfo,
                "Fecha": format(date, "yyyy-MM-dd"),
                "Hora": format(date, "HH:mm"),
                "Vehículo": log.vehicle?.modelo || "N/A",
                "Placa": log.vehicle?.placa || "N/A",
                "Conductor": log.driver_name,
                "Litros": log.liters,
                "Kilometraje": log.mileage,
                "Supervisor": `${log.supervisor?.first_name || ''} ${log.supervisor?.last_name || ''}`.trim(),
                "Estado": log.status || 'active',
                "Motivo/Observaciones": motivo,
                "Enlace Foto": log.ticket_url || "Sin Foto"
            }
        })

        const worksheet = XLSX.utils.json_to_sheet(excelData)
        const workbook = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(workbook, worksheet, "Combustible")
        
        // Generate buffer and trigger download
        XLSX.writeFile(workbook, `combustible_${format(new Date(), "yyyy-MM-dd")}.xlsx`)
    }

    return (
        <main className="min-h-screen bg-zinc-50 pb-28 md:pb-12 font-sans text-zinc-900">
            {/* Header */}
            <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-zinc-200 px-4 py-4">
                <div className="max-w-6xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <Link href="/">
                            <Button variant="ghost" size="icon" className="rounded-xl hover:bg-zinc-100 shrink-0">
                                <ArrowLeft size={20} />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-xl font-bold text-zinc-900 leading-none">Combustible</h1>
                            <p className="text-xs text-zinc-500 font-medium mt-1">Control de Cargas</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                         <Link href="/control/combustible/new">
                            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-10 px-4 shadow-md shadow-indigo-100">
                                <Plus size={18} className="mr-[6px]" />
                                <span className="hidden sm:inline">Nuevo Ticket</span>
                                <span className="sm:hidden">Nuevo</span>
                            </Button>
                        </Link>
                    </div>
                </div>
            </header>

            <div className="max-w-6xl mx-auto px-4 mt-6">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    {/* Stats Summary Row */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                        <Card className="rounded-[24px] border-zinc-200 shadow-sm bg-white overflow-hidden">
                            <CardContent className="p-4">
                                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Litros Hoy</p>
                                <h3 className="text-xl font-black text-zinc-900">{todayStats.totalLiters.toFixed(1)} L</h3>
                                <div className="flex items-center gap-1 mt-1 text-[10px] font-bold text-emerald-600">
                                    <CheckCircle size={10} /> {todayStats.count} cargas
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="rounded-[24px] border-zinc-200 shadow-sm bg-indigo-600 text-white overflow-hidden">
                            <CardContent className="p-4">
                                <p className="text-[10px] font-bold text-indigo-200 uppercase tracking-wider mb-1">Actividad</p>
                                <h3 className="text-xl font-black">En Línea</h3>
                                <div className="flex items-center gap-1 mt-1 text-[10px] font-bold text-indigo-100">
                                    <div className="w-[6px] h-[6px] bg-white rounded-full animate-pulse" /> Supervisor Activo
                                </div>
                            </CardContent>
                        </Card>
                        <Link href="/control/combustible/scan" className="col-span-1">
                            <Card className="rounded-[24px] border-zinc-200 shadow-sm bg-white hover:bg-zinc-50 transition-colors h-full flex flex-col justify-center items-center cursor-pointer p-4">
                                <QrCode size={24} className="text-zinc-400 mb-1" />
                                <span className="text-xs font-bold text-zinc-600">Escanear</span>
                            </Card>
                        </Link>
                        <div onClick={exportToExcel} className="col-span-1">
                            <Card className="rounded-[24px] border-zinc-200 shadow-sm bg-white hover:bg-zinc-50 transition-colors h-full flex flex-col justify-center items-center cursor-pointer p-4">
                                <FileSpreadsheet size={24} className="text-emerald-500 mb-1" />
                                <span className="text-xs font-bold text-zinc-600">Exportar</span>
                            </Card>
                        </div>
                    </div>

                    <TabsList className="grid w-full grid-cols-2 bg-white border border-zinc-200 p-1 rounded-[22px] h-14 shadow-sm mb-6">
                        <TabsTrigger value="logs" className="rounded-2xl text-xs sm:text-sm data-[state=active]:bg-zinc-100 data-[state=active]:text-zinc-900 data-[state=active]:font-black transition-all">
                            <Fuel size={14} className="mr-2 hidden sm:inline" />
                            Historial de Cargas
                        </TabsTrigger>
                        <TabsTrigger value="reports" className="rounded-2xl text-xs sm:text-sm data-[state=active]:bg-zinc-100 data-[state=active]:text-zinc-900 data-[state=active]:font-black transition-all">
                            <FileSpreadsheet size={14} className="mr-2 hidden sm:inline" />
                            Cierres y Reportes
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="logs" className="mt-0 space-y-4 outline-none">
                        {/* Filter Trigger + Quick Presets */}
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                onClick={() => setFilterDrawerOpen(true)}
                                className={cn(
                                    "h-11 rounded-2xl border-zinc-200 bg-white hover:bg-zinc-50 font-bold text-sm gap-2 shadow-sm transition-all",
                                    hasActiveFilters && "border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                                )}
                            >
                                <Filter size={16} />
                                Filtros
                                {activeFilterCount > 0 && (
                                    <span className="h-5 w-5 rounded-full bg-indigo-600 text-white text-[10px] font-black flex items-center justify-center">
                                        {activeFilterCount}
                                    </span>
                                )}
                            </Button>

                            <div className="flex gap-[6px] overflow-x-auto no-scrollbar">
                                {[{ id: "today", label: "Hoy" }, { id: "week", label: "Semana" }, { id: "month", label: "Mes" }].map(p => (
                                    <button
                                        key={p.id}
                                        onClick={() => activePreset === p.id ? clearFilters() : applyPreset(p.id)}
                                        className={cn(
                                            "h-11 px-4 rounded-2xl text-sm font-bold whitespace-nowrap transition-all border",
                                            activePreset === p.id
                                                ? "bg-zinc-900 text-white border-zinc-900 shadow-sm"
                                                : "bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50"
                                        )}
                                    >
                                        {p.label}
                                    </button>
                                ))}
                            </div>

                            {hasActiveFilters && (
                                <button onClick={clearFilters} className="h-11 w-11 shrink-0 rounded-2xl border border-zinc-200 bg-white hover:bg-red-50 text-zinc-400 hover:text-red-500 flex items-center justify-center transition-colors">
                                    <RotateCcw size={16} />
                                </button>
                            )}
                        </div>

                        {/* Active Filter Chips */}
                        {hasActiveFilters && (
                            <div className="flex flex-wrap gap-2">
                                {selectedVehicle !== "all" && selectedVehicleName && (
                                    <Badge variant="secondary" className="rounded-full px-3 py-1 gap-1 bg-indigo-50 text-indigo-700 border border-indigo-100 font-bold text-xs hover:bg-indigo-100">
                                        <Truck size={12} />
                                        {selectedVehicleName.codigo}
                                        <button onClick={() => { setSelectedVehicle("all"); handleFilter("all") }} className="ml-1 hover:text-indigo-900">
                                            <X size={12} />
                                        </button>
                                    </Badge>
                                )}
                                {dateRange?.from && (
                                    <Badge variant="secondary" className="rounded-full px-3 py-1 gap-1 bg-indigo-50 text-indigo-700 border border-indigo-100 font-bold text-xs hover:bg-indigo-100" suppressHydrationWarning>
                                        <CalendarDays size={12} />
                                        {format(dateRange.from, "dd MMM", { locale: es })}
                                        {dateRange.to && dateRange.to.getTime() !== dateRange.from.getTime() && ` - ${format(dateRange.to, "dd MMM", { locale: es })}`}
                                        <button onClick={() => { setDateRange(undefined); setActivePreset(null); handleFilter(undefined, undefined) }} className="ml-1 hover:text-indigo-900">
                                            <X size={12} />
                                        </button>
                                    </Badge>
                                )}
                            </div>
                        )}

                        {/* FILTER DRAWER (Mobile-first bottom sheet) */}
                        <Drawer open={filterDrawerOpen} onOpenChange={setFilterDrawerOpen}>
                            <DrawerContent className="rounded-t-[32px] max-h-[85vh]">
                                <DrawerHeader className="pb-2">
                                    <div className="flex items-center justify-between">
                                        <DrawerTitle className="text-xl font-black text-zinc-900">Filtros</DrawerTitle>
                                        {hasActiveFilters && (
                                            <button onClick={clearFilters} className="text-xs font-bold text-red-500 hover:text-red-600 flex items-center gap-1">
                                                <RotateCcw size={12} /> Limpiar
                                            </button>
                                        )}
                                    </div>
                                </DrawerHeader>
                                <div className="px-4 pb-6 space-y-6 overflow-y-auto">
                                    {/* Vehicle Selection */}
                                    <div>
                                        <p className="text-[10px] font-black uppercase text-zinc-400 tracking-wider mb-3 ml-1">Vehículo</p>
                                        <div className="grid grid-cols-1 gap-[6px] max-h-48 overflow-y-auto rounded-2xl border border-zinc-100 p-2 bg-zinc-50/50">
                                            <button
                                                onClick={() => setSelectedVehicle("all")}
                                                className={cn(
                                                    "flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all text-sm",
                                                    selectedVehicle === "all"
                                                        ? "bg-zinc-900 text-white font-black shadow-sm"
                                                        : "bg-white text-zinc-700 font-medium hover:bg-zinc-100 border border-zinc-100"
                                                )}
                                            >
                                                <Truck size={16} className={selectedVehicle === "all" ? "text-white" : "text-zinc-400"} />
                                                Toda la Flota
                                            </button>
                                            {vehicles.map(v => (
                                                <button
                                                    key={v.id}
                                                    onClick={() => setSelectedVehicle(v.id)}
                                                    className={cn(
                                                        "flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all text-sm",
                                                        selectedVehicle === v.id
                                                            ? "bg-indigo-600 text-white font-black shadow-sm"
                                                            : "bg-white text-zinc-700 font-medium hover:bg-zinc-100 border border-zinc-100"
                                                    )}
                                                >
                                                    <span className={cn("font-mono text-xs px-2 py-[2px] rounded-lg", selectedVehicle === v.id ? "bg-white/20" : "bg-zinc-100")}>{v.codigo}</span>
                                                    <span className="truncate">{v.modelo}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Date Presets */}
                                    <div>
                                        <p className="text-[10px] font-black uppercase text-zinc-400 tracking-wider mb-3 ml-1">Período</p>
                                        <div className="grid grid-cols-3 gap-2 mb-4">
                                            {[{ id: "today", label: "Hoy" }, { id: "week", label: "Esta Semana" }, { id: "month", label: "Este Mes" }].map(p => (
                                                <button
                                                    key={p.id}
                                                    onClick={() => {
                                                        if (activePreset === p.id) {
                                                            setDateRange(undefined)
                                                            setActivePreset(null)
                                                        } else {
                                                            const today = new Date()
                                                            let range: DateRange | undefined
                                                            if (p.id === "today") range = { from: today, to: today }
                                                            else if (p.id === "week") range = { from: startOfWeek(today, { weekStartsOn: 1 }), to: endOfWeek(today, { weekStartsOn: 1 }) }
                                                            else if (p.id === "month") range = { from: startOfMonth(today), to: endOfMonth(today) }
                                                            setDateRange(range)
                                                            setActivePreset(p.id)
                                                        }
                                                    }}
                                                    className={cn(
                                                        "py-3 rounded-2xl text-sm font-bold transition-all border",
                                                        activePreset === p.id
                                                            ? "bg-zinc-900 text-white border-zinc-900"
                                                            : "bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50"
                                                    )}
                                                >
                                                    {p.label}
                                                </button>
                                            ))}
                                        </div>

                                        {/* Calendar for custom range */}
                                        <div className="bg-white rounded-2xl border border-zinc-100 p-2 flex justify-center">
                                            <Calendar
                                                mode="range"
                                                selected={dateRange}
                                                onSelect={(range) => { setDateRange(range); setActivePreset(null) }}
                                                numberOfMonths={1}
                                                locale={es}
                                                disabled={(date) => date > new Date()}
                                            />
                                        </div>
                                    </div>

                                    {/* Apply Button */}
                                    <Button
                                        onClick={() => handleFilter()}
                                        className="w-full h-14 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-base shadow-lg shadow-indigo-200"
                                    >
                                        <Filter size={18} className="mr-2" />
                                        Aplicar Filtros
                                    </Button>
                                </div>
                            </DrawerContent>
                        </Drawer>

                        {loading ? (
                            <div className="py-20 text-center text-zinc-400">
                                <Loader2 className="animate-spin w-8 h-8 mx-auto mb-4" />
                                Cargando registros...
                            </div>
                        ) : logs.length === 0 ? (
                            <div className="py-20 text-center bg-white rounded-[32px] border border-zinc-200 border-dashed">
                                <Fuel size={48} className="mx-auto text-zinc-200 mb-4" />
                                <p className="text-zinc-500 font-bold">No hay registros de carga encontrados.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {logs.map((log) => (
                                    <Card 
                                        key={log.id} 
                                        className={cn(
                                            "border-zinc-200 shadow-sm rounded-[28px] bg-white overflow-hidden transition-all hover:shadow-md cursor-pointer",
                                            log.status === 'annulled' && "opacity-60 grayscale"
                                        )}
                                        onClick={() => setSelectedLog(log)}
                                    >
                                        <CardContent className="p-5">
                                            <div className="flex justify-between items-start mb-3">
                                                <div className="flex gap-3 items-center">
                                                    <div className={cn(
                                                        "h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm",
                                                        log.status === 'annulled' ? "bg-zinc-100 text-zinc-400" : "bg-indigo-50 text-indigo-600"
                                                    )}>
                                                        <Fuel size={24} />
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <h3 className="font-black text-zinc-900 leading-none">{log.vehicle?.modelo}</h3>
                                                            {log.status === 'annulled' && <Badge variant="destructive" className="text-[8px] h-4">ANULADO</Badge>}
                                                        </div>
                                                        <p className="text-xs text-zinc-500 font-mono mt-1">{log.vehicle?.placa} • Ticket #{log.ticket_number}</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-tighter" suppressHydrationWarning>
                                                        {format(new Date(log.fuel_date), "dd MMM", { locale: es })}
                                                    </p>
                                                    <p className="text-lg font-black text-zinc-900 leading-none" suppressHydrationWarning>
                                                        {format(new Date(log.fuel_date), "HH:mm")}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-3 py-3 border-t border-zinc-100">
                                                <div>
                                                    <span className="text-[10px] uppercase font-bold text-zinc-400 block mb-[2px]">Litros</span>
                                                    <div className="text-xl font-black text-emerald-600">{log.liters} L</div>
                                                </div>
                                                <div>
                                                    <span className="text-[10px] uppercase font-bold text-zinc-400 block mb-[2px]">Kilometraje</span>
                                                    <div className="text-xl font-black text-zinc-900">{log.mileage?.toLocaleString()} <span className="text-xs font-normal">km</span></div>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between pt-3 border-t border-zinc-100">
                                                <div className="flex items-center gap-2">
                                                    <div className="h-6 w-6 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-500">
                                                        <UserIcon size={12} />
                                                    </div>
                                                    <span className="text-xs font-bold text-zinc-600 truncate max-w-[120px]">{log.driver_name}</span>
                                                </div>
                                                <div className="flex items-center gap-1 text-[10px] font-bold text-zinc-400">
                                                    <AlertTriangle size={10} /> Por: {log.supervisor?.first_name}
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="reports" className="mt-0 outline-none space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Card className="rounded-[32px] border-zinc-200 shadow-sm bg-white overflow-hidden p-6 text-center">
                                <div className="max-w-md mx-auto py-6">
                                    <FileSpreadsheet size={48} className="mx-auto text-indigo-100 mb-4" />
                                    <h2 className="text-xl font-black text-zinc-900 mb-2">Nuevo Cierre Diario</h2>
                                    <p className="text-zinc-500 text-xs font-medium mb-6">Genera o actualiza el resumen oficial de consumos para la fecha seleccionada.</p>
                                    <DailyReportDialog onSuccess={() => loadInitialData()} />
                                </div>
                            </Card>

                            <Card className="rounded-[32px] border-red-100 shadow-sm bg-red-50/30 overflow-hidden p-6 text-center">
                                <div className="max-w-md mx-auto py-6">
                                    <Trash2 size={48} className="mx-auto text-red-200 mb-4" />
                                    <h2 className="text-xl font-black text-red-900 mb-2">Limpieza de Fin de Mes</h2>
                                    <p className="text-red-700/80 text-xs font-medium mb-6">Borra el historial antiguo y las imágenes de los tickets para no saturar el almacenamiento.</p>
                                    <Button 
                                        variant="destructive"
                                        className="h-12 px-8 rounded-2xl font-black"
                                        onClick={() => setCleanupDialogOpen(true)}
                                    >
                                        Vaciar Datos del Mes
                                    </Button>
                                </div>
                            </Card>
                        </div>

                        <div className="space-y-4">
                            <div className="flex justify-between items-center px-1">
                                <h4 className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">Historial de Reportes</h4>
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={() => loadInitialData()} 
                                    className="h-6 text-[10px] font-black text-zinc-400 hover:text-zinc-900 gap-1 uppercase"
                                >
                                    <RotateCcw size={10} /> Refrescar
                                </Button>
                            </div>
                            {dailyReports.length === 0 ? (
                                <div className="py-12 text-center bg-white rounded-[32px] border border-zinc-100 border-dashed">
                                    <p className="text-zinc-400 text-sm font-bold">No hay reportes archivados aún.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {dailyReports.map((report) => (
                                        <Card 
                                            key={report.id} 
                                            className="border-zinc-200 shadow-sm rounded-[28px] bg-white overflow-hidden hover:shadow-md transition-all cursor-pointer"
                                            onClick={() => setSelectedDailyReport(report)}
                                        >
                                            <CardContent className="p-5">
                                                <div className="flex justify-between items-center mb-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-10 w-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                                                            <FileSpreadsheet size={20} />
                                                        </div>
                                                        <div>
                                                            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-tighter" suppressHydrationWarning>
                                                                {format(new Date(report.report_date + 'T12:00:00'), "MMMM yyyy", { locale: es })}
                                                            </p>
                                                            <h3 className="font-black text-zinc-900 text-lg leading-none" suppressHydrationWarning>
                                                                {format(new Date(report.report_date + 'T12:00:00'), "EEEE dd", { locale: es })}
                                                            </h3>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-[10px] font-black text-zinc-400 uppercase">Total Litros</p>
                                                        <p className="text-xl font-black text-emerald-600">{Number(report.total_liters).toFixed(1)} L</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center justify-between pt-3 border-t border-zinc-100">
                                                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-400">
                                                        <Truck size={10} /> {report.details?.length || 0} Vehículos
                                                    </div>
                                                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-400">
                                                        <UserIcon size={10} /> {report.supervisor?.first_name}
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </div>
                    </TabsContent>
                </Tabs>
            </div>

            {/* DETAIL DIALOG */}
            <AlertDialog open={!!selectedLog} onOpenChange={(val) => !val && setSelectedLog(null)}>
                <AlertDialogContent className="max-w-4xl p-0 overflow-hidden bg-transparent border-none shadow-none backdrop-blur-none">
                    <div className="bg-white/95 backdrop-blur-xl border border-zinc-200 shadow-2xl rounded-[32px] overflow-hidden flex flex-col max-h-[90vh] w-full max-w-md mx-auto">
                        {/* Image Section (Top) */}
                        <div className="w-full bg-zinc-100 relative h-72 shrink-0 flex items-center justify-center overflow-hidden p-4">
                            {selectedLog?.ticket_url ? (
                                <img
                                    src={selectedLog.ticket_url}
                                    alt="Ticket"
                                    className="w-full h-full object-contain rounded-2xl shadow-sm"
                                />
                            ) : (
                                <div className="text-zinc-300 flex flex-col items-center gap-2">
                                    <ImageIcon size={64} strokeWidth={1} />
                                    <span className="font-bold">Sin foto adjunta</span>
                                </div>
                            )}
                            <Button
                                size="icon"
                                variant="ghost"
                                className="absolute top-4 right-4 rounded-full bg-white/50 backdrop-blur-md text-zinc-900"
                                onClick={() => setSelectedLog(null)}
                            >
                                <X size={20} />
                            </Button>
                        </div>

                        {/* Details Section */}
                        <div className="p-8 space-y-6 overflow-y-auto">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h2 className="text-2xl font-black text-zinc-900 leading-none">Detalle de Ticket</h2>
                                    <p className="text-zinc-500 font-bold mt-2">N# {selectedLog?.ticket_number}</p>
                                </div>
                                {/* El botón de anular fue removido por regla de negocio: los supervisores no pueden eliminar tickets ya cargados */}
                            </div>

                            {selectedLog?.status === 'annulled' && (
                                <div className="bg-red-50 border border-red-100 p-4 rounded-2xl text-red-800">
                                    <p className="text-xs font-black uppercase mb-1">Motivo de Anulación</p>
                                    <p className="text-sm font-bold italic">"{selectedLog.void_reason}"</p>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-zinc-50 p-4 rounded-2xl border border-zinc-100">
                                    <p className="text-[10px] font-black text-zinc-400 uppercase mb-1">Fecha</p>
                                    <p className="font-bold">{selectedLog && format(new Date(selectedLog.fuel_date), "dd/MM/yyyy")}</p>
                                </div>
                                <div className="bg-zinc-50 p-4 rounded-2xl border border-zinc-100">
                                    <p className="text-[10px] font-black text-zinc-400 uppercase mb-1">Hora</p>
                                    <p className="font-bold">{selectedLog && format(new Date(selectedLog.fuel_date), "HH:mm")}</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center gap-4">
                                    <div className="h-12 w-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shrink-0">
                                        <Truck size={24} />
                                    </div>
                                    <div>
                                        <p className="font-black text-lg text-zinc-900">{selectedLog?.vehicle?.modelo}</p>
                                        <p className="text-xs text-zinc-500 font-mono">{selectedLog?.vehicle?.placa}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="h-12 w-12 bg-zinc-100 text-zinc-500 rounded-2xl flex items-center justify-center shrink-0">
                                        <UserIcon size={24} />
                                    </div>
                                    <div>
                                        <p className="font-bold text-zinc-900">{selectedLog?.driver_name}</p>
                                        <p className="text-xs text-zinc-500">Conductor</p>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-5 bg-emerald-600 text-white rounded-[24px] shadow-lg shadow-emerald-100">
                                    <p className="text-[10px] font-bold uppercase opacity-80 mb-1">Litros</p>
                                    <p className="text-3xl font-black">{selectedLog?.liters}</p>
                                </div>
                                <div className="p-5 bg-zinc-900 text-white rounded-[24px] shadow-lg shadow-zinc-200">
                                    <p className="text-[10px] font-bold uppercase opacity-80 mb-1">Kilometraje</p>
                                    <p className="text-2xl font-black">{selectedLog?.mileage?.toLocaleString()}</p>
                                </div>
                            </div>

                            {selectedLog?.notes && (
                                <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl">
                                    <p className="text-[10px] font-black text-amber-700 uppercase mb-1">Notas</p>
                                    <p className="text-sm font-medium text-amber-900">{selectedLog.notes}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </AlertDialogContent>
            </AlertDialog>

            {/* CLEANUP DIALOG */}
            <AlertDialog open={cleanupDialogOpen} onOpenChange={setCleanupDialogOpen}>
                <AlertDialogContent className="rounded-[32px] max-w-md p-6">
                    <AlertDialogHeader>
                        <div className="h-16 w-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4 mx-auto">
                            <AlertTriangle size={32} />
                        </div>
                        <AlertDialogTitle className="text-center text-2xl font-black text-zinc-900">¿Vaciar Base de Datos?</AlertDialogTitle>
                        <AlertDialogDescription className="text-center text-sm font-medium text-zinc-500">
                            Esta acción <strong className="text-red-600">eliminará todas las fotos</strong> de los tickets del servidor para ahorrar espacio, y borrará el historial de cargas.
                            <br/><br/>
                            El sistema mantendrá automáticamente el <strong>último registro</strong> de cada vehículo para asegurar que las secuencias de los talonarios no se descontrolen.
                            <br/><br/>
                            <strong className="text-zinc-900">¿Ya exportaste a Excel y verificaste los tickets?</strong> Las fotos ya no estarán disponibles después de esto.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex-col sm:flex-row gap-3 mt-6">
                        <AlertDialogCancel className="rounded-2xl h-12 border-zinc-200 text-zinc-600 font-bold w-full m-0">Cancelar</AlertDialogCancel>
                        <Button 
                            variant="destructive"
                            onClick={handleCleanup}
                            disabled={cleaning}
                            className="rounded-2xl h-12 font-black w-full shadow-lg shadow-red-200 m-0"
                        >
                            {cleaning ? "Vaciando..." : "Sí, vaciar datos"}
                        </Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* DAILY REPORT DETAIL DIALOG */}
            <AlertDialog open={!!selectedDailyReport} onOpenChange={(val) => !val && setSelectedDailyReport(null)}>
                <AlertDialogContent className="max-w-md p-0 overflow-hidden bg-white border-none shadow-2xl rounded-[32px]">
                    <div className="p-6 border-b border-zinc-100">
                        <div className="flex justify-between items-start">
                            <div>
                                <h2 className="text-2xl font-black text-zinc-900 leading-none">Resumen Diario</h2>
                                <p className="text-zinc-500 font-bold mt-2 uppercase text-[10px] tracking-widest" suppressHydrationWarning>
                                    {selectedDailyReport && format(new Date(selectedDailyReport.report_date + 'T12:00:00'), "PPPP", { locale: es })}
                                </p>
                            </div>
                            <Button size="icon" variant="ghost" onClick={() => setSelectedDailyReport(null)} className="rounded-full">
                                <X size={20} />
                            </Button>
                        </div>
                    </div>
                    <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
                        <div className="bg-emerald-600 rounded-3xl p-5 text-white shadow-lg shadow-emerald-100 flex justify-between items-center">
                            <div>
                                <p className="text-[10px] font-bold uppercase opacity-80 mb-1">Consumo Total</p>
                                <p className="text-3xl font-black">{Number(selectedDailyReport?.total_liters).toFixed(1)} L</p>
                            </div>
                            <FileSpreadsheet size={40} className="opacity-20" />
                        </div>

                        <div className="space-y-3">
                            <h4 className="text-[10px] font-black uppercase text-zinc-400 tracking-widest ml-1">Desglose por Vehículo</h4>
                            {selectedDailyReport?.details?.map((item: any, idx: number) => (
                                <div key={idx} className="bg-zinc-50 p-4 rounded-2xl border border-zinc-100">
                                    <div className="flex justify-between items-start mb-2">
                                        <h5 className="font-black text-zinc-900 text-sm leading-tight">{item.model}</h5>
                                        <Badge variant="outline" className="bg-white border-zinc-200 text-emerald-600 font-black">
                                            {item.liters.toFixed(1)} L
                                        </Badge>
                                    </div>
                                    <div className="flex items-center gap-4 text-[10px] font-bold text-zinc-400">
                                        <span className="flex items-center gap-1"><RotateCcw size={10} /> {item.count} cargas</span>
                                        <span className="flex items-center gap-1"><Truck size={10} /> {item.startKm?.toLocaleString()} - {item.endKm?.toLocaleString()} km</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="p-6 border-t border-zinc-100 flex flex-col gap-3">
                        <Button 
                            className="w-full h-14 bg-green-600 hover:bg-green-700 text-white rounded-2xl font-bold shadow-lg shadow-green-100"
                            onClick={() => {
                                // Re-use WhatsApp formatting from Success Data if possible, 
                                // but for simplicity here we just trigger the generic one
                                const vehiclesList = selectedDailyReport.details?.map((v: any, index: number) =>
                                    `${index + 1}. ${v.model} / ${v.liters.toFixed(2)} L (${v.startKm}-${v.endKm} km)`
                                ).join("\n")
                        
                                const message = `*Reporte de Combustible Diario*\n\n*Fecha:* ${selectedDailyReport.report_date}\n*Supervisor:* ${selectedDailyReport.supervisor?.first_name || "N/A"}\n\n*Vehículos:*\n${vehiclesList}\n\n*Total:* ${Number(selectedDailyReport.total_liters).toFixed(2)} L`
                        
                                window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank')
                            }}
                        >
                            <Send size={20} className="mr-2" />
                            Compartir Resumen
                        </Button>
                    </div>
                </AlertDialogContent>
            </AlertDialog>
            
            {/* ANNUL DIALOG */}
            <AlertDialog open={annulDialogOpen} onOpenChange={setAnnulDialogOpen}>
                <AlertDialogContent className="rounded-[32px] border-none shadow-2xl bg-white p-8">
                    <AlertDialogHeader>
                        <div className="mx-auto bg-red-100 w-20 h-20 rounded-full flex items-center justify-center mb-6 text-red-600">
                            <Trash2 size={40} />
                        </div>
                        <AlertDialogTitle className="text-center text-2xl font-black text-zinc-900">Anular Ticket</AlertDialogTitle>
                        <AlertDialogDescription className="text-center text-zinc-500 text-lg">
                            ¿Estás seguro de que deseas anular este registro? Esta acción no se puede deshacer y quedará auditada.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    
                    <div className="mt-4">
                        <Input 
                            placeholder="Indique el motivo de la anulación..." 
                            className="h-14 rounded-2xl border-zinc-200 bg-zinc-50"
                            value={annulReason}
                            onChange={(e) => setAnnulReason(e.target.value)}
                        />
                    </div>

                    <AlertDialogFooter className="flex-col sm:flex-row gap-3 mt-8">
                        <AlertDialogCancel
                            onClick={() => {
                                setAnnulDialogOpen(false)
                                setLogToAnnul(null)
                                setAnnulReason("")
                            }}
                            className="rounded-2xl h-14 border-zinc-200 text-zinc-600 font-bold hover:bg-zinc-50"
                        >
                            Cancelar
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleAnnul}
                            disabled={annulling}
                            className="rounded-2xl h-14 bg-red-600 text-white font-black hover:bg-red-700 shadow-lg shadow-red-200"
                        >
                            {annulling ? "Anulando..." : "Sí, Anular Ticket"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Float Action Button (Mobile) */}
            <Link href="/control/combustible/new">
                <Button className="fixed bottom-24 right-6 w-16 h-16 rounded-full bg-indigo-600 text-white shadow-2xl shadow-indigo-300 md:hidden z-40">
                    <Plus size={32} />
                </Button>
            </Link>
        </main>
    )
}

function Loader2({ className }: { className?: string }) {
    return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={cn("animate-spin", className)}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
}
