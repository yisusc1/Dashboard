"use client"

import { VoiceHint } from "@/components/voice-hint"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useSearchParams, useRouter } from "next/navigation"
import { Search, Wrench, CheckCircle, Clock, AlertTriangle, ArrowRight, Home as HomeIcon, Zap } from "lucide-react"
import { LogoutButton } from "@/components/ui/logout-button"
import Image from "next/image"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { MaintenanceRegistrationDialog } from "@/components/maintenance-registration-dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

type Fault = {
    id: string
    vehiculo_id: string
    descripcion: string
    tipo_falla: string
    prioridad: string
    created_at: string
    placa: string
    modelo: string
    foto_url?: string
    estado: 'Pendiente' | 'En Revisión' | 'Reparado' | 'Descartado'
    fecha_solucion?: string
    isMaintenance?: boolean // Flag for synthetic maintenance alerts
}

export default function TallerPage() {
    const [faults, setFaults] = useState<Fault[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState("")

    const searchParams = useSearchParams()
    const router = useRouter()

    // Dialog State
    const [maintenanceOpen, setMaintenanceOpen] = useState(false)
    const [selectedVehicleId, setSelectedVehicleId] = useState<string | undefined>(undefined)
    const [selectedServiceType, setSelectedServiceType] = useState<string | undefined>(undefined)
    const [pendingResolveId, setPendingResolveId] = useState<string | null>(null)

    // History State
    // [Mod] Expanded View State
    const [view, setView] = useState<'board' | 'pending' | 'review' | 'history'>('pending')
    const [historyLogs, setHistoryLogs] = useState<any[]>([])
    const [loadingHistory, setLoadingHistory] = useState(false)
    const [vehicles, setVehicles] = useState<any[]>([])
    const [historyFilter, setHistoryFilter] = useState("all")

    useEffect(() => {
        loadFaults()
    }, [])

    // Voice/URL Action Handler
    useEffect(() => {
        const action = searchParams.get("action")
        const viewParam = searchParams.get("view")

        if (action === "new") {
            setMaintenanceOpen(true)
        }

        if (viewParam === "board") setView("board")
        if (viewParam === "history") setView("history")

    }, [searchParams])

    useEffect(() => {
        if (view === 'history') {
            loadHistory()
        }
    }, [view])

    // ... (keep existing loadFaults and loadHistory) ... (Wait, I need to make sure I don't delete them if I use replace_file_content with a range.
    // The previous tool call view_file showed lines 1-644. I need to be careful not to delete the helper functions.
    // I will use multi_replace to target specific blocks to be safer, or just replace the component body if I can match it well.
    // The render part is the complex one.

    // Let's use multi_replace for safer editing of the render method and state.

    // ...


    async function loadFaults() {
        try {
            const supabase = createClient()

            // 1. Fetch Existing Faults
            const { data: faultsData, error } = await supabase
                .from('fallas')
                .select(`
                    id,
                    vehiculo_id,
                    descripcion,
                    tipo_falla,
                    prioridad,
                    created_at,
                    estado,
                    fecha_solucion,
                    vehiculos (placa, modelo, foto_url)
                `)
                .neq('estado', 'Reparado')
                .neq('estado', 'Descartado')
                .order('created_at', { ascending: false })

            if (error) throw error

            // 2. Fetch Vehicles & Mileage for Maintenance Checks
            const { data: vehiclesData } = await supabase
                .from('vehiculos')
                .select('*')
                .order('modelo', { ascending: true })

            setVehicles(vehiclesData || [])
            const vehicles = vehiclesData

            const { data: mileageData } = await supabase.from('vista_ultimos_kilometrajes').select('*')

            // 3. Generate Maintenance Alerts
            const maintenanceAlerts: Fault[] = []

            vehicles?.forEach(v => {
                const km = mileageData?.find(m => m.vehiculo_id === v.id)?.ultimo_kilometraje || 0
                const model = v.modelo.toUpperCase()
                const isMoto = model.includes('MOTO') || v.tipo?.toLowerCase() === 'moto'
                const hasChainOrGear = ['HILUX', 'TRITON', 'DONFENG', 'RICH', 'NKR'].some(k => model.includes(k))

                // Check for existing active maintenance to avoid duplicates
                // We check if there is any active fault for this vehicle with 'Mantenimiento' type
                // and a matching description keyword (Aceite, Correa, Kit)
                const activeFaults = faultsData?.filter(f =>
                    f.vehiculo_id === v.id &&
                    f.tipo_falla === 'Mantenimiento' &&
                    (f.estado === 'Pendiente' || f.estado === 'En Revisión')
                ) || []

                // Rules
                // [Modified] Dynamic Oil Limit: 2000km for Motos, 5000km for others
                const OIL_LIMIT = isMoto ? 2000 : 5000
                const OIL_WARN = isMoto ? 1800 : 4500

                const BELT_LIMIT = 50000
                const BELT_WARN = 49000
                const CHAIN_LIMIT = 20000
                const CHAIN_WARN = 19000

                // Check Oil
                const distOil = km - (v.last_oil_change_km || 0)
                if (distOil >= OIL_WARN) {
                    const alreadyExists = activeFaults.some(f => f.descripcion.includes('Aceite'))
                    if (!alreadyExists) {
                        maintenanceAlerts.push({
                            id: `maint-oil-${v.id}`,
                            vehiculo_id: v.id,
                            descripcion: `Mantenimiento Preventivo Requerido: Cambio de Aceite (Uso: ${distOil.toLocaleString()} km)`,
                            tipo_falla: 'Mantenimiento',
                            prioridad: distOil >= OIL_LIMIT ? 'Crítica' : 'Alta',
                            created_at: new Date().toISOString(),
                            estado: 'Pendiente',
                            placa: v.placa,
                            modelo: v.modelo,
                            foto_url: v.foto_url,
                            isMaintenance: true
                        })
                    }
                }

                // Check Belt
                if (!isMoto && !hasChainOrGear) {
                    const distBelt = km - (v.last_timing_belt_km || 0)
                    if (distBelt >= BELT_WARN) {
                        const alreadyExists = activeFaults.some(f => f.descripcion.includes('Correa'))
                        if (!alreadyExists) {
                            maintenanceAlerts.push({
                                id: `maint-belt-${v.id}`,
                                vehiculo_id: v.id,
                                descripcion: `Mantenimiento Preventivo Requerido: Correa de Tiempo (Uso: ${distBelt.toLocaleString()} km)`,
                                tipo_falla: 'Mantenimiento',
                                prioridad: distBelt >= BELT_LIMIT ? 'Crítica' : 'Alta',
                                created_at: new Date().toISOString(),
                                estado: 'Pendiente',
                                placa: v.placa,
                                modelo: v.modelo,
                                foto_url: v.foto_url,
                                isMaintenance: true
                            })
                        }
                    }
                }

                // Check Chain
                if (isMoto) {
                    const distChain = km - (v.last_chain_kit_km || 0)
                    if (distChain >= CHAIN_WARN) {
                        const alreadyExists = activeFaults.some(f => f.descripcion.includes('Kit de Arrastre'))
                        if (!alreadyExists) {
                            maintenanceAlerts.push({
                                id: `maint-chain-${v.id}`,
                                vehiculo_id: v.id,
                                descripcion: `Mantenimiento Preventivo Requerido: Kit de Arrastre (Uso: ${distChain.toLocaleString()} km)`,
                                tipo_falla: 'Mantenimiento',
                                prioridad: distChain >= CHAIN_LIMIT ? 'Crítica' : 'Alta',
                                created_at: new Date().toISOString(),
                                estado: 'Pendiente',
                                placa: v.placa,
                                modelo: v.modelo,
                                foto_url: v.foto_url,
                                isMaintenance: true
                            })
                        }
                    }
                }
            })

            // 4. Merge
            // @ts-ignore
            const mappedFaults: Fault[] = faultsData?.map(f => ({
                id: f.id,
                vehiculo_id: f.vehiculo_id,
                descripcion: f.descripcion,
                tipo_falla: f.tipo_falla,
                prioridad: f.prioridad,
                created_at: f.created_at,
                estado: f.estado,
                fecha_solucion: f.fecha_solucion,
                // @ts-ignore
                placa: f.vehiculos?.placa || 'Desconocido',
                // @ts-ignore
                modelo: f.vehiculos?.modelo || 'Desconocido',
                // @ts-ignore
                foto_url: f.vehiculos?.foto_url
            })) || []

            setFaults([...maintenanceAlerts, ...mappedFaults])

        } catch (error) {
            console.error('Error loading faults:', error)
            toast.error('Error al cargar fallas')
        } finally {
            setLoading(false)
        }
    }

    async function loadHistory() {
        setLoadingHistory(true)
        const supabase = createClient()
        try {
            const { data: faultsData } = await supabase
                .from('fallas')
                .select(`id, descripcion, tipo_falla, fecha_solucion, created_at, vehiculos(placa, modelo)`)
                .eq('estado', 'Reparado')
                .order('fecha_solucion', { ascending: false })
                .limit(50)

            const { data: maintenanceData } = await supabase
                .from('maintenance_logs')
                .select(`id, service_type, mileage, notes, service_date, created_at, vehiculos(placa, modelo)`)
                .order('created_at', { ascending: false })
                .limit(50)

            const combined = [
                ...(faultsData?.map(f => ({
                    type: 'REPAIR',
                    date: f.fecha_solucion || f.created_at,
                    vehicle: (f.vehiculos as any)?.modelo || 'Desconocido',
                    placa: (f.vehiculos as any)?.placa || '',
                    description: f.descripcion,
                    category: f.tipo_falla,
                    id: f.id,
                    mileage: null
                })) || []),
                ...(maintenanceData?.map(m => ({
                    type: 'MAINTENANCE',
                    date: m.service_date || m.created_at,
                    vehicle: (m.vehiculos as any)?.modelo || 'Desconocido',
                    placa: (m.vehiculos as any)?.placa || '',
                    description: m.notes || 'Mantenimiento Preventivo',
                    category: m.service_type,
                    mileage: m.mileage,
                    id: m.id
                })) || [])
            ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

            setHistoryLogs(combined)
        } catch (error) {
            console.error('Error history:', error)
        } finally {
            setLoadingHistory(false)
        }
    }

    // --- ACTIONS ---

    async function promoteMaintenanceAlert(alert: Fault) {
        try {
            const supabase = createClient()

            // Check if already exists in 'En Revisión' to avoid duplicates? 
            // For now, we trust the user clicking once. 
            // Ideally we'd query to see if there's active maintenance for this vehicle type.

            const { error } = await supabase.from('fallas').insert({
                vehiculo_id: alert.vehiculo_id,
                descripcion: alert.descripcion,
                tipo_falla: 'Mantenimiento',
                prioridad: alert.prioridad,
                estado: 'En Revisión',
                created_at: new Date().toISOString()
            })

            if (error) throw error

            toast.success("Mantenimiento iniciado (Pasado a Revisión)")
            loadFaults()
        } catch (error) {
            console.error('Error promoting alert:', error)
            toast.error('Error al iniciar mantenimiento')
        }
    }

    async function handleReview(fault: Fault) {
        if (fault.isMaintenance) {
            await promoteMaintenanceAlert(fault)
        } else {
            await updateStatus(fault.id, 'En Revisión')
        }
    }

    function handleResolve(fault: Fault) {
        if (fault.tipo_falla === 'Mantenimiento') {
            console.log("Resolving Maintenance Fault:", fault.descripcion)
            setSelectedVehicleId(fault.vehiculo_id)
            setPendingResolveId(fault.id)

            // Determine Service Type from Description
            let serviceCode: string | undefined = undefined
            const desc = (fault.descripcion || "").toLowerCase()

            if (desc.includes('aceite')) serviceCode = 'OIL_CHANGE'
            else if (desc.includes('correa')) serviceCode = 'TIMING_BELT'
            else if (desc.includes('arrastre') || desc.includes('cadena') || desc.includes('kit')) serviceCode = 'CHAIN_KIT'
            else if (desc.includes('lavado')) serviceCode = 'WASH'

            if (!serviceCode) {
                toast.warning("No se pudo detectar el servicio específico. Seleccione manualmente.")
            } else {
                console.log("Detected Service:", serviceCode)
            }

            setSelectedServiceType(serviceCode)
            setMaintenanceOpen(true)
        } else {
            updateStatus(fault.id, 'Reparado')
        }
    }

    function handleMaintenanceSuccess() {
        if (pendingResolveId) {
            updateStatus(pendingResolveId, 'Reparado')
            setPendingResolveId(null)
        } else {
            loadFaults() // Just reload if it was a manual registration
        }
    }

    async function updateStatus(id: string, newStatus: string) {
        try {
            const supabase = createClient()
            const { error } = await supabase
                .from('fallas')
                .update({ estado: newStatus, fecha_solucion: newStatus === 'Reparado' ? new Date() : null })
                .eq('id', id)

            if (error) throw error

            toast.success(`Estado actualizado a: ${newStatus}`)
            loadFaults()
        } catch (error) {
            console.error('Error updating status:', error)
            toast.error('Error al actualizar estado')
        }
    }

    const filteredFaults = faults.filter(f =>
        f.placa.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.modelo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.tipo_falla.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const pending = filteredFaults.filter(f => f.estado === 'Pendiente')
    const inProgress = filteredFaults.filter(f => f.estado === 'En Revisión')

    return (
        <main className="min-h-screen bg-zinc-50 pb-20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-12">
                {/* HEADER */}
                <div className="flex flex-col gap-4 mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-zinc-900 tracking-tight">Taller Mecánico</h1>
                        <p className="text-zinc-500 font-medium mt-1">Gestión de Fallas y Mantenimiento</p>
                    </div>

                    {/* PC CONTROLS (Top Right) */}
                    <div className="hidden md:flex justify-between items-center bg-white p-2 rounded-2xl border border-zinc-200">
                        <div className="flex gap-1">
                            <VoiceHint command="Tablero" side="bottom">
                                <Button
                                    variant={view === 'board' ? 'secondary' : 'ghost'}
                                    onClick={() => setView('board')}
                                    className="text-xs h-9 rounded-lg px-4"
                                >
                                    Tablero Completo
                                </Button>
                            </VoiceHint>
                            <VoiceHint command="Historial" side="bottom">
                                <Button
                                    variant={view === 'history' ? 'secondary' : 'ghost'}
                                    onClick={() => setView('history')}
                                    className="text-xs h-9 rounded-lg px-4"
                                >
                                    Historial
                                </Button>
                            </VoiceHint>
                        </div>
                        <div className="flex gap-2">
                            <Button
                                onClick={() => {
                                    setSelectedVehicleId(undefined)
                                    setSelectedServiceType(undefined)
                                    setPendingResolveId(null)
                                    setMaintenanceOpen(true)
                                }}
                                className="bg-zinc-900 text-white hover:bg-zinc-800 gap-2 h-9 px-4 rounded-xl text-xs"
                            >
                                <Wrench size={14} />
                                Registrar Mantenimiento
                            </Button>
                            <a href="/" className="h-9 w-9 text-zinc-400 hover:text-zinc-900 rounded-xl border border-zinc-100 flex items-center justify-center">
                                <HomeIcon size={16} />
                            </a>
                            <LogoutButton />
                        </div>
                    </div>

                    {/* MOBILE CONTROLS (Stacked) */}
                    <div className="md:hidden flex flex-col gap-3">
                        <VoiceHint command="Registrar" side="bottom">
                            <Button
                                onClick={() => {
                                    setSelectedVehicleId(undefined)
                                    setSelectedServiceType(undefined)
                                    setPendingResolveId(null)
                                    setMaintenanceOpen(true)
                                }}
                                className="w-full h-12 bg-zinc-900 text-white font-bold rounded-xl shadow-lg shadow-zinc-200 active:scale-[0.98] transition-all"
                            >
                                <Wrench size={18} className="mr-2" />
                                Registrar Falla / Mantenimiento
                            </Button>
                        </VoiceHint>

                        {/* 1. Toggle Filter (3-way) */}
                        <div className="bg-zinc-100 p-1 rounded-xl flex">
                            <button
                                onClick={() => setView('pending')}
                                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${view === 'pending' || view === 'board' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500'}`}
                            >
                                Pendientes
                            </button>
                            <button
                                onClick={() => setView('review')}
                                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${view === 'review' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500'}`}
                            >
                                En Revisión
                            </button>
                            <button
                                onClick={() => setView('history')}
                                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${view === 'history' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500'}`}
                            >
                                Historial
                            </button>
                        </div>

                        {/* 2. Distinct Register Button (Below Filter) */}
                        {/* MOVED UP - Keep comment/structure if needed generally, but I moved the button up in my mental model, oh wait, I inserted it above in the previous chunk? 
                               No, looking at previous chunk 'MOBILE CONTROLS' start. 
                               The Original code has '1. Toggle Filter' THEN '2. Distinct Register Button'.
                               I want to wrap the Register button.
                            */}
                        {/* ... Actually let's just wrap the button where it is ... */}

                        {/* 3. Navigation */}
                        <div className="flex justify-between items-center px-1">
                            <a href="/" className="flex items-center gap-2 text-zinc-400 text-sm font-medium">
                                <HomeIcon size={16} /> Ir al Inicio
                            </a>
                            <LogoutButton />
                        </div>
                    </div>
                </div>

                {view !== 'history' ? (
                    <>
                        {/* CONTROLS (Search) */}
                        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4 mb-8">
                            <div className="relative flex-1">
                                <Search className="absolute left-4 top-3.5 text-zinc-400" size={20} />
                                <input
                                    type="text"
                                    placeholder="Buscar por placa o falla..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full h-12 pl-12 pr-4 bg-white border border-zinc-200 rounded-xl text-zinc-900 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all shadow-sm"
                                    suppressHydrationWarning
                                />
                            </div>
                            <div className="flex items-center justify-end gap-2 text-sm text-zinc-500">
                                <span className="font-bold text-zinc-900">{filteredFaults.length}</span> fallas activas
                            </div>
                        </div>

                        {loading ? (
                            <div className="text-center py-20">
                                <div className="animate-spin w-8 h-8 border-4 border-zinc-200 border-t-black rounded-full mx-auto mb-4"></div>
                                <p className="text-zinc-400">Cargando taller...</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                                {/* PENDIENTES */}
                                {(view === 'board' || view === 'pending') && (
                                    <div className={`space-y-4 ${view !== 'board' ? 'lg:col-span-2' : ''}`}>
                                        <h2 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></div>
                                            Pendientes ({pending.length})
                                        </h2>

                                        {pending.length === 0 && (
                                            <div className="p-8 text-center bg-white rounded-2xl border border-dashed border-zinc-200 text-zinc-400">
                                                No hay fallas pendientes por revisar
                                            </div>
                                        )}

                                        {pending.map(fault => (
                                            <FaultCard
                                                key={fault.id}
                                                fault={fault}
                                                onMoveToReview={() => handleReview(fault)}
                                                onResolve={() => handleResolve(fault)}
                                            />
                                        ))}
                                    </div>
                                )}

                                {/* EN REVISIÓN */}
                                {(view === 'board' || view === 'review') && (
                                    <div className={`space-y-4 ${view !== 'board' ? 'lg:col-span-2' : ''}`}>
                                        <h2 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                                            En Revisión ({inProgress.length})
                                        </h2>

                                        {inProgress.length === 0 && (
                                            <div className="p-8 text-center bg-white rounded-2xl border border-dashed border-zinc-200 text-zinc-400">
                                                No hay vehículos en el taller
                                            </div>
                                        )}

                                        {inProgress.map(fault => (
                                            <FaultCard
                                                key={fault.id}
                                                fault={fault}
                                                isReviewing
                                                onResolve={() => handleResolve(fault)}
                                                onDiscard={() => updateStatus(fault.id, 'Pendiente')}
                                            />
                                        ))}
                                    </div>
                                )}

                            </div>
                        )}
                    </>
                ) : (
                    <div className="max-w-4xl mx-auto">
                        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                            <h2 className="text-xl font-bold">Historial de Servicios y Reparaciones</h2>

                            <div className="w-full md:w-64">
                                <Select value={historyFilter} onValueChange={setHistoryFilter}>
                                    <SelectTrigger className="bg-white border-zinc-200 rounded-xl h-11">
                                        <div className="flex items-center gap-2">
                                            <Search size={14} className="text-zinc-400" />
                                            <SelectValue placeholder="Filtrar por vehículo" />
                                        </div>
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todos los vehículos</SelectItem>
                                        {vehicles.map((v) => (
                                            <SelectItem key={v.id} value={v.placa}>
                                                {v.modelo} <span className="text-zinc-400 text-xs ml-2">({v.placa})</span>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {loadingHistory ? (
                            <div className="text-center py-10 text-zinc-400">Cargando historial...</div>
                        ) : (
                            <div className="space-y-4">
                                {historyLogs
                                    .filter(log => historyFilter === "all" || log.placa === historyFilter)
                                    .map((log: any) => (
                                        <div key={log.id} className="bg-white p-4 rounded-xl border border-zinc-200 flex items-center justify-between shadow-sm">
                                            <div className="flex items-center gap-4">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${log.type === 'REPAIR' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'
                                                    }`}>
                                                    {log.type === 'REPAIR' ? <CheckCircle size={18} /> : <Wrench size={18} />}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-zinc-900">{log.vehicle}</span>
                                                        <span className="text-xs text-zinc-500 font-mono bg-zinc-100 px-1.5 py-0.5 rounded">{log.placa}</span>
                                                    </div>
                                                    <div className="text-sm text-zinc-600">
                                                        <span className="font-medium">
                                                            {log.type === 'MAINTENANCE'
                                                                ? (log.category === 'OIL_CHANGE' ? 'Cambio de Aceite' :
                                                                    log.category === 'TIMING_BELT' ? 'Correa de Tiempo' :
                                                                        log.category === 'CHAIN_KIT' ? 'Kit de Arrastre' :
                                                                            log.category === 'WASH' ? 'Lavado' : log.category)
                                                                : `Reparación: ${log.category}`
                                                            }
                                                        </span>
                                                        <span className="mx-2 text-zinc-300">|</span>
                                                        {log.description}
                                                        {log.mileage && <span className="text-zinc-400 ml-2">({log.mileage.toLocaleString()} km)</span>}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right text-xs text-zinc-400">
                                                <div>{new Date(log.date).toLocaleDateString()}</div>
                                                <div>{new Date(log.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                            </div>
                                        </div>
                                    ))}
                                {historyLogs.length === 0 && (
                                    <div className="text-center py-10 text-zinc-400 bg-white rounded-xl border border-dashed">
                                        No hay historial registrado
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Maintenance Dialog */}
            <MaintenanceRegistrationDialog
                isOpen={maintenanceOpen}
                onClose={() => setMaintenanceOpen(false)}
                initialVehicleId={selectedVehicleId}
                initialServiceType={selectedServiceType}
                lockServiceType={!!selectedServiceType}
                lockVehicle={!!selectedVehicleId}
                onSuccess={handleMaintenanceSuccess}
            />
        </main>
    )
}

function FaultCard({ fault, onMoveToReview, onResolve, onDiscard, isReviewing }: {
    fault: Fault,
    onMoveToReview?: () => void,
    onResolve: () => void,
    onDiscard?: () => void,
    isReviewing?: boolean
}) {
    const priorityColor = {
        'Crítica': 'text-red-500 bg-red-50 border-red-100',
        'Alta': 'text-orange-500 bg-orange-50 border-orange-100',
        'Media': 'text-yellow-600 bg-yellow-50 border-yellow-100',
        'Baja': 'text-blue-500 bg-blue-50 border-blue-100'
    }[fault.prioridad] || 'text-zinc-500 bg-zinc-50 border-zinc-100'

    const getFaultIcon = (type: string) => {
        switch (type) {
            case 'Mecánica': return Wrench
            case 'Eléctrica': return Zap
            case 'Cauchos': return CheckCircle
            case 'Mantenimiento': return Clock
            default: return AlertTriangle
        }
    }

    const Icon = getFaultIcon(fault.tipo_falla)

    return (
        <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm hover:shadow-md transition-all group">
            <div className="flex gap-4">
                <div className="relative w-20 h-20 bg-zinc-100 rounded-xl overflow-hidden shrink-0">
                    {fault.foto_url ? (
                        <Image src={fault.foto_url} alt={fault.modelo} fill className="object-cover" />
                    ) : (
                        <div className="flex items-center justify-center h-full text-zinc-300">
                            <Icon size={28} className="text-zinc-300" />
                        </div>
                    )}
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1 h-8">
                        <h3 className="font-bold text-zinc-900 truncate text-lg">{fault.modelo}</h3>
                        <div className={`p-2 rounded-full border ${priorityColor}`}>
                            <Icon size={18} />
                        </div>
                    </div>

                    <div className="flex items-center gap-2 mb-2">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${priorityColor} bg-opacity-50`}>
                            {fault.prioridad}
                        </span>
                        <span className="text-xs text-zinc-500 font-medium">
                            {fault.tipo_falla}
                        </span>
                    </div>

                    <p className="text-sm text-zinc-600 line-clamp-2 leading-relaxed">
                        {fault.descripcion}
                    </p>
                </div>
            </div>

            <div className="flex justify-between items-center mt-5 pt-4 border-t border-zinc-50">
                <span className="text-xs text-zinc-400 font-medium flex items-center gap-1">
                    <Clock size={12} />
                    {new Date(fault.created_at).toLocaleDateString()}
                </span>

                <div className="flex gap-2">
                    {!isReviewing && onMoveToReview && (
                        <Button onClick={onMoveToReview} size="sm" variant="outline" className="h-8 rounded-lg text-xs">
                            Revisar
                            <ArrowRight size={14} className="ml-2" />
                        </Button>
                    )}

                    {isReviewing && onDiscard && (
                        <Button onClick={onDiscard} size="sm" variant="ghost" className="h-8 rounded-lg text-xs text-zinc-400 hover:text-zinc-600">
                            Devolver
                        </Button>
                    )}

                    <Button onClick={onResolve} size="sm" className={`h-8 rounded-lg bg-black text-white text-xs hover:bg-zinc-800 ${!isReviewing ? 'hidden' : ''}`}>
                        <CheckCircle size={14} className="mr-2" />
                        {isReviewing && fault.tipo_falla === 'Mantenimiento' ? 'Registrar' : 'Reparado'}
                    </Button>
                </div>
            </div>
        </div>
    )
}
