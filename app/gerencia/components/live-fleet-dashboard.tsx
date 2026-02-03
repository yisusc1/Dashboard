"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Car, Truck, AlertTriangle, MapPin, User, CheckCircle2, Bike, Fuel, Gauge, Phone, Clock, MoreVertical, Battery, RefreshCcw } from "lucide-react"
import type { FleetStatus } from "../actions"
import { getFleetStatus } from "../actions" // Import Server Action
import { useState, useMemo, useEffect } from "react"
import { VehicleDetailsDialog } from "@/components/vehicle-details-dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { differenceInMinutes } from "date-fns"

// --- SUB-COMPONENT: LIVE TIMER ---
function TripTimer({ startDate }: { startDate: string }) {
    const [duration, setDuration] = useState("")

    useEffect(() => {
        const updateTimer = () => {
            const start = new Date(startDate)
            const now = new Date()
            const diffMins = differenceInMinutes(now, start)
            const hours = Math.floor(diffMins / 60)
            const mins = diffMins % 60
            setDuration(`${hours}h ${mins}m`)
        }

        updateTimer() // Initial call
        const interval = setInterval(updateTimer, 60000) // Update every minute
        return () => clearInterval(interval)
    }, [startDate])

    return <span className="text-xs font-bold font-mono">{duration || "..."}</span>
}

