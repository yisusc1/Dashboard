"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { ArrowLeft, Fuel, Plus, FileSpreadsheet, Search, Filter, Calendar as CalendarIcon, ExternalLink, QrCode, Truck, User as UserIcon, Gauge, X } from "lucide-react"
import { DatePickerWithRange } from "@/components/ui/date-range-picker"
import { DateRange } from "react-day-picker" // Keep existing
import { DailyReportDialog } from "./daily-report-dialog"

import { Button } from "@/components/ui/button"
import { DesktopModeToggle } from "@/components/desktop-mode-toggle"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { AlertDialog, AlertDialogContent } from "@/components/ui/alert-dialog"
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

import { getFuelLogs, getVehicles, getTodayStats } from "./actions"

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

    useEffect(() => {
        setIsMounted(true)
        // Load initial data
        Promise.all([
            getVehicles(),
            getFuelLogs(),
            getTodayStats() // [NEW] Fetch Stats
        ]).then(([vehData, logData, statsData]) => {
            setVehicles(vehData || [])
            setLogs(logData || [])
            setTodayStats(statsData || { totalLiters: 0, count: 0 })
            setLoading(false)
        })
    }, [])

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

    const exportToExcel = () => {
        // ... existing export code ...
        // Simple CSV Export implementation
        if (logs.length === 0) return

        const headers = ["ID", "Ticket", "Fecha", "Hora", "Vehículo", "Placa", "Conductor", "Litros", "Kilometraje", "Supervisor", "URL Recibo"]

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
                log.ticket_url || ""
            ].map(field => `"${field}"`).join(",") // Quote fields to handle commas
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
        <div className="min-h-screen bg-slate-50/50 p-4 md:p-10 pb-32">
            <div className="max-w-7xl mx-auto space-y-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-3">
                        <Link href="/">
                            <Button variant="outline" size="icon" className="rounded-xl shrink-0">
                                <ArrowLeft size={20} />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-xl md:text-3xl font-bold tracking-tight text-slate-900">Control Combustible</h1>
                            <p className="text-sm md:text-base text-slate-500">Gestión de carga y tickets</p>
                        </div>
                    </div>
                </div>

                {/* [NEW] Today Stats Card */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white rounded-[24px] p-6 border border-slate-100 shadow-sm flex items-center justify-between">
                        <div>
                            <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1">Litros Hoy</p>
                            <h3 className="text-3xl font-bold text-slate-900">{todayStats.totalLiters.toFixed(2)} L</h3>
                            <p className="text-xs text-emerald-600 font-medium mt-1">
                                +{todayStats.count} cargas realizadas
                            </p>
                        </div>
                        <div className="h-14 w-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                            <Fuel size={32} />
                        </div>
                    </div>
                    {/* Placeholder for future stats or empty spacing */}
                    <div className="hidden md:block col-span-2"></div>
                </div>

                {/* ACTION BUTTONS ROW (Moved down) */}
                <div className="flex flex-col sm:flex-row gap-3 w-full justify-end">
                    <DesktopModeToggle />

                    <DailyReportDialog />

                    <Button variant="outline" onClick={exportToExcel} className="flex-1 md:flex-none gap-2 rounded-xl h-12 bg-white hover:bg-slate-50 border-slate-200 text-slate-700 shadow-sm">
                        <FileSpreadsheet size={18} className="text-green-600" />
                        <span className="md:inline font-medium">Exportar</span>
                    </Button>
                    <Link href="/control/combustible/scan" className="flex-1 md:flex-none">
                        <Button variant="secondary" className="w-full h-12 gap-2 bg-zinc-900 text-white hover:bg-zinc-800 rounded-xl shadow-lg shadow-zinc-900/20 font-medium">
                            <QrCode size={18} />
                            <span className="md:inline">Escanear</span>
                        </Button>
                    </Link>
                    <Link href="/control/combustible/new" className="flex-1 md:flex-none">
                        <Button className="w-full h-12 gap-2 bg-blue-600 hover:bg-blue-700 rounded-xl shadow-lg shadow-blue-600/20 font-bold text-white">
                            <Plus size={18} />
                            <span className="md:inline">Nuevo Ticket</span>
                        </Button>
                    </Link>
                </div>

                {/* Filters - Glassmorphism & Premium Design */}
                <div className="bg-white/80 backdrop-blur-md border border-slate-200 shadow-sm rounded-[20px] p-2 flex flex-col md:flex-row items-center gap-2 sticky top-4 z-10 transition-all hover:shadow-md">

                    {/* Vehicle Select */}
                    <div className="w-full md:w-64 shrink-0 relative">
                        <Select value={selectedVehicle} onValueChange={setSelectedVehicle}>
                            <SelectTrigger className="h-12 rounded-xl border-slate-200 bg-white hover:bg-slate-50 focus:ring-black">
                                <div className="flex items-center gap-2 text-slate-600">
                                    <Truck size={18} />
                                    <SelectValue placeholder="Filtrar por Vehículo" />
                                </div>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Toda la Flota</SelectItem>
                                {vehicles.map(v => (
                                    <SelectItem key={v.id} value={v.id}>{v.codigo} - {v.modelo}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Check In/Out -> Date Range Picker */}
                    <div className="w-full md:flex-1">
                        <DatePickerWithRange
                            date={dateRange}
                            onDateChange={setDateRange}
                        />
                    </div>

                    {/* Filter Action */}
                    <Button
                        onClick={handleFilter}
                        className="w-full md:w-auto h-12 px-8 rounded-xl bg-slate-900 text-white hover:bg-slate-800 shadow-lg shadow-slate-900/10 font-medium transition-all active:scale-95"
                    >
                        <Filter size={18} className="mr-2" />
                        Aplicar Filtros
                    </Button>
                </div>

                {/* Desktop Table */}
                <Card className="hidden md:block border-slate-200 shadow-sm overflow-hidden rounded-[24px] bg-white">
                    <Table>
                        <TableHeader className="bg-slate-50">
                            <TableRow>
                                <TableHead>Fecha</TableHead>
                                <TableHead>Ticket</TableHead>
                                <TableHead>Vehículo</TableHead>
                                <TableHead>Conductor</TableHead>
                                <TableHead>Litros</TableHead>
                                <TableHead>KM</TableHead>
                                <TableHead>Supervisor</TableHead>
                                <TableHead className="text-right">Recibo</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                                        Cargando registros...
                                    </TableCell>
                                </TableRow>
                            ) : logs.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                                        No se encontraron registros.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                logs.map((log) => (
                                    <TableRow
                                        key={log.id}
                                        className="hover:bg-slate-50/50 cursor-pointer transition-colors"
                                        onClick={() => setSelectedLog(log)}
                                    >
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-medium text-slate-900" suppressHydrationWarning>
                                                    {format(new Date(log.fuel_date), "dd MMM yyyy", { locale: es })}
                                                </span>
                                                <span className="text-xs text-slate-500" suppressHydrationWarning>
                                                    {format(new Date(log.fuel_date), "HH:mm")}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="font-mono">{log.ticket_number}</TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-semibold text-slate-700">{log.vehicle?.modelo}</span>
                                                <Badge variant="outline" className="w-fit text-[10px] mt-1">
                                                    {log.vehicle?.placa}
                                                </Badge>
                                            </div>
                                        </TableCell>
                                        <TableCell>{log.driver_name}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1 font-bold text-slate-700">
                                                <Fuel size={14} className="text-blue-500" />
                                                {log.liters} L
                                            </div>
                                        </TableCell>
                                        <TableCell>{log.mileage} km</TableCell>
                                        <TableCell className="text-sm text-slate-600">
                                            {log.supervisor?.first_name} {log.supervisor?.last_name?.[0]}.
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {log.ticket_url ? (
                                                <a href={log.ticket_url} target="_blank" rel="noopener noreferrer">
                                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-blue-600">
                                                        <ExternalLink size={16} />
                                                    </Button>
                                                </a>
                                            ) : (
                                                <span className="text-slate-300">-</span>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </Card>

                {/* Mobile List View */}
                <div className="md:hidden space-y-4">
                    {loading ? (
                        <div className="text-center py-10 text-muted-foreground">Cargando...</div>
                    ) : logs.length === 0 ? (
                        <div className="text-center py-10 text-muted-foreground">No hay registros.</div>
                    ) : (
                        logs.map((log) => (
                            <Card key={log.id} className="border-slate-200 shadow-sm rounded-[22px] bg-white overflow-hidden">
                                <CardContent className="p-4 space-y-3">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <Badge variant="outline" className="font-mono bg-slate-50">
                                                    {log.ticket_number}
                                                </Badge>
                                                <span className="text-xs text-slate-500" suppressHydrationWarning>
                                                    {format(new Date(log.fuel_date), "dd/MM/yy HH:mm")}
                                                </span>
                                            </div>
                                            <h3 className="font-bold text-slate-800">{log.vehicle?.modelo}</h3>
                                            <p className="text-sm text-slate-500">{log.vehicle?.placa}</p>
                                        </div>
                                        {log.ticket_url && (
                                            <a href={log.ticket_url} target="_blank" rel="noopener noreferrer" className="shrink-0">
                                                <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                                                    <ExternalLink size={18} />
                                                </div>
                                            </a>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                                        <div>
                                            <span className="text-[10px] uppercase font-bold text-slate-400">Litros</span>
                                            <div className="flex items-center gap-1 font-bold text-slate-700">
                                                <Fuel size={12} className="text-blue-500" />
                                                {log.liters} L
                                            </div>
                                        </div>
                                        <div>
                                            <span className="text-[10px] uppercase font-bold text-slate-400">Kilometraje</span>
                                            <div className="font-semibold text-slate-700">
                                                {log.mileage} km
                                            </div>
                                        </div>
                                        <div className="col-span-2">
                                            <span className="text-[10px] uppercase font-bold text-slate-400">Conductor</span>
                                            <div className="text-sm text-slate-700">
                                                {log.driver_name}
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </div>
                {/* DETAIL DIALOG */}
                <AlertDialog open={!!selectedLog} onOpenChange={(val) => !val && setSelectedLog(null)}>
                    <AlertDialogContent className="max-w-4xl p-0 overflow-hidden bg-transparent border-none shadow-none backdrop-blur-none">
                        <div className="bg-white/90 backdrop-blur-xl border border-white/20 shadow-2xl rounded-3xl overflow-hidden flex flex-col max-h-[90vh] w-full max-w-md mx-auto">
                            {/* Image Section (Top) */}
                            <div className="w-full bg-black/5 relative h-64 shrink-0 flex items-center justify-center overflow-hidden group p-4">
                                {selectedLog?.ticket_url ? (
                                    <img
                                        src={selectedLog.ticket_url}
                                        alt="Ticket"
                                        className="w-full h-full object-contain rounded-lg shadow-sm group-hover:scale-105 transition-transform duration-500"
                                    />
                                ) : (
                                    <div className="text-slate-400 flex flex-col items-center gap-2">
                                        <FileSpreadsheet size={48} className="opacity-20" />
                                        <span>Sin imagen adjunta</span>
                                    </div>
                                )}
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    className="absolute top-2 right-2 rounded-full bg-black/10 hover:bg-black/20 text-white"
                                    onClick={() => setSelectedLog(null)}
                                >
                                    <X size={20} />
                                </Button>
                            </div>

                            {/* Details Section (Bottom) */}
                            <div className="w-full flex flex-col overflow-hidden">
                                <div className="p-6 space-y-5 overflow-y-auto">

                                    <div className="flex items-start justify-between">
                                        <div>
                                            <h2 className="text-xl font-bold text-slate-900">Detalle de Carga</h2>
                                            <p className="text-slate-500 text-sm">Ticket #{selectedLog?.ticket_number}</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Fecha</label>
                                            <p className="font-medium text-slate-900">
                                                {selectedLog && format(new Date(selectedLog.fuel_date), "dd MMMM yyyy", { locale: es })}
                                            </p>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Hora</label>
                                            <p className="font-medium text-slate-900">
                                                {selectedLog && format(new Date(selectedLog.fuel_date), "HH:mm a")}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-3">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                                                <Truck size={20} />
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-900">{selectedLog?.vehicle?.modelo}</p>
                                                <p className="text-xs text-slate-500">{selectedLog?.vehicle?.placa}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                                                <UserIcon size={20} />
                                            </div>
                                            <div>
                                                <p className="font-medium text-slate-900">{selectedLog?.driver_name}</p>
                                                <p className="text-xs text-slate-500">Conductor Responsable</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100">
                                            <div className="flex items-center gap-2 text-emerald-600 mb-1">
                                                <Fuel size={16} />
                                                <span className="text-xs font-bold uppercase">Litros</span>
                                            </div>
                                            <p className="text-2xl font-bold text-slate-900">{selectedLog?.liters}</p>
                                        </div>
                                        <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100">
                                            <div className="flex items-center gap-2 text-indigo-600 mb-1">
                                                <Gauge size={16} />
                                                <span className="text-xs font-bold uppercase">Kilometraje</span>
                                            </div>
                                            <p className="text-2xl font-bold text-slate-900">{selectedLog?.mileage}</p>
                                        </div>
                                    </div>

                                    <div className="pt-4 border-t border-slate-100">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-slate-500">Registrado por:</span>
                                            <span className="font-medium text-slate-900">
                                                {selectedLog?.supervisor?.first_name} {selectedLog?.supervisor?.last_name}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </div>
    )
}
