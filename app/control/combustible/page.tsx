"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { ArrowLeft, Fuel, Plus, FileSpreadsheet, Search, Filter, Calendar as CalendarIcon, ExternalLink, QrCode, Truck, User as UserIcon, Gauge, X, Trash2, AlertTriangle, CheckCircle } from "lucide-react"
import { DatePickerWithRange } from "@/components/ui/date-range-picker"
import { DateRange } from "react-day-picker"
import { DailyReportDialog } from "./daily-report-dialog"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { toast } from "sonner"

import { getFuelLogs, getVehicles, getTodayStats, annulFuelLog } from "./actions"

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
    
    // Annulment State
    const [annulDialogOpen, setAnnulDialogOpen] = useState(false)
    const [annulReason, setAnnulReason] = useState("")
    const [logToAnnul, setLogToAnnul] = useState<string | null>(null)
    const [annulling, setAnnulling] = useState(false)

    // Tab State
    const [activeTab, setActiveTab] = useState("logs")

    useEffect(() => {
        setIsMounted(true)
        loadInitialData()
    }, [])

    async function loadInitialData() {
        setLoading(true)
        try {
            const [vehData, logData, statsData] = await Promise.all([
                getVehicles(),
                getFuelLogs(),
                getTodayStats()
            ])
            setVehicles(vehData || [])
            setLogs(logData || [])
            setTodayStats(statsData || { totalLiters: 0, count: 0 })
        } catch (error) {
            toast.error("Error cargando datos")
        } finally {
            setLoading(false)
        }
    }

    if (!isMounted) return null

    const handleFilter = async () => {
        setLoading(true)
        const data = await getFuelLogs({
            vehicleId: selectedVehicle,
            startDate: dateRange?.from ? format(dateRange.from, "yyyy-MM-dd") : undefined,
            endDate: dateRange?.to ? format(dateRange.to, "yyyy-MM-dd") : undefined
        })
        setLogs(data || [])
        setLoading(false)
    }

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

    const exportToExcel = () => {
        if (logs.length === 0) return
        const headers = ["ID", "Ticket", "Fecha", "Hora", "Vehículo", "Placa", "Conductor", "Litros", "Kilometraje", "Supervisor", "Estado", "Motivo Anulación"]
        const csvContent = logs.map(log => {
            const date = new Date(log.fuel_date)
            return [
                log.id,
                log.ticket_number,
                format(date, "yyyy-MM-dd"),
                format(date, "HH:mm"),
                log.vehicle?.modelo || "N/A",
                log.vehicle?.placa || "N/A",
                log.driver_name,
                log.liters,
                log.mileage,
                `${log.supervisor?.first_name || ''} ${log.supervisor?.last_name || ''}`.trim(),
                log.status || 'active',
                log.void_reason || ""
            ].map(field => `"${field}"`).join(",")
        })
        const csvString = [headers.join(","), ...csvContent].join("\n")
        const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" })
        const url = URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.setAttribute("href", url)
        link.setAttribute("download", `combustible_${format(new Date(), "yyyy-MM-dd")}.csv`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
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
                                <Plus size={18} className="mr-1.5" />
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
                                    <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" /> Supervisor Activo
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

                    <TabsContent value="logs" className="mt-0 space-y-6 outline-none">
                        {/* Filters Bar */}
                        <div className="bg-white border border-zinc-200 shadow-sm rounded-[24px] p-2 flex flex-col sm:flex-row items-center gap-2">
                            <div className="w-full sm:w-64">
                                <Select value={selectedVehicle} onValueChange={setSelectedVehicle}>
                                    <SelectTrigger className="h-12 rounded-2xl border-none bg-zinc-50/50 hover:bg-zinc-100 transition-colors focus:ring-0">
                                        <div className="flex items-center gap-2 text-zinc-600 font-bold">
                                            <Truck size={18} />
                                            <SelectValue placeholder="Vehículo" />
                                        </div>
                                    </SelectTrigger>
                                    <SelectContent className="rounded-2xl border-zinc-200">
                                        <SelectItem value="all">Toda la Flota</SelectItem>
                                        {vehicles.map(v => (
                                            <SelectItem key={v.id} value={v.id}>{v.codigo} - {v.modelo}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="w-full sm:flex-1">
                                <DatePickerWithRange date={dateRange} onDateChange={setDateRange} />
                            </div>
                            <Button onClick={handleFilter} className="w-full sm:w-auto h-12 px-8 rounded-2xl bg-zinc-900 text-white hover:bg-zinc-800 font-bold">
                                <Filter size={18} className="mr-2" />
                                Filtrar
                            </Button>
                        </div>

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
                                                    <span className="text-[10px] uppercase font-bold text-zinc-400 block mb-0.5">Litros</span>
                                                    <div className="text-xl font-black text-emerald-600">{log.liters} L</div>
                                                </div>
                                                <div>
                                                    <span className="text-[10px] uppercase font-bold text-zinc-400 block mb-0.5">Kilometraje</span>
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

                    <TabsContent value="reports" className="mt-0 outline-none">
                        <Card className="rounded-[32px] border-zinc-200 shadow-sm bg-white overflow-hidden p-6 text-center">
                            <div className="max-w-md mx-auto py-10">
                                <FileSpreadsheet size={64} className="mx-auto text-indigo-100 mb-6" />
                                <h2 className="text-2xl font-black text-zinc-900 mb-2">Reporte Diario de Combustible</h2>
                                <p className="text-zinc-500 font-medium mb-8">Genera un resumen oficial de todos los consumos por vehículo para el cierre del día.</p>
                                <DailyReportDialog />
                            </div>
                        </Card>
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
                                {selectedLog?.status !== 'annulled' && (
                                    <Button 
                                        variant="ghost" 
                                        className="text-red-500 hover:text-red-600 hover:bg-red-50 rounded-xl font-bold"
                                        onClick={() => {
                                            setLogToAnnul(selectedLog.id)
                                            setAnnulDialogOpen(true)
                                        }}
                                    >
                                        <Trash2 size={18} className="mr-1.5" /> Anular
                                    </Button>
                                )}
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