export function LiveFleetDashboard({ vehicles: initialVehicles }: { vehicles: FleetStatus[] }) {
    // Local State for Polled Data
    const [vehicles, setVehicles] = useState<FleetStatus[]>(initialVehicles)
    const [selectedVehicle, setSelectedVehicle] = useState<FleetStatus | null>(null)
    const [filter, setFilter] = useState<'ALL' | 'ROUTE' | 'AVAILABLE' | 'WORKSHOP'>('ALL')
    // BACKGROUND POLLING (Silent - No UI Indicator)
    useEffect(() => {
        const interval = setInterval(async () => {
            // setIsRefreshing(true) // Removed visual trigger
            try {
                const newData = await getFleetStatus()
                setVehicles(newData)
            } catch (error) {
                console.error("Polling failed", error)
            }
        }, 5000)

        return () => clearInterval(interval)
    }, [])

    // Removed Manual Refresh Logic

    // Derived Stats
    const stats = useMemo(() => {
        return {
            total: vehicles.length,
            inRoute: vehicles.filter(v => v.status === 'IN_ROUTE').length,
            available: vehicles.filter(v => v.status === 'AVAILABLE').length,
            maintenance: vehicles.filter(v => v.status === 'MAINTENANCE').length
        }
    }, [vehicles])

    const filteredVehicles = useMemo(() => {
        if (filter === 'ALL') return vehicles
        if (filter === 'ROUTE') return vehicles.filter(v => v.status === 'IN_ROUTE')
        if (filter === 'AVAILABLE') return vehicles.filter(v => v.status === 'AVAILABLE')
        if (filter === 'WORKSHOP') return vehicles.filter(v => v.status === 'MAINTENANCE')
        return vehicles
    }, [vehicles, filter])

    const getStatusConfig = (vehicle: FleetStatus) => {
        switch (vehicle.status) {
            case 'IN_ROUTE': return { label: "En Ruta", color: "bg-green-500", text: "text-green-700", bg: "bg-green-50", border: "border-green-200" }
            case 'CRITICAL':
                // Check severity
                if (vehicle.faultsSummary.critical > 0 || vehicle.faultsSummary.high > 0) {
                    return { label: "Falla Crítica", color: "bg-red-500", text: "text-red-700", bg: "bg-red-50", border: "border-red-200" }
                }
                return { label: "Falla Pendiente", color: "bg-orange-500", text: "text-orange-700", bg: "bg-orange-50", border: "border-orange-200" }
            case 'MAINTENANCE': return { label: "En Taller", color: "bg-amber-500", text: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200" }
            default: return { label: "Disponible", color: "bg-zinc-400", text: "text-zinc-700", bg: "bg-zinc-50", border: "border-zinc-200" }
        }
    }

    const getFuelColor = (level: number) => {
        if (level < 25) return 'text-red-500'
        if (level < 50) return 'text-amber-500'
        return 'text-emerald-500'
    }

    const dialogVehicle = useMemo(() => {
        if (!selectedVehicle) return null
        return {
            ...selectedVehicle,
            codigo: selectedVehicle.code,
            modelo: selectedVehicle.model,
            placa: selectedVehicle.plate,
            foto_url: selectedVehicle.imageUrl,
        } as any
    }, [selectedVehicle])

    return (
        <div className="space-y-8">
            {/* Quick Stats Filter Bar - Same as before */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <button onClick={() => setFilter('ALL')} className={`p-4 rounded-2xl border transition-all ${filter === 'ALL' ? 'bg-zinc-900 text-white border-zinc-900' : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300'}`}>
                    <div className="text-2xl font-bold">{stats.total}</div>
                    <div className="text-xs font-medium opacity-80 uppercase tracking-wider">Total Flota</div>
                </button>
                <button onClick={() => setFilter('ROUTE')} className={`p-4 rounded-2xl border transition-all ${filter === 'ROUTE' ? 'bg-green-600 text-white border-green-600' : 'bg-white text-zinc-600 border-zinc-200 hover:border-green-200'}`}>
                    <div className="text-2xl font-bold flex items-center justify-center gap-2">
                        {stats.inRoute}
                        {stats.inRoute > 0 && <span className="flex h-3 w-3 rounded-full bg-green-400 animate-pulse" />}
                    </div>
                    <div className="text-xs font-medium opacity-80 uppercase tracking-wider">En Ruta</div>
                </button>
                <button onClick={() => setFilter('AVAILABLE')} className={`p-4 rounded-2xl border transition-all ${filter === 'AVAILABLE' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-zinc-600 border-zinc-200 hover:border-blue-200'}`}>
                    <div className="text-2xl font-bold">{stats.available}</div>
                    <div className="text-xs font-medium opacity-80 uppercase tracking-wider">Disponibles</div>
                </button>
                <button onClick={() => setFilter('WORKSHOP')} className={`p-4 rounded-2xl border transition-all ${filter === 'WORKSHOP' ? 'bg-amber-600 text-white border-amber-600' : 'bg-white text-zinc-600 border-zinc-200 hover:border-amber-200'}`}>
                    <div className="text-2xl font-bold">{stats.maintenance}</div>
                    <div className="text-xs font-medium opacity-80 uppercase tracking-wider">Mantenimiento</div>
                </button>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredVehicles.map((vehicle) => {
                    const status = getStatusConfig(vehicle)
                    return (
                        <Card
                            key={vehicle.id}
                            className="overflow-hidden rounded-[24px] bg-white border border-zinc-100 shadow-sm hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] transition-all duration-300 group relative"
                        >
                            {/* Trip Duration Badge (only if in route) */}
                            {vehicle.status === 'IN_ROUTE' && vehicle.lastExit && (
                                <div className="absolute top-4 left-4 z-20">
                                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900/90 backdrop-blur-md text-white rounded-full shadow-lg">
                                        <Clock size={12} className="text-green-400 animate-pulse" />
                                        {/* Use Client Implementation of Timer */}
                                        <TripTimer startDate={vehicle.lastExit} />
                                    </div>
                                </div>
                            )}

                            {/* Status Badge */}
                            <div className="absolute top-4 right-4 z-20">
                                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full backdrop-blur-md bg-white/90 border shadow-sm ${status.text}`}>
                                    <span className={`h-2 w-2 rounded-full ${status.color} ${vehicle.status === 'IN_ROUTE' ? 'animate-pulse' : ''}`} />
                                    <span className="text-xs font-bold">{status.label}</span>
                                </div>
                            </div>

                            {/* Image Section */}
                            <div className="h-48 bg-zinc-100 relative group-hover:scale-[1.02] transition-transform duration-500 cursor-pointer" onClick={() => setSelectedVehicle(vehicle)}>
                                {vehicle.imageUrl ? (
                                    <img src={vehicle.imageUrl} alt={vehicle.plate} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-zinc-300">
                                        <Truck size={48} />
                                    </div>
                                )}
                                {/* Gradient Overlay */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60" />

                                <div className="absolute bottom-4 left-4 text-white">
                                    <h3 className="font-bold text-xl tracking-tight">{vehicle.model}</h3>
                                    <p className="font-mono text-sm opacity-90">{vehicle.plate}</p>
                                </div>
                            </div>

                            <CardContent className="p-5 space-y-5">
                                {/* Driver Info Row */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <Avatar className="h-10 w-10 border-2 border-white shadow-sm">
                                            <AvatarImage src={vehicle.driverImg || ""} />
                                            <AvatarFallback className="bg-zinc-100 text-zinc-400 font-bold">
                                                {vehicle.driver ? vehicle.driver.charAt(0) : <User size={16} />}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="text-sm font-bold text-zinc-900 leading-none">
                                                {vehicle.driver || "Sin Asignar"}
                                            </p>
                                            <p className="text-xs text-zinc-500 mt-1">Conductor</p>
                                        </div>
                                    </div>

                                    {/* Quick Actions */}
                                    <div className="flex gap-2">
                                        {vehicle.driverPhone && (
                                            <Button size="icon" variant="outline" className="h-9 w-9 rounded-full border-zinc-200 text-zinc-600 hover:text-green-600 hover:border-green-200 hover:bg-green-50" asChild>
                                                <a href={`tel:${vehicle.driverPhone}`}>
                                                    <Phone size={14} />
                                                </a>
                                            </Button>
                                        )}
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-9 w-9 rounded-full text-zinc-400 hover:text-zinc-900"
                                            onClick={() => setSelectedVehicle(vehicle)}
                                        >
                                            <MoreVertical size={16} />
                                        </Button>
                                    </div>
                                </div>

                                {/* Metrics Grid */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-zinc-50 rounded-xl p-3 flex flex-col gap-1 border border-zinc-100">
                                        <div className="flex items-center gap-2 text-zinc-500 text-xs font-medium uppercase tracking-wider">
                                            <Fuel size={12} /> Gasolina
                                        </div>
                                        <div className="flex items-end gap-1">
                                            <span className={`text-lg font-bold leading-none ${getFuelColor(vehicle.current_fuel_level)}`}>
                                                {vehicle.current_fuel_level}%
                                            </span>
                                            <div className="flex-1 h-1.5 bg-zinc-200 rounded-full mb-1 ml-2 overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all duration-500 ${vehicle.current_fuel_level < 25 ? 'bg-red-500' : vehicle.current_fuel_level < 50 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                                    style={{ width: `${vehicle.current_fuel_level}%` }}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-zinc-50 rounded-xl p-3 flex flex-col gap-1 border border-zinc-100">
                                        <div className="flex items-center gap-2 text-zinc-500 text-xs font-medium uppercase tracking-wider">
                                            <Gauge size={12} /> Kilometraje
                                        </div>
                                        <span className="text-lg font-bold text-zinc-700 leading-none">
                                            {vehicle.kilometraje.toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )
                })}
            </div>

            {dialogVehicle && (
                <VehicleDetailsDialog
                    isOpen={!!dialogVehicle}
                    onClose={() => setSelectedVehicle(null)}
                    vehicle={dialogVehicle}
                    readonly={true}
                />
            )}
        </div>
    )
}
