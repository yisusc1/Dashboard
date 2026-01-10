"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { ArrowLeft, Fuel, Plus, FileSpreadsheet, Search, Filter, Calendar as CalendarIcon, ExternalLink, QrCode } from "lucide-react"

import { Button } from "@/components/ui/button"
import { DesktopModeToggle } from "@/components/desktop-mode-toggle"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
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

import { getFuelLogs, getVehicles } from "./actions"

export default function FuelControlPage() {
    const [logs, setLogs] = useState<any[]>([])
    const [vehicles, setVehicles] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [isMounted, setIsMounted] = useState(false)

    // Filters
    const [selectedVehicle, setSelectedVehicle] = useState("all")
    const [startDate, setStartDate] = useState("")
    const [endDate, setEndDate] = useState("")

    useEffect(() => {
        setIsMounted(true)
        // Load initial data
        Promise.all([
            getVehicles(),
            getFuelLogs()
        ]).then(([vehData, logData]) => {
            setVehicles(vehData || [])
            setLogs(logData || [])
            setLoading(false)
        })
    }, [])

    if (!isMounted) return null

    const handleFilter = async () => {
        setLoading(true)
        const data = await getFuelLogs({
            vehicleId: selectedVehicle,
            startDate: startDate || undefined,
            endDate: endDate || undefined
        })
        setLogs(data || [])
        setLoading(false)
    }

    const exportToExcel = () => {
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
                    <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                        <DesktopModeToggle />

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
                </div>

                {/* Filters */}
                <Card className="bg-white border-slate-200 shadow-sm rounded-[24px] overflow-hidden">
                    <CardContent className="p-4 grid grid-cols-1 md:grid-cols-4 items-end gap-3 transition-all">
                        <div className="md:col-span-1 space-y-1.5">
                            <label className="text-xs font-bold text-slate-500 uppercase">Vehículo</label>
                            <Select value={selectedVehicle} onValueChange={setSelectedVehicle}>
                                <SelectTrigger className="bg-white">
                                    <SelectValue placeholder="Todos" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos</SelectItem>
                                    {vehicles.map(v => (
                                        <SelectItem key={v.id} value={v.id}>{v.codigo} - {v.modelo}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Date Range - Input Group approach */}
                        <div className="grid grid-cols-1 md:grid-cols-1 md:col-span-2 gap-4 w-full min-w-0">
                            <div className="space-y-2 w-full min-w-0">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Check-in</label>
                                <div className="flex items-center w-full bg-white border border-slate-200 rounded-md shadow-sm h-11 px-3 focus-within:ring-2 focus-within:ring-black">
                                    <CalendarIcon className="h-4 w-4 text-slate-400 shrink-0 mr-2" />
                                    <Input
                                        type="date"
                                        className="border-0 p-0 h-full w-full text-base focus-visible:ring-0 shadow-none bg-transparent"
                                        value={startDate}
                                        onChange={e => setStartDate(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2 w-full min-w-0">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Check-out</label>
                                <div className="flex items-center w-full bg-white border border-slate-200 rounded-md shadow-sm h-11 px-3 focus-within:ring-2 focus-within:ring-black">
                                    <CalendarIcon className="h-4 w-4 text-slate-400 shrink-0 mr-2" />
                                    <Input
                                        type="date"
                                        className="border-0 p-0 h-full w-full text-base focus-visible:ring-0 shadow-none bg-transparent"
                                        value={endDate}
                                        onChange={e => setEndDate(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="md:col-span-1">
                            <Button variant="secondary" onClick={handleFilter} className="w-full gap-2 bg-white border border-slate-200 hover:bg-slate-100 dark:bg-slate-800 dark:border-slate-700">
                                <Filter size={16} />
                                Filtrar
                            </Button>
                        </div>
                    </CardContent>
                </Card>

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
                                    <TableRow key={log.id} className="hover:bg-slate-50/50">
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
            </div>
        </div>
    )
}
