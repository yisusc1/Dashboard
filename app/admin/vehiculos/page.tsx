"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { Suspense, useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { VehicleFormDialog } from "@/components/vehicle-form-dialog"
import { VehicleDetailsDialog } from "@/components/vehicle-details-dialog"
import { MileageCorrectionDialog } from "@/components/mileage-correction-dialog"
import { Plus, Search, Car, Bike, Truck, MoreVertical, Pencil, Trash2, Home as HomeIcon, MapPin, Zap, Wrench, AlertTriangle, CheckCircle, Fuel, Clock, User as UserIcon, XCircle, Download } from "lucide-react"


import { LogoutButton } from "@/components/ui/logout-button"
import Image from "next/image"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
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

function VehiculosContent() {
    const searchParams = useSearchParams()
    const initialSearch = searchParams.get("q") || ""

    const [vehicles, setVehicles] = useState<Vehicle[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState("")
    const [dialogOpen, setDialogOpen] = useState(false)
    const [detailsOpen, setDetailsOpen] = useState(false)
    const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null)
    const [deletingVehicle, setDeletingVehicle] = useState<Vehicle | null>(null)
    const [detailsVehicle, setDetailsVehicle] = useState<Vehicle | null>(null)
    const [correctionVehicle, setCorrectionVehicle] = useState<Vehicle | null>(null)

    // Open Trips State
    const [openTrips, setOpenTrips] = useState<any[]>([])
    const [forceCloseDialog, setForceCloseDialog] = useState(false)
    const [tripToClose, setTripToClose] = useState<any | null>(null)
    const [forceCloseKm, setForceCloseKm] = useState("")
    const [forceCloseNote, setForceCloseNote] = useState("")
    const [closingTrip, setClosingTrip] = useState(false)
    const [exporting, setExporting] = useState(false)

    async function exportToExcel() {
        setExporting(true)
        try {
            const supabase = createClient()
            
            // 1. Obtener todos los vehículos
            const { data: vehiculosData, error: vehError } = await supabase
                .from('vehiculos')
                .select('*')

            if (vehError) throw vehError

            // 2. Fallas activas
            const { data: fallasData, error: fallasError } = await supabase
                .from('fallas')
                .select('*')
                .neq('estado', 'Reparado')
                .neq('estado', 'Descartado')
            
            if (fallasError) throw fallasError

            // Formatear booleano a texto
            const formatCheck = (val: boolean | undefined | null) => val ? 'Sí' : 'No'

            const excelDataPromises = vehiculosData.map(async (v) => {
                // Obtener el último reporte de cada vehículo
                const { data: lr } = await supabase
                    .from('reportes')
                    .select('*')
                    .eq('vehiculo_id', v.id)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .single()
                
                const fallas = fallasData.filter(f => f.vehiculo_id === v.id).map(f => `[${f.prioridad}] ${f.tipo_falla}: ${f.descripcion}`).join(' | ')
                
                const isSalida = lr && !lr.km_entrada;
                const status = isSalida ? 'En Ruta' : 'Disponible / En Base';
                const driver = isSalida ? lr.conductor : (lr?.conductor || 'Ninguno');
                const isMoto = v.tipo?.toLowerCase().includes('moto') || v.modelo?.toLowerCase().includes('moto')

                return {
                    "Código": v.codigo,
                    "Placa": v.placa,
                    "Modelo": v.modelo,
                    "Tipo": v.tipo || 'Desconocido',
                    "Color": v.color || 'Desconocido',
                    "Estado Actual": status,
                    "Último Conductor": driver,
                    "Kilometraje Actual": v.kilometraje || lr?.km_entrada || lr?.km_salida || 0,
                    "Nivel Gasolina (%)": v.current_fuel_level || 0,
                    "Fallas Activas": fallas || 'Ninguna',
                    
                    // Chequeo Técnico
                    "Aceite (Últ. Reporte)": formatCheck(isSalida ? lr?.aceite_salida : lr?.aceite_entrada),
                    "Iluminación": formatCheck(isSalida ? lr?.luces_salida : lr?.luces_entrada),
                    "Frenos": formatCheck(isSalida ? lr?.frenos_salida : lr?.frenos_entrada),
                    "Cauchos": isSalida ? (lr?.estado_cauchos_salida || 'N/A') : (lr?.estado_cauchos_entrada || 'N/A'),
                    "Corneta": formatCheck(isSalida ? lr?.corneta_salida : lr?.corneta_entrada),
                    "Agua/Refrigerante": isMoto ? 'N/A' : formatCheck(isSalida ? lr?.agua_salida : lr?.agua_entrada),

                    // Seguridad y Herramientas
                    "Cinturones": isMoto ? 'N/A' : formatCheck(isSalida ? lr?.cinturones_salida : lr?.cinturones_entrada),
                    "Conos": isMoto ? 'N/A' : formatCheck(isSalida ? lr?.conos_salida : lr?.conos_entrada),
                    "Extintor": isMoto ? 'N/A' : formatCheck(isSalida ? lr?.extintor_salida : lr?.extintor_entrada),
                    "Botiquín": isMoto ? 'N/A' : formatCheck(isSalida ? lr?.botiquin_salida : lr?.botiquin_entrada),
                    "Gato": isMoto ? 'N/A' : formatCheck(isSalida ? lr?.gato_salida : lr?.gato_entrada),
                    "Llave Cruz": isMoto ? 'N/A' : formatCheck(isSalida ? lr?.cruz_salida : lr?.cruz_entrada),
                    "Triángulo": isMoto ? 'N/A' : formatCheck(isSalida ? lr?.triangulo_salida : lr?.triangulo_entrada),
                    "Caucho Repuesto": isMoto ? 'N/A' : formatCheck(isSalida ? lr?.caucho_salida : lr?.caucho_entrada),
                    "Carpeta de Permisos": isMoto ? 'N/A' : formatCheck(isSalida ? lr?.carpeta_salida : lr?.carpeta_entrada),
                    
                    // Moto Specific
                    "Casco (Moto)": isMoto ? formatCheck(isSalida ? lr?.casco_salida : lr?.casco_entrada) : 'N/A',
                    "Herramientas Moto": isMoto ? formatCheck(isSalida ? lr?.herramientas_salida : lr?.herramientas_entrada) : 'N/A',
                    
                    "Departamento (Últ. Viaje)": lr?.departamento || 'N/A',
                    "Último Reporte ID": lr?.id || 'N/A',
                    "Fecha Último Reporte": lr ? new Date(lr.created_at).toLocaleString() : 'N/A'
                }
            })

            const excelData = await Promise.all(excelDataPromises)

            const XLSX = await import('xlsx')
            const worksheet = XLSX.utils.json_to_sheet(excelData)
            const workbook = XLSX.utils.book_new()
            XLSX.utils.book_append_sheet(workbook, worksheet, "Flota")
            
            XLSX.writeFile(workbook, `Reporte_Flota_${new Date().toISOString().split('T')[0]}.xlsx`)
            toast.success("Excel generado con éxito")
        } catch (error) {
            console.error("Error exporting to Excel:", error)
            toast.error("Error al exportar a Excel")
        } finally {
            setExporting(false)
        }
    }

    // Calculate filteredVehicles based on manual search
    const filteredVehicles = vehicles.filter(v =>
        v.placa.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.modelo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.codigo.toLowerCase().includes(searchTerm.toLowerCase())
    )

    // HANDLE DEEP LINK (Voice Command)
    useEffect(() => {
        if (!loading && initialSearch && vehicles.length > 0) {
            // Find specific vehicle requested via URL
            const targetVehicle = vehicles.find(v =>
                v.placa.toLowerCase().includes(initialSearch.toLowerCase()) ||
                v.modelo.toLowerCase().includes(initialSearch.toLowerCase()) ||
                v.codigo.toLowerCase().includes(initialSearch.toLowerCase())
            )

            if (targetVehicle) {
                setDetailsVehicle(targetVehicle)
                setDetailsOpen(true)

                // VISUAL FIX: Also filter the grid so user sees what was found
                setSearchTerm(initialSearch)

                // Clean URL to prevent re-opening loops and allow closing
                const newUrl = new URL(window.location.href)
                newUrl.searchParams.delete("q")
                window.history.replaceState({}, "", newUrl.toString())
            } else if (initialSearch) {
                // If loaded but not found, warn user
                toast.warning(`No encontré vehículos coincidiendo con "${initialSearch}"`)
                // Also clean URL so toast doesn't persist
                const newUrl = new URL(window.location.href)
                newUrl.searchParams.delete("q")
                window.history.replaceState({}, "", newUrl.toString())
            }
        }
    }, [loading, initialSearch, vehicles]) // Only runs when data is loaded or URL changes

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

            if (mileageError) console.error('Error fetching mileages:', JSON.stringify(mileageError, null, 2))
            if (faultsError) console.error('Error fetching defaults:', JSON.stringify(faultsError, null, 2))

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

            // 5. Fetch Open Trips (no km_entrada)
            const { data: tripsData } = await supabase
                .from('reportes')
                .select('id, vehiculo_id, conductor, km_salida, fecha_salida, user_id')
                .is('km_entrada', null)
                .order('fecha_salida', { ascending: false })

            if (tripsData && tripsData.length > 0) {
                const enrichedTrips = tripsData.map(t => {
                    const v = mergedVehicles.find(v => v.id === t.vehiculo_id)
                    const hoursActive = Math.floor((Date.now() - new Date(t.fecha_salida).getTime()) / (1000 * 3600))
                    return {
                        ...t,
                        vehicleModel: v?.modelo || 'Desconocido',
                        vehiclePlaca: v?.placa || '',
                        hoursActive
                    }
                })
                setOpenTrips(enrichedTrips)
            } else {
                setOpenTrips([])
            }
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

    const getIcon = (tipo: string) => {
        switch (tipo?.toLowerCase()) {
            case 'moto': return <Bike size={20} />;
            case 'carga': return <Truck size={20} />;
            default: return <Car size={20} />;
        }
    }

    // Helper for Fault Icons
    const getFaultIcon = (type: string) => {
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
                        onClick={exportToExcel}
                        disabled={exporting}
                        className="h-14 px-6 bg-emerald-600 text-white font-semibold rounded-2xl flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all active:scale-[0.98] shadow-sm disabled:opacity-50"
                    >
                        {exporting ? (
                            <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                        ) : (
                            <Download size={20} />
                        )}
                        Exportar
                    </button>
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

                {/* OPEN TRIPS ALERT */}
                {openTrips.length > 0 && (
                    <div className="mb-8 bg-amber-50 border border-amber-200 rounded-[24px] p-5 shadow-sm">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="h-10 w-10 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600">
                                <Clock size={20} />
                            </div>
                            <div>
                                <h3 className="font-bold text-amber-900 text-lg">Viajes Abiertos</h3>
                                <p className="text-xs text-amber-700">{openTrips.length} vehículo{openTrips.length > 1 ? 's' : ''} sin registrar entrada</p>
                            </div>
                        </div>
                        <div className="space-y-3">
                            {openTrips.map(trip => (
                                <div key={trip.id} className="bg-white rounded-2xl border border-amber-100 p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-zinc-900">{trip.vehicleModel}</span>
                                            <span className="text-xs font-mono bg-zinc-100 text-zinc-500 px-2 py-[2px] rounded-md">{trip.vehiclePlaca}</span>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-zinc-500">
                                            <span className="flex items-center gap-1"><UserIcon size={12} /> {trip.conductor || 'Sin conductor'}</span>
                                            <span className="flex items-center gap-1"><MapPin size={12} /> Salida: {trip.km_salida?.toLocaleString()} km</span>
                                            <span className={`flex items-center gap-1 font-bold ${trip.hoursActive > 12 ? 'text-red-500' : trip.hoursActive > 6 ? 'text-amber-600' : 'text-zinc-500'}`}>
                                                <Clock size={12} /> {trip.hoursActive}h activo
                                            </span>
                                        </div>
                                    </div>
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            setTripToClose(trip)
                                            setForceCloseKm(trip.km_salida?.toString() || "")
                                            setForceCloseNote("")
                                            setForceCloseDialog(true)
                                        }}
                                        className="h-10 rounded-xl border-amber-200 text-amber-700 hover:bg-amber-100 hover:text-amber-800 font-bold text-sm shrink-0"
                                    >
                                        <XCircle size={16} className="mr-[6px]" />
                                        Forzar Entrada
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

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
                                        <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-bold ml-auto ${(vehicle.current_fuel_level || 0) <= 25 ? "bg-red-50 text-red-600" :
                                            (vehicle.current_fuel_level || 0) <= 50 ? "bg-yellow-50 text-yellow-700" :
                                                "bg-emerald-50 text-emerald-700"
                                            }`}>
                                            <Fuel size={14} />
                                            <span>{vehicle.current_fuel_level || 0}%</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity" >
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
                                            <DropdownMenuItem onClick={() => setCorrectionVehicle(vehicle)}>
                                                <div className="flex items-center w-full">
                                                    <Wrench className="mr-2 h-4 w-4" />
                                                    <span>Corregir Kilometraje</span>
                                                </div>
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>

                            </div>
                        ))}
                    </div>
                )
                }
            </div>

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

            <MileageCorrectionDialog
                isOpen={!!correctionVehicle}
                onClose={() => setCorrectionVehicle(null)}
                vehicleId={correctionVehicle?.id || ""}
                vehicleName={`${correctionVehicle?.modelo} - ${correctionVehicle?.placa}`}
                currentMileage={correctionVehicle?.kilometraje || 0}
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

            {/* FORCE CLOSE TRIP DIALOG */}
            <Dialog open={forceCloseDialog} onOpenChange={(open) => { if (!open) setForceCloseDialog(false) }}>
                <DialogContent className="max-w-md rounded-3xl border-none shadow-2xl bg-white p-6">
                    <DialogHeader>
                        <div className="mx-auto bg-amber-100 w-16 h-16 rounded-full flex items-center justify-center mb-4 text-amber-600">
                            <XCircle size={32} />
                        </div>
                        <DialogTitle className="text-center text-xl font-bold text-zinc-900">Forzar Cierre de Viaje</DialogTitle>
                        <DialogDescription className="text-center text-zinc-500">
                            Cerrarás administrativamente el viaje de <strong>{tripToClose?.vehicleModel}</strong> ({tripToClose?.vehiclePlaca}) — Conductor: {tripToClose?.conductor || 'Desconocido'}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 mt-4">
                        <div>
                            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 block">KM Estimado de Entrada</label>
                            <Input
                                type="number"
                                min={tripToClose?.km_salida || 0}
                                value={forceCloseKm}
                                onChange={e => setForceCloseKm(e.target.value)}
                                placeholder="Ej. 45320"
                                className="h-14 rounded-2xl font-mono font-bold text-lg"
                            />
                            <p className="text-[10px] text-zinc-400 mt-1">KM de salida registrado: {tripToClose?.km_salida?.toLocaleString() || 0}</p>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 block">Nota de Cierre</label>
                            <Textarea
                                value={forceCloseNote}
                                onChange={e => setForceCloseNote(e.target.value)}
                                placeholder="Motivo del cierre administrativo..."
                                className="resize-none h-24 rounded-2xl"
                            />
                        </div>
                    </div>

                    <DialogFooter className="flex-col sm:flex-row gap-3 mt-6">
                        <Button
                            variant="outline"
                            onClick={() => setForceCloseDialog(false)}
                            className="rounded-2xl h-12 border-zinc-200"
                        >
                            Cancelar
                        </Button>
                        <Button
                            disabled={closingTrip || !forceCloseKm}
                            onClick={async () => {
                                if (!tripToClose || !forceCloseKm) return
                                setClosingTrip(true)
                                try {
                                    const supabase = createClient()
                                    const { error } = await supabase
                                        .from('reportes')
                                        .update({
                                            km_entrada: parseInt(forceCloseKm),
                                            fecha_entrada: new Date().toISOString(),
                                            observaciones_entrada: `[Cierre Administrativo] ${forceCloseNote || 'Sin nota'}`
                                        })
                                        .eq('id', tripToClose.id)
                                    if (error) throw error

                                    // [NEW] Update Vehicle Master Record to match forced entry
                                    await supabase
                                        .from('vehiculos')
                                        .update({ kilometraje: parseInt(forceCloseKm) })
                                        .eq('id', tripToClose.vehiculo_id)

                                    toast.success('Viaje cerrado administrativamente')
                                    setForceCloseDialog(false)
                                    setTripToClose(null)
                                    loadVehicles()
                                } catch (err: any) {
                                    toast.error('Error al cerrar viaje: ' + err.message)
                                } finally {
                                    setClosingTrip(false)
                                }
                            }}
                            className="rounded-2xl h-12 bg-amber-600 text-white hover:bg-amber-700 font-bold shadow-lg shadow-amber-200"
                        >
                            {closingTrip ? 'Cerrando...' : 'Confirmar Cierre'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </main>
    )
}

export default function AdminVehiculosPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
                <div className="animate-spin w-8 h-8 border-4 border-zinc-200 border-t-black rounded-full"></div>
            </div>
        }>
            <VehiculosContent />
        </Suspense>
    )
}
