"use client"

import { useState, useMemo } from "react"
import { Command, Search, Car, Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"

export interface Vehicle {
    id: string
    placa: string
    modelo: string
    tipo?: string
    kilometraje?: number | null
    codigo?: string // Useful for "Salida" display
}

interface VehicleSelectorProps {
    vehicles: Vehicle[]
    selectedVehicleId?: string
    onSelect: (vehicle: Vehicle | null) => void
    loading?: boolean
    label?: string
}

export function VehicleSelector({
    vehicles,
    selectedVehicleId,
    onSelect,
    loading = false,
    label = "Vehículo"
}: VehicleSelectorProps) {
    const [searchTerm, setSearchTerm] = useState("")

    const selectedVehicle = useMemo(() =>
        vehicles.find(v => v.id === selectedVehicleId),
        [vehicles, selectedVehicleId])

    const filteredVehicles = useMemo(() => {
        if (!searchTerm) return vehicles
        const lower = searchTerm.toLowerCase()
        return vehicles.filter(v =>
            v.placa.toLowerCase().includes(lower) ||
            v.modelo.toLowerCase().includes(lower) ||
            (v.codigo && v.codigo.toLowerCase().includes(lower))
        )
    }, [vehicles, searchTerm])

    if (selectedVehicle) {
        return (
            <div className="space-y-3">
                <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">{label}</Label>
                <div className="flex items-center justify-between p-3 bg-white border border-zinc-200 rounded-xl shadow-sm animate-in fade-in zoom-in-95 duration-200">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-zinc-100 rounded-full flex items-center justify-center shrink-0">
                            <Car size={18} className="text-zinc-500" />
                        </div>
                        <div>
                            <div className="font-bold text-sm text-zinc-900">{selectedVehicle.modelo}</div>
                            <div className="text-xs text-zinc-500 font-mono flex items-center gap-2">
                                <span>{selectedVehicle.placa}</span>
                                {selectedVehicle.codigo && (
                                    <span className="bg-zinc-100 px-1.5 rounded">{selectedVehicle.codigo}</span>
                                )}
                            </div>
                        </div>
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                            onSelect(null)
                            setSearchTerm("")
                        }}
                        className="text-xs h-8"
                    >
                        Cambiar
                    </Button>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-3">
            <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">{label}</Label>
            <div className="relative">
                <div className="relative">
                    <Command className="absolute left-3 top-3 text-zinc-400" size={16} />
                    <Input
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Buscar placa, modelo o código..."
                        className="pl-9 h-12 rounded-xl bg-white border-zinc-200 focus-visible:ring-black"
                    />
                </div>

                <div className="mt-2 max-h-60 overflow-y-auto border border-zinc-200 rounded-xl bg-white divide-y divide-zinc-50 shadow-sm scrollbar-thin scrollbar-thumb-zinc-200 scrollbar-track-transparent">
                    {loading ? (
                        <div className="p-8 text-center text-zinc-400 text-sm flex flex-col items-center gap-2">
                            <Loader2 className="animate-spin" size={20} />
                            <span>Cargando vehículos...</span>
                        </div>
                    ) : filteredVehicles.length === 0 ? (
                        <div className="p-8 text-center text-zinc-400 text-sm">
                            {searchTerm ? "No se encontraron resultados" : "No hay vehículos disponibles"}
                        </div>
                    ) : (
                        filteredVehicles.map(v => (
                            <div
                                key={v.id}
                                onClick={() => onSelect(v)}
                                className="p-3 hover:bg-zinc-50 cursor-pointer flex justify-between items-center transition-colors group"
                            >
                                <div>
                                    <div className="font-bold text-sm text-zinc-900 group-hover:text-black transition-colors">{v.modelo}</div>
                                    <div className="text-xs text-zinc-500 font-mono flex items-center gap-2">
                                        {v.placa}
                                        {v.codigo && <span className="text-zinc-300">|</span>}
                                        {v.codigo}
                                    </div>
                                </div>
                                {(v.kilometraje !== undefined && v.kilometraje !== null) && (
                                    <div className="text-xs font-bold text-zinc-400 bg-zinc-100 px-2 py-1 rounded-md group-hover:bg-zinc-200 transition-colors">
                                        {v.kilometraje.toLocaleString()} km
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    )
}
