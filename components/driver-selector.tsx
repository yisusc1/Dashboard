"use client"

import { useState, useMemo } from "react"
import { Command, Search, User, Loader2, Phone, IdCard } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"

export interface Driver {
    id: string
    first_name?: string
    last_name?: string
    national_id?: string
    phone?: string
    currentVehicle?: {
        id: string
        modelo: string
        placa: string
    } | null
}

interface DriverSelectorProps {
    drivers: Driver[]
    selectedDriverId?: string | null
    onSelect: (driver: Driver | null) => void
    loading?: boolean
    label?: string
}

export function DriverSelector({
    drivers,
    selectedDriverId,
    onSelect,
    loading = false,
    label = "Conductor Asignado"
}: DriverSelectorProps) {
    const [searchTerm, setSearchTerm] = useState("")

    const selectedDriver = useMemo(() =>
        selectedDriverId && selectedDriverId !== 'none'
            ? drivers.find(d => d.id === selectedDriverId)
            : null,
        [drivers, selectedDriverId])

    const filteredDrivers = useMemo(() => {
        if (!searchTerm) return drivers
        const lower = searchTerm.toLowerCase()
        return drivers.filter(d =>
            (d.first_name?.toLowerCase().includes(lower) || false) ||
            (d.last_name?.toLowerCase().includes(lower) || false) ||
            (d.national_id?.toLowerCase().includes(lower) || false)
        )
    }, [drivers, searchTerm])

    if (selectedDriver) {
        return (
            <div className="space-y-3">
                <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">{label}</Label>
                <div className="flex items-center justify-between p-3 bg-white border border-zinc-200 rounded-xl shadow-sm animate-in fade-in zoom-in-95 duration-200">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-zinc-100 rounded-full flex items-center justify-center shrink-0">
                            <User size={18} className="text-zinc-500" />
                        </div>
                        <div>
                            <div className="font-bold text-sm text-zinc-900">
                                {selectedDriver.first_name} {selectedDriver.last_name}
                            </div>
                            <div className="text-xs text-zinc-500 flex items-center gap-3 mt-0.5">
                                {selectedDriver.national_id && (
                                    <span className="flex items-center gap-1">
                                        <IdCard size={12} />
                                        {selectedDriver.national_id}
                                    </span>
                                )}
                                {selectedDriver.phone && (
                                    <span className="flex items-center gap-1">
                                        <Phone size={12} />
                                        {selectedDriver.phone}
                                    </span>
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
                        placeholder="Buscar por nombre o cédula..."
                        className="pl-9 h-12 rounded-xl bg-white border-zinc-200 focus-visible:ring-black"
                    />
                </div>

                <div className="mt-2 max-h-60 overflow-y-auto border border-zinc-200 rounded-xl bg-white divide-y divide-zinc-50 shadow-sm scrollbar-thin scrollbar-thumb-zinc-200 scrollbar-track-transparent">
                    {loading ? (
                        <div className="p-8 text-center text-zinc-400 text-sm flex flex-col items-center gap-2">
                            <Loader2 className="animate-spin" size={20} />
                            <span>Cargando conductores...</span>
                        </div>
                    ) : filteredDrivers.length === 0 ? (
                        <div className="p-8 text-center text-zinc-400 text-sm">
                            {searchTerm ? "No se encontraron resultados" : "No hay conductores disponibles"}
                        </div>
                    ) : (
                        filteredDrivers.map(d => (
                            <div
                                key={d.id}
                                onClick={() => onSelect(d)}
                                className="p-3 hover:bg-zinc-50 cursor-pointer flex justify-between items-center transition-colors group"
                            >
                                <div>
                                    <div className="font-bold text-sm text-zinc-900 group-hover:text-black transition-colors">
                                        {d.first_name} {d.last_name}
                                    </div>
                                    <div className="text-xs text-zinc-500 flex items-center gap-3">
                                        {d.national_id && (
                                            <span className="flex items-center gap-1">
                                                <IdCard size={12} className="text-zinc-400" />
                                                {d.national_id}
                                            </span>
                                        )}
                                        {d.phone && (
                                            <span className="flex items-center gap-1">
                                                <Phone size={12} className="text-zinc-400" />
                                                {d.phone}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                {d.currentVehicle && (
                                    <div className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-md">
                                        {d.currentVehicle.modelo}
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
