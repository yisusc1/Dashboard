"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { VehicleFormDialog } from "@/components/vehicle-form-dialog"
import { VehicleDetailsDialog } from "@/components/vehicle-details-dialog"
import { Plus, Search, Car, Bike, Truck, MoreVertical, Pencil, Trash2, Home as HomeIcon, MapPin, Zap, Wrench, AlertTriangle, CheckCircle, Fuel } from "lucide-react"
import { LogoutButton } from "@/components/ui/logout-button"
import Image from "next/image"
import { toast } from "sonner"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"

type Vehicle = {
    id: string
    codigo: string
    placa: string
    modelo: string
    año: string
    color: string
    tipo: string
    capacidad_tanque: string
    foto_url?: string
    department?: string
    kilometraje?: number
    falla_activa?: {
        prioridad: string
        tipo_falla: string
    }
    current_fuel_level?: number
    last_fuel_update?: string
    last_oil_change_km?: number
    last_timing_belt_km?: number
    last_chain_kit_km?: number
    last_wash_date?: string
}

export default function AdminVehiculosPage() {
    const [vehicles, setVehicles] = useState<Vehicle[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState("")
    const [dialogOpen, setDialogOpen] = useState(false)
    const [detailsOpen, setDetailsOpen] = useState(false)
    const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null)
    const [deletingVehicle, setDeletingVehicle] = useState<Vehicle | null>(null)
    const [detailsVehicle, setDetailsVehicle] = useState<Vehicle | null>(null)

    useEffect(() => {
        loadVehicles()
    }, [])

    async function loadVehicles() {
        try {
            const supabase = createClient()

            // 1. Fetch Basic Vehicle Data
            const { data: vehiclesData, error: vehiclesError } = await supabase
                .from('vehiculos')
                .select('*')
                .order('created_at', { ascending: false })

            if (vehiclesError) throw vehiclesError

            // 2. Fetch Latest Mileage View
            const { data: mileageData, error: mileageError } = await supabase
                .from('vista_ultimos_kilometrajes')
                .select('vehiculo_id, ultimo_kilometraje')

            // 3. Fetch Active Faults
            const { data: faultsData, error: faultsError } = await supabase
                .from('fallas')
                .select('vehiculo_id, prioridad, tipo_falla')
                .neq('estado', 'Reparado')
                .neq('estado', 'Descartado')

            if (mileageError) console.error('Error fetching mileages:', mileageError)
            if (faultsError) console.error('Error fetching defaults:', faultsError)

            // 4. Merge Data
            const mergedVehicles = vehiclesData?.map(vehicle => {
                const mileageRecord = mileageData?.find(m => m.vehiculo_id === vehicle.id)
                // Find highest priority fault if multiple
                const activeFaults = faultsData?.filter(f => f.vehiculo_id === vehicle.id) || []
                let mainFault = null

                if (activeFaults.length > 0) {
                    // Simple priority check: Critical > Alta > Media > Baja
                    const priorityOrder = ['Crítica', 'Alta', 'Media', 'Baja']
                    mainFault = activeFaults.sort((a, b) => {
                        return priorityOrder.indexOf(a.prioridad) - priorityOrder.indexOf(b.prioridad)
                    })[0]
                }

                return {
                    ...vehicle,
                    kilometraje: mileageRecord?.ultimo_kilometraje || 0,
                    falla_activa: mainFault ? { prioridad: mainFault.prioridad, tipo_falla: mainFault.tipo_falla } : undefined
                }
            }) || []

            setVehicles(mergedVehicles)
        } catch (error) {
            console.error('Error loading vehicles:', error)
            toast.error('Error al cargar vehículos')
        } finally {
            setLoading(false)
        }
    }

    async function executeDelete() {
        if (!deletingVehicle) return

        try {
            const supabase = createClient()
            const { error } = await supabase
                .from('vehiculos')
                .delete()
                .eq('id', deletingVehicle.id)

            if (error) throw error

            toast.success('Vehículo eliminado')
            loadVehicles()
        } catch (error) {
            console.error('Error deleting:', error)
            toast.error('Error al eliminar. Verifique que no tenga reportes asociados.')
        } finally {
            setDeletingVehicle(null)
        }
    }

    const filteredVehicles = vehicles.filter(v =>
        v.placa.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.modelo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.codigo.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const getIcon = (tipo: string) => {
        switch (tipo?.toLowerCase()) {
            case 'moto': return <Bike size={20} />;
            case 'carga': return <Truck size={20} />;
            default: return <Car size={20} />;
        }
    }

    // Helper for Fault Icons (duplicated from TallerPage but useful here)
    const getFaultIcon = (type: string) => {
        // Need to import Zap, Wrench, AlertTriangle, CheckCircle if not already imported
        // imports are: Plus, Search, Car, Bike, Truck, MoreVertical, Pencil, Trash2, Home as HomeIcon, MapPin
        // I need to add Wrench, AlertTriangle, CheckCircle, Zap to imports
        switch (type) {
            case 'Mecánica': return <Wrench size={16} />
            case 'Eléctrica': return <Zap size={16} />
            case 'Cauchos': return <CheckCircle size={16} />
            default: return <AlertTriangle size={16} />
        }
    }

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'Crítica': return 'text-red-500 bg-red-50 border-red-200'
            case 'Alta': return 'text-orange-500 bg-orange-50 border-orange-200'
            case 'Media': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
            case 'Baja': return 'text-blue-500 bg-blue-50 border-blue-200'
            default: return 'text-zinc-500 bg-zinc-50 border-zinc-200'
        }
    }

    return (
        <main className="min-h-screen bg-zinc-50 pb-20">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-12">
                {/* HEADER */}
                <div className="flex justify-between items-end mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-zinc-900 tracking-tight">Flota de Vehículos</h1>
                        <p className="text-zinc-500 font-medium mt-1">Panel de Administración</p>
                    </div>
                    <div className="flex gap-2">
                        <a
                            href="/"
                            className="p-2 text-zinc-400 hover:text-zinc-900 transition-colors rounded-full hover:bg-zinc-100 flex items-center justify-center"
                            title="Ir al inicio"
                        >
                            <HomeIcon size={24} />
                        </a>
                        <LogoutButton />
                    </div>
                </div>

                {/* CONTROLS */}
                <div className="flex flex-col sm:flex-row gap-4 mb-8">
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-4 text-zinc-400" size={20} />
                        <input
                            type="text"
                            placeholder="Buscar por placa, modelo o código..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full h-14 pl-12 pr-4 bg-white border border-zinc-200 rounded-2xl text-lg text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all shadow-sm"
                            suppressHydrationWarning
                        />
                    </div>
                    <button
                        onClick={() => {
                            setEditingVehicle(null)
                            setDialogOpen(true)
                        }}
                        className="h-14 px-8 bg-black text-white font-semibold rounded-2xl flex items-center justify-center gap-2 hover:bg-zinc-800 transition-all active:scale-[0.98] shadow-lg shadow-zinc-200"
                    >
                        <Plus size={24} />
                        Agregar Vehículo
                    </button>
                </div>

                {/* GRID */}
                {loading ? (
                    <div className="text-center py-20">
                        <div className="animate-spin w-8 h-8 border-4 border-zinc-200 border-t-black rounded-full mx-auto mb-4"></div>
                        <p className="text-zinc-400">Cargando flota...</p>
                    </div>
                ) : filteredVehicles.length === 0 ? (
                    <div className="text-center py-20 px-6 bg-white rounded-3xl border border-zinc-200 shadow-sm">
                        <p className="text-zinc-400 text-lg mb-6">No se encontraron vehículos</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredVehicles.map((vehicle) => (
                            <div key={vehicle.id} className="bg-white rounded-[24px] border border-zinc-200 p-4 shadow-sm hover:shadow-md transition-all group overflow-hidden relative">

                                {/* Image Aspect Ratio Container - CLICKABLE */}
                                <div
                                    className="aspect-video relative rounded-xl bg-zinc-100 mb-4 overflow-hidden cursor-pointer active:scale-95 transition-transform"
                                    onClick={() => {
                                        setDetailsVehicle(vehicle)
                                        setDetailsOpen(true)
                                    }}
                                >
                                    {vehicle.foto_url ? (
                                        <Image
                                            src={vehicle.foto_url}
                                            alt={vehicle.modelo}
                                            fill
                                            className="object-cover group-hover:scale-105 transition-transform duration-500"
                                        />
                                    ) : (
                                        <div className="flex items-center justify-center h-full text-zinc-300">
                                            {getIcon(vehicle.tipo)}
                                        </div>
                                    )}

                                    {/* Badge Tipo */}
                                    <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-md text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5">
                                        {getIcon(vehicle.tipo)}
                                        {vehicle.tipo || 'Vehículo'}
                                    </div>

                                    {/* Badge Kilometraje */}
                                    <div className="absolute bottom-2 right-2 bg-white/90 backdrop-blur-md text-zinc-900 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5 shadow-sm border border-white/50">
                                        <MapPin size={12} className="text-zinc-500" />
                                        {(vehicle.kilometraje || 0).toLocaleString()} km
                                    </div>
                                </div>

                                <div className="mb-2 flex justify-between items-start">
                                    <div>
                                        <h3 className="font-bold text-zinc-900 text-lg leading-tight">{vehicle.modelo}</h3>
                                        <p className="text-zinc-500 font-mono text-sm">{vehicle.placa}</p>
                                    </div>
                                    {vehicle.falla_activa && (
                                        <div className={`p-1.5 rounded-full border ${getPriorityColor(vehicle.falla_activa.prioridad)} shadow-sm`}>
                                            {getFaultIcon(vehicle.falla_activa.tipo_falla)}
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-2 text-sm text-zinc-600 mt-4 border-t border-zinc-50 pt-3">
                                    <div>
                                        <span className="block text-xs text-zinc-400 font-medium">Año</span>
                                        {vehicle.año || '-'}
                                    </div>
                                    <div>
                                        <span className="block text-xs text-zinc-400 font-medium">Color</span>
                                        {vehicle.color || '-'}
                                    </div>
                                    <div className="col-span-2 mt-3 flex justify-between items-center">
                                        {vehicle.department && (
                                            <div className="bg-zinc-100 text-zinc-500 text-xs px-2 py-1 rounded-md font-medium">
                                                {vehicle.department}
                                            </div>
                                        )}
                                        <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-bold ${(vehicle.current_fuel_level || 0) <= 25 ? "bg-red-50 text-red-600" :
                                            (vehicle.current_fuel_level || 0) <= 50 ? "bg-yellow-50 text-yellow-700" :
                                                "bg-emerald-50 text-emerald-700"
                                            } ${!vehicle.department ? "ml-auto" : ""}`}>
                                            <Fuel size={14} />
                                            <span>{vehicle.current_fuel_level || 0}%</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Actions */}
                                < div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity" >
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <button className="w-8 h-8 bg-white/90 backdrop-blur rounded-full flex items-center justify-center text-zinc-900 shadow-sm hover:bg-white">
                                                <MoreVertical size={16} />
                                            </button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="rounded-xl border-zinc-200">
                                            <DropdownMenuItem onClick={() => {
                                                setEditingVehicle(vehicle)
                                                setDialogOpen(true)
                                            }}>
                                                <Pencil className="mr-2 h-4 w-4" /> Editar
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => setDeletingVehicle(vehicle)} className="text-red-600 focus:text-red-700 focus:bg-red-50">
                                                <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>

                            </div>
                        ))}
                    </div>
                )
                }
            </div >

            <VehicleFormDialog
                isOpen={dialogOpen}
                onClose={() => setDialogOpen(false)}
                onVehicleSaved={loadVehicles}
                vehicleToEdit={editingVehicle}
            />

            <VehicleDetailsDialog
                isOpen={detailsOpen}
                onClose={() => setDetailsOpen(false)}
                vehicle={detailsVehicle}
                onUpdate={loadVehicles}
            />

            <AlertDialog open={!!deletingVehicle} onOpenChange={(open) => !open && setDeletingVehicle(null)}>
                <AlertDialogContent className="rounded-3xl border-none shadow-2xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-xl font-bold text-zinc-900">¿Eliminar Vehículo?</AlertDialogTitle>
                        <AlertDialogDescription className="text-zinc-500 text-base">
                            Se eliminará el vehículo <strong>{deletingVehicle?.modelo}</strong> ({deletingVehicle?.placa}).
                            Esta acción podría fallar si existen reportes asociados.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-xl h-12 border-zinc-200 text-zinc-900 font-medium">Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={executeDelete} className="rounded-xl h-12 bg-red-600 hover:bg-red-700 text-white font-medium">
                            Eliminar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

        </main >
    )
}
