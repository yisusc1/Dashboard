"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Home as HomeIcon, Truck, LogOut, ArrowRight, AlertTriangle, Car, Fuel, MapPin, QrCode, FileText } from "lucide-react"
import { LogoutButton } from "@/components/ui/logout-button"
import { useSearchParams, useRouter } from "next/navigation"
import { SalidaFormDialog } from "@/components/salida-form-dialog"
import { EntradaFormDialog } from "@/components/entrada-form-dialog"
import { ReportFaultDialog } from "@/components/report-fault-dialog"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import QRCode from "react-qr-code"
import Link from "next/link"
import { VehicleSelector } from "@/components/vehicle-selector" // [FIX] Import added

import { assignVehicleToDriver } from "./actions" // [FIX] Import server action

// ... inside component ...

// (Removed misplaced function)
// ... imports fixed ...

type Vehicle = {
    id: string
    modelo: string
    placa: string
    codigo: string
    falla_activa?: any
    current_fuel_level?: number
    kilometraje?: number
    foto_url?: string // [UPDATED] Use correct column name
}

type Profile = {
    id: string
    first_name: string
    last_name: string
    national_id: string
}

export default function TransportePage() {
    const [loading, setLoading] = useState(true)
    const [profile, setProfile] = useState<Profile | null>(null)
    const [assignedVehicle, setAssignedVehicle] = useState<Vehicle | null>(null) // For Driver Mode

    // Pool Mode States
    const [vehicles, setVehicles] = useState<Vehicle[]>([])
    const [selectedVehicleId, setSelectedVehicleId] = useState<string>("")
    const [activeTripReport, setActiveTripReport] = useState<any>(null) // [NEW] Track active trip for user

    // Dialog States
    const [salidaOpen, setSalidaOpen] = useState(false)
    const [entradaOpen, setEntradaOpen] = useState(false)
    const [faultOpen, setFaultOpen] = useState(false)
    const [vehicleSelectOpen, setVehicleSelectOpen] = useState(false) // For manual select in Pool Mode
    const [qrOpen, setQrOpen] = useState(false) // For Driver Mode

    const [initialVehicleId, setInitialVehicleId] = useState<string>("")

    const searchParams = useSearchParams()
    const router = useRouter()
    const supabase = createClient()

    useEffect(() => {
        loadData()
    }, [])

    useEffect(() => {
        const action = searchParams.get('action')
        const vId = searchParams.get('vehicle_id')

        if (vId) setInitialVehicleId(vId)

        if (action === 'salida' && vId) {
            setSalidaOpen(true)
        } else if (action === 'entrada' && vId) {
            setEntradaOpen(true)
        }
    }, [searchParams])

    async function loadData(silent = false) {
        if (!silent) setLoading(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                router.push('/login')
                return
            }

            // 1. Fetch Profile
            const { data: profileData } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single()
            setProfile(profileData)

            // 2. Check for Assigned Vehicle (Driver Mode)
            // IF user is 'mecanico', we SKIP Driver Mode to allow them to see ALL vehicles
            // Normalize roles to avoid case sensitivity issues
            const isMecanico = (profileData.roles || []).map((r: string) => r.toLowerCase()).includes('mecanico')
            let myVehicle = null

            if (!isMecanico) {
                const { data } = await supabase
                    .from('vehiculos')
                    .select('*')
                    .eq('assigned_driver_id', user.id)
                    .limit(1)
                    .maybeSingle()
                myVehicle = data
            }

            if (myVehicle) {
                setAssignedVehicle(myVehicle)
            }

            // 3. Always load Pool for Selector availability
            // [FIX] 'kilometraje' is not in 'vehiculos' table. We must fetch it from view or omit.
            // Fetch Vehicles
            const { data: allVehicles } = await supabase
                .from('vehiculos')
                .select('id, modelo, placa, codigo, foto_url')
                .order('modelo', { ascending: true })

            // 4. [FIX] Check for Active Trip (PRIORITY over Assigned)
            // Logic: If user has an open trip, THAT is the context vehicle.
            const { data: activeTripData } = await supabase
                .from('reportes')
                .select('*')
                .eq('user_id', user.id)
                .is('km_entrada', null)
                .limit(1)
                .maybeSingle()

            let contextVehicle = null

            // If active trip exists, fetch THAT vehicle and use it
            if (activeTripData) {
                const { data: tripVehicle } = await supabase
                    .from('vehiculos')
                    .select('*')
                    .eq('id', activeTripData.vehiculo_id)
                    .single()

                if (tripVehicle) {
                    contextVehicle = tripVehicle
                    setActiveTripReport(activeTripData)
                }
            } else {
                // If no active trip, fallback to Assigned Vehicle
                if (myVehicle) {
                    contextVehicle = myVehicle
                }
                setActiveTripReport(null)
            }

            // Set the vehicle context
            if (contextVehicle) {
                setAssignedVehicle(contextVehicle)
            } else {
                // Optimization: Only load pool if NO context vehicle to show
                // Actually, we moved pool load to 'loadVehicleList' on demand (for selector),
                // BUT we might want to pre-load for speed or just leave it lazy.
                // Let's leave it lazy OR empty.
            }

        } catch (error: any) {
            console.error("Error loading data:", error)
            toast.error("Error al cargar datos del panel")
        } finally {
            if (!silent) setLoading(false)
        }
    }

    // --- SHARED ACTIONS ---
    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push('/login')
    }

    // --- POOL MODE HANDLERS ---
    const startFaultReportingPool = () => {
        setVehicleSelectOpen(true)
    }

    // [NEW] Refresh vehicles when selector opens to ensure fresh list
    useEffect(() => {
        if (vehicleSelectOpen) {
            // [FIX] ONLY load vehicle list, DO NOT reload profile/assigned vehicle
            // This prevents overwriting the manually selected vehicle
            loadVehicleList()
        }
    }, [vehicleSelectOpen])

    async function loadVehicleList() {
        if (!profile) return

        // [FIX] 'kilometraje' is not in 'vehiculos' table. We must fetch it from view or omit.
        // Fetch Vehicles WITH DEPARTMENT FILTER
        let query = supabase
            .from('vehiculos')
            .select('id, modelo, placa, codigo, foto_url, department') // [FIX] Added department to check
            .order('modelo', { ascending: true })

        // [RULE] If NOT admin/mecanico, filter by department
        // Assuming profile has 'department' field.
        const isSuperUser = (profile.roles || []).includes('admin') || (profile.roles || []).includes('mecanico')
        // @ts-ignore - Check if department exists in profile type or implied
        if (!isSuperUser && profile.department) {
            // @ts-ignore
            query = query.or(`department.eq.${profile.department},department.is.null`) // Show user's dept OR shared/null
        }

        const { data: allVehicles } = await query

        // [NEW] Fetch Occupied Vehicles (Active Trips)
        const { data: occupiedData } = await supabase
            .from('reportes')
            .select('vehiculo_id')
            .is('km_entrada', null)

        const occupiedIds = new Set(occupiedData?.map(r => r.vehiculo_id) || [])

        // Fetch Mileage Data
        const { data: kData } = await supabase
            .from('vista_ultimos_kilometrajes')
            .select('vehiculo_id, ultimo_kilometraje')

        if (allVehicles) {
            // Filter out occupied vehicles AND Merge mileage
            const availableVehicles = allVehicles
                .filter(v => !occupiedIds.has(v.id)) // [FILTER] Exclude busy vehicles
                .map(v => ({
                    ...v,
                    kilometraje: kData?.find(k => k.vehiculo_id === v.id)?.ultimo_kilometraje || 0
                }))
            // @ts-ignore
            setVehicles(availableVehicles)
        }
    }

    const confirmVehicleSelectionPool = async (targetId?: string) => {
        const vId = targetId || selectedVehicleId
        if (!vId || !profile) return
        setLoading(true) // Show loading state

        try {
            // [CONSTRAINT] Block change if active trip exists
            if (activeTripReport) {
                toast.error("No puedes cambiar de unidad con un viaje activo. Registra la entrada primero.")
                setVehicleSelectOpen(false)
                setLoading(false)
                return
            }

            // [FIX] Use Server Action to Assign (Bypass potential RLS or client issues)
            const result = await assignVehicleToDriver(vId)

            if (!result.success) {
                throw new Error(result.error)
            }

            toast.success("Vehículo asignado correctamente")

            // 3. Refresh Context
            setVehicleSelectOpen(false)

            // Find the vehicle object locally to update state immediately before reload
            const v = vehicles.find(v => v.id === selectedVehicleId)
            if (v) {
                setAssignedVehicle(v)
                checkTripForVehicle(v.id)
            }

            // Reload all data to ensure consistency
            loadData(true)

        } catch (error) {
            console.error(error)
            // @ts-ignore
            toast.error("Error al asignar el vehículo: " + (error.message || "Descociendo"))
        } finally {
            setLoading(false)
        }
    }

    // [NEW] Helper to check trip status for a specific switched vehicle
    async function checkTripForVehicle(vId: string) {
        setActiveTripReport(null) // Reset first
        const { data } = await supabase
            .from('reportes')
            .select('*')
            .eq('vehiculo_id', vId)
            .is('km_entrada', null)
            .limit(1)
            .maybeSingle()

        if (data) setActiveTripReport(data)
    }

    // --- RENDER HELPERS ---

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center bg-zinc-50 text-zinc-400">Cargando panel...</div>
    }

    return (
        <main className="min-h-screen bg-zinc-50 pb-20">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-12">

                {/* HEADER STANDARDIZED */}
                <div className="flex justify-between items-end mb-12">
                    <div>
                        <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-1">
                            {assignedVehicle ? "Modo Chofer" : "Panel de Operaciones"}
                        </h2>
                        <h1 className="text-3xl font-bold text-zinc-900 tracking-tight">
                            Hola, {profile?.first_name || 'Usuario'}
                        </h1>
                    </div>
                    <div className="flex gap-2">
                        <Link
                            href="/"
                            className="p-2 text-zinc-400 hover:text-zinc-900 transition-colors rounded-full hover:bg-zinc-100 flex items-center justify-center"
                            title="Ir al inicio"
                        >
                            <HomeIcon size={24} />
                        </Link>
                        <LogoutButton />
                    </div>
                </div>

                {/* DRIVER SPECIFIC HEADER */}
                {assignedVehicle && (
                    <div className="mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
                        <div className="bg-white rounded-[2rem] p-6 border border-zinc-100 shadow-sm relative"> {/* Removed overflow-hidden to allow absolute if needed, but top-6 is fine inside */}

                            {/* [MOVED] Cambio de Unidad - Absolute Top Right of Card */}
                            <Button
                                variant="ghost"
                                disabled={!!activeTripReport} // [FIX] Disable if in trip
                                onClick={() => {
                                    if (activeTripReport) {
                                        toast.error("Debes finalizar tu viaje actual antes de cambiar de unidad.")
                                        return
                                    }
                                    setVehicleSelectOpen(true)
                                }}
                                className={`absolute top-6 right-6 h-10 px-4 rounded-xl text-xs font-semibold flex items-center gap-2 ${activeTripReport ? 'text-zinc-300 cursor-not-allowed' : 'text-zinc-400 hover:text-zinc-900 hover:bg-zinc-50'}`}
                            >
                                <Car size={16} />
                                Cambiar Unidad
                            </Button>

                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mt-2"> {/* Added margin top to avoid overlap if on mobile */}
                                <div>
                                    <h3 className="text-zinc-400 text-xs font-bold uppercase tracking-widest mb-2">Vehículo Asignado</h3>
                                    <div className="flex items-center gap-4">
                                        {/* [NEW] Image Logic */}
                                        {(assignedVehicle.foto_url || assignedVehicle.modelo.toUpperCase().includes('MITSUBISHI L300')) ? (
                                            <div className="h-16 w-16 bg-zinc-100 rounded-2xl flex items-center justify-center overflow-hidden border border-zinc-200">
                                                <img
                                                    src={assignedVehicle.foto_url || "/vehicles/mitsubishi_l300.png"}
                                                    alt={assignedVehicle.modelo}
                                                    className="h-full w-full object-cover"
                                                />
                                            </div>
                                        ) : (
                                            <div className="h-16 w-16 bg-zinc-100 rounded-2xl flex items-center justify-center text-zinc-900">
                                                <Car size={32} />
                                            </div>
                                        )}
                                        <div>
                                            <h2 className="text-2xl font-bold text-zinc-900 leading-tight">{assignedVehicle.modelo}</h2>
                                            <div className="flex items-center gap-3 mt-1">
                                                <span className="font-mono text-zinc-500 bg-zinc-50 px-2 py-0.5 rounded-lg border border-zinc-200 text-sm">
                                                    {assignedVehicle.placa}
                                                </span>
                                                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-bold border border-blue-100">
                                                    <Fuel size={12} />
                                                    {assignedVehicle.current_fuel_level || 0}%
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-2 relative mt-4">
                                {/* QR BUTTON FOR DRIVER (Centered or full width on mobile) */}
                                <Dialog open={qrOpen} onOpenChange={setQrOpen}>
                                    <DialogTrigger asChild>
                                        <Button className="h-14 px-6 rounded-2xl bg-black text-white hover:bg-zinc-800 shadow-lg shadow-zinc-200/50 active:scale-95 transition-all text-sm font-semibold flex items-center gap-2 w-full sm:w-auto justify-center">
                                            <QrCode size={18} />
                                            <span>Código de Combustible</span>
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="sm:max-w-md bg-white border-none shadow-2xl rounded-[2.5rem] p-8 flex flex-col items-center">
                                        <DialogHeader>
                                            <DialogTitle className="text-center text-2xl font-bold">Código de Carga</DialogTitle>
                                            <DialogDescription className="text-center text-zinc-400">Autorización Digital</DialogDescription>
                                        </DialogHeader>
                                        <div className="p-6 bg-white border border-zinc-100 shadow-lg rounded-[2rem] mb-4 w-full max-w-[280px]">
                                            <div style={{ height: "auto", margin: "0 auto", width: "100%" }}>
                                                <QRCode
                                                    size={256}
                                                    style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                                                    value={JSON.stringify({
                                                        type: 'FUEL_AUTH',
                                                        driverId: profile?.id,
                                                        vehicleId: assignedVehicle.id,
                                                        placa: assignedVehicle.placa,
                                                        driverName: `${profile?.first_name} ${profile?.last_name}`
                                                    })}
                                                    viewBox={`0 0 256 256`}
                                                />
                                            </div>
                                        </div>
                                        <p className="font-mono text-sm font-bold text-zinc-900 tracking-widest bg-zinc-50 px-4 py-2 rounded-xl border border-zinc-100">
                                            {assignedVehicle.placa}
                                        </p>
                                    </DialogContent>
                                </Dialog>
                            </div>
                        </div>
                    </div>
                )}

                {/* UNIFIED ACTION GRID (3 CARDS) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* CARD 1: SALIDA */}
                    <button
                        disabled={!!activeTripReport} // [NEW] Disable if in trip
                        onClick={() => {
                            if (activeTripReport) return // Prevent click if disabled check fails
                            if (assignedVehicle) {
                                setInitialVehicleId(assignedVehicle.id)
                                setSalidaOpen(true)
                            } else {
                                setInitialVehicleId("")
                                setSalidaOpen(true)
                            }
                        }}
                        className={`group relative overflow-hidden bg-white rounded-[32px] p-8 border border-zinc-200 shadow-sm transition-all duration-300 text-left h-full ${activeTripReport ? 'opacity-60 cursor-not-allowed bg-zinc-50' : 'hover:shadow-xl hover:border-zinc-300'}`}
                    >
                        <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110 duration-500">
                            <Truck size={100} />
                        </div>
                        <div className="relative z-10 flex flex-col h-full justify-between space-y-6">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${activeTripReport ? 'bg-zinc-100 text-zinc-400' : 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white'}`}>
                                <Truck size={24} />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-zinc-900 mb-2">
                                    {activeTripReport ? "En Ruta (Activo)" : "Registrar Salida"}
                                </h2>
                                <p className="text-zinc-500 text-sm font-medium">
                                    {activeTripReport ? "Tienes un viaje en curso. Registra la entrada para iniciar otro." : (assignedVehicle ? "Iniciar ruta con tu unidad asignada." : "Seleccionar vehículo del departamento para iniciar ruta.")}
                                </p>
                            </div>
                            {!activeTripReport && (
                                <div className="flex items-center text-indigo-600 font-bold text-sm group-hover:translate-x-1 transition-transform">
                                    Iniciar <ArrowRight size={16} className="ml-2" />
                                </div>
                            )}
                        </div>
                    </button>

                    {/* CARD 2: ENTRADA */}
                    <button
                        disabled={!activeTripReport} // [NEW] Disable if NOT in trip
                        onClick={() => {
                            if (!activeTripReport) return // Prevent click

                            // [NEW] Logic: If active trip, PRE-SELECT that vehicle
                            if (activeTripReport) {
                                setInitialVehicleId(activeTripReport.vehiculo_id)
                                setEntradaOpen(true)
                            }
                        }}
                        className={`group relative overflow-hidden bg-white rounded-[32px] p-8 border border-zinc-200 shadow-sm transition-all duration-300 text-left h-full ${!activeTripReport ? 'opacity-60 cursor-not-allowed bg-zinc-50' : 'hover:shadow-xl hover:border-zinc-300'}`}
                    >
                        <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110 duration-500">
                            <LogOut size={100} className="scale-x-[-1]" />
                        </div>
                        <div className="relative z-10 flex flex-col h-full justify-between space-y-6">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${!activeTripReport ? 'bg-zinc-100 text-zinc-400' : 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white'}`}>
                                <LogOut size={24} className="scale-x-[-1]" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-zinc-900 mb-2">
                                    {!activeTripReport ? "Sin Viaje Activo" : "Registrar Entrada"}
                                </h2>
                                <p className="text-zinc-500 text-sm font-medium">
                                    {!activeTripReport ? "No tienes un vehículo en ruta actualmente. Registra una salida primero." : (assignedVehicle ? "Finalizar ruta y reportar kilometraje." : "Cerrar ruta, registrar kilometraje y liberar vehículo.")}
                                </p>
                            </div>
                            {activeTripReport && (
                                <div className="flex items-center text-emerald-600 font-bold text-sm group-hover:translate-x-1 transition-transform">
                                    Registrar <ArrowRight size={16} className="ml-2" />
                                </div>
                            )}
                        </div>
                    </button>

                    {/* CARD 3: FALLA */}
                    <button
                        onClick={() => {
                            if (assignedVehicle) {
                                setSelectedVehicleId(assignedVehicle.id)
                                setFaultOpen(true)
                            } else {
                                startFaultReportingPool()
                            }
                        }}
                        className="group relative overflow-hidden bg-white rounded-[32px] p-8 border border-zinc-200 shadow-sm hover:shadow-xl hover:border-red-200 transition-all duration-300 text-left h-full"
                    >
                        <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110 duration-500">
                            <AlertTriangle size={100} />
                        </div>
                        <div className="relative z-10 flex flex-col h-full justify-between space-y-6">
                            <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center text-red-600 group-hover:bg-red-600 group-hover:text-white transition-colors">
                                <AlertTriangle size={24} />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-zinc-900 mb-2">Reportar Falla</h2>
                                <p className="text-zinc-500 text-sm font-medium">
                                    {assignedVehicle ? "Notificar avería en tu unidad asignada." : "Notificar avería en un vehículo de la flota."}
                                </p>
                            </div>
                            <div className="flex items-center text-red-600 font-bold text-sm group-hover:translate-x-1 transition-transform">
                                Reportar <ArrowRight size={16} className="ml-2" />
                            </div>
                        </div>
                    </button>
                </div>

                {/* MODALS */}
                <SalidaFormDialog
                    isOpen={salidaOpen}
                    onClose={() => setSalidaOpen(false)}
                    initialVehicleId={initialVehicleId}
                    onSuccess={() => {
                        loadData(true) // [NEW] Silent reload to keep dialog open
                    }}
                />

                <EntradaFormDialog
                    isOpen={entradaOpen}
                    onClose={() => setEntradaOpen(false)}
                    initialVehicleId={initialVehicleId}
                    onSuccess={() => {
                        loadData(true) // [NEW] Silent reload to keep dialog open
                    }}
                />

                {/* POOL SELECTOR DIALOG */}
                <Dialog open={vehicleSelectOpen} onOpenChange={setVehicleSelectOpen}>
                    <DialogContent className="sm:max-w-md rounded-2xl border-none shadow-2xl">
                        <DialogTitle className="sr-only">Seleccionar Vehículo</DialogTitle> {/* [FIX] Accessiblity */}
                        <DialogDescription className="sr-only">
                            Seleccione un vehículo de la lista disponible para operar.
                        </DialogDescription>

                        {/* [MOD] Using VehicleSelector for Rich UI */}
                        <VehicleSelector
                            vehicles={vehicles}
                            selectedVehicleId={selectedVehicleId}
                            onSelect={(v) => {
                                if (v) {
                                    setSelectedVehicleId(v.id)
                                    // [FIX] Call Server Action immediately to persist assignment
                                    confirmVehicleSelectionPool(v.id)
                                } else {
                                    // [FIX] Handle Deselection (User clicked 'Cambiar')
                                    setSelectedVehicleId("")
                                    // Do NOT clear assignedVehicle yet, user is just browsing. 
                                }
                            }}
                            label="Seleccionar Unidad"
                        />
                        <div className="flex justify-end">
                            <Button variant="ghost" onClick={() => setVehicleSelectOpen(false)} className="rounded-xl mt-2 text-zinc-400">Cancelar</Button>
                        </div>
                    </DialogContent>
                </Dialog>

                {/* FAULT DIALOG */}
                {(selectedVehicleId || (assignedVehicle && faultOpen)) && (
                    <ReportFaultDialog
                        isOpen={faultOpen}
                        onClose={() => {
                            setFaultOpen(false)
                            if (!assignedVehicle) setSelectedVehicleId("") // Reset only if pool
                        }}
                        vehicleId={assignedVehicle ? assignedVehicle.id : selectedVehicleId}
                        onFaultReported={() => { }}
                    />
                )}
            </div>
        </main>
    )
}
