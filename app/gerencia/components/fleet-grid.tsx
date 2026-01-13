"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Car, Truck, AlertTriangle, MapPin, User, CheckCircle2, Bike, Fuel, Gauge, Activity } from "lucide-react"
import type { FleetStatus } from "../actions" // Import type
import { useState } from "react"
import { VehicleDetailsDialog } from "@/components/vehicle-details-dialog"

export function FleetGrid({ vehicles }: { vehicles: FleetStatus[] }) {
    const [selectedVehicle, setSelectedVehicle] = useState<FleetStatus | null>(null)

    const getStatusColor = (status: FleetStatus['status']) => {
        switch (status) {
            case 'IN_ROUTE': return "bg-green-500/10 text-green-700 border-green-200/50"
            case 'CRITICAL': return "bg-red-500/10 text-red-700 border-red-200/50"
            case 'MAINTENANCE': return "bg-amber-500/10 text-amber-700 border-amber-200/50"
            default: return "bg-zinc-500/10 text-zinc-700 border-zinc-200/50"
        }
    }

    const getStatusLabel = (status: FleetStatus['status']) => {
        switch (status) {
            case 'IN_ROUTE': return "En Ruta"
            case 'CRITICAL': return "Falla Activa"
            case 'MAINTENANCE': return "En Taller"
            default: return "En Galpón"
        }
    }

    const getFuelColor = (level: number) => {
        if (level < 25) return 'bg-red-50 text-red-700 border-red-100'
        if (level < 50) return 'bg-amber-50 text-amber-700 border-amber-100'
        return 'bg-blue-50 text-blue-700 border-blue-100'
    }

    return (
        <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {vehicles.map((vehicle) => (
                    <Card
                        key={vehicle.id}
                        className="overflow-hidden rounded-[32px] bg-white border border-zinc-100 shadow-sm hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-500 group cursor-pointer"
                        onClick={() => setSelectedVehicle(vehicle)}
                    >
                        {/* IMAGE AREA */}
                        <div className="h-40 bg-zinc-50 relative group-hover:scale-105 transition-transform duration-700">
                            {vehicle.imageUrl ? (
                                <img src={vehicle.imageUrl} alt={vehicle.plate} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-zinc-300">
                                    <Truck size={48} />
                                </div>
                            )}

                            {/* Status Badge Overlay - iOS Glass Style */}
                            <div className="absolute top-4 right-4">
                                <div className={`
                                flex items-center gap-2 px-3 py-1.5 rounded-full 
                                backdrop-blur-xl bg-white/80 border border-white/40 shadow-sm
                                transition-all duration-300 hover:bg-white/90
                            `}>
                                    {/* Status Dot */}
                                    <span className={`relative flex h-2.5 w-2.5`}>
                                        {vehicle.status === 'IN_ROUTE' && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>}
                                        <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${vehicle.status === 'IN_ROUTE' ? 'bg-green-500' :
                                            vehicle.status === 'CRITICAL' ? 'bg-red-500' :
                                                vehicle.status === 'MAINTENANCE' ? 'bg-amber-500' : 'bg-zinc-400'
                                            }`}></span>
                                    </span>

                                    <span className={`text-xs font-semibold tracking-wide ${vehicle.status === 'IN_ROUTE' ? 'text-green-800' :
                                        vehicle.status === 'CRITICAL' ? 'text-red-800' :
                                            vehicle.status === 'MAINTENANCE' ? 'text-amber-800' : 'text-zinc-600'
                                        }`}>
                                        {getStatusLabel(vehicle.status)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <CardContent className="p-5">
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <h3 className="font-bold text-lg text-zinc-900">{vehicle.model}</h3>
                                    <p className="text-zinc-500 text-sm font-mono">{vehicle.plate} • {vehicle.code}</p>
                                </div>
                                <div className="bg-zinc-100/50 p-2 rounded-full backdrop-blur-sm">
                                    {vehicle.tipo === 'Moto' ? <Bike size={20} className="text-zinc-500" /> : <Car size={20} className="text-zinc-500" />}
                                </div>
                            </div>

                            <div className="space-y-3 mt-4">
                                <div className="flex items-center gap-3 text-sm text-zinc-600 bg-zinc-50 p-2 rounded-lg">
                                    <User size={16} className="text-zinc-400" />
                                    <span className="font-medium truncate">
                                        {vehicle.driver || "Sin conductor"}
                                    </span>
                                </div>

                                {/* Fuel & Mileage Row - Compact Pills */}
                                <div className="flex items-center gap-2 mt-3">
                                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border shadow-sm ${getFuelColor(vehicle.current_fuel_level)}`}>
                                        <Fuel size={12} strokeWidth={2.5} />
                                        <span>{vehicle.current_fuel_level}%</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-50 text-zinc-600 text-xs font-bold border border-zinc-100 shadow-sm">
                                        <Gauge size={12} strokeWidth={2.5} />
                                        <span className="font-mono tracking-tight">{vehicle.kilometraje?.toLocaleString()} km</span>
                                    </div>
                                </div>

                                {vehicle.status === 'IN_ROUTE' ? (
                                    <div className="flex items-center gap-3 text-xs text-green-600 bg-green-50 p-2 rounded-lg border border-green-100 mt-3">
                                        <MapPin size={14} className="animate-bounce" />
                                        <span>Salida: {new Date(vehicle.lastExit!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-3 text-xs text-zinc-400 bg-zinc-50 p-2 rounded-lg mt-3">
                                        <CheckCircle2 size={14} />
                                        <span>En Galpón</span>
                                    </div>
                                )}

                                {vehicle.faultsSummary && (vehicle.faultsSummary.critical > 0 || vehicle.faultsSummary.high > 0 || vehicle.faultsSummary.medium > 0 || vehicle.faultsSummary.low > 0) && (
                                    <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-zinc-100">
                                        {vehicle.faultsSummary.critical > 0 && (
                                            <div className="flex items-center gap-1 px-2 py-1 bg-red-50 text-red-600 rounded-full border border-red-100">
                                                <AlertTriangle size={10} strokeWidth={2.5} />
                                                <span className="text-[10px] font-bold">{vehicle.faultsSummary.critical} Críticas</span>
                                            </div>
                                        )}
                                        {vehicle.faultsSummary.high > 0 && (
                                            <div className="flex items-center gap-1 px-2 py-1 bg-orange-50 text-orange-600 rounded-full border border-orange-100">
                                                <Activity size={10} strokeWidth={2.5} />
                                                <span className="text-[10px] font-bold">{vehicle.faultsSummary.high} Altas</span>
                                            </div>
                                        )}
                                        {vehicle.faultsSummary.medium > 0 && (
                                            <div className="flex items-center gap-1 px-2 py-1 bg-yellow-50 text-yellow-600 rounded-full border border-yellow-100">
                                                <Activity size={10} strokeWidth={2.5} />
                                                <span className="text-[10px] font-bold">{vehicle.faultsSummary.medium} Medias</span>
                                            </div>
                                        )}
                                        {vehicle.faultsSummary.low > 0 && (
                                            <div className="flex items-center gap-1 px-2 py-1 bg-zinc-50 text-zinc-500 rounded-full border border-zinc-100">
                                                <Activity size={10} strokeWidth={2.5} />
                                                <span className="text-[10px] font-bold">{vehicle.faultsSummary.low} Bajas</span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {selectedVehicle && (
                <VehicleDetailsDialog
                    isOpen={!!selectedVehicle}
                    onClose={() => setSelectedVehicle(null)}
                    vehicle={{
                        ...selectedVehicle,
                        codigo: selectedVehicle.code,
                        modelo: selectedVehicle.model,
                        placa: selectedVehicle.plate,
                        foto_url: selectedVehicle.imageUrl,
                        // Ensure all required fields for Vehicle type are present
                        // FleetStatus spans almost all, mapping code/imageUrl fixes the diff.
                    } as any}
                    readonly={true}
                />
            )}
        </>
    )
}
