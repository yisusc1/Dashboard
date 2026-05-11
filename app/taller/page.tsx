"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useSearchParams, useRouter } from "next/navigation"
import { Search, Wrench, CheckCircle, Clock, AlertTriangle, Home as HomeIcon, Zap, ClipboardList, Hammer, Clock3 } from "lucide-react"
import { LogoutButton } from "@/components/ui/logout-button"
import Image from "next/image"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { MaintenanceRegistrationDialog } from "@/components/maintenance-registration-dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { VehicleHistoryDialog } from "@/components/vehicle-history-dialog"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"

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
    isMaintenance?: boolean
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
    const [historyVehicleId, setHistoryVehicleId] = useState<string | undefined>(undefined)
    const [historyVehiclePlate, setHistoryVehiclePlate] = useState<string | undefined>(undefined)
    const [historyOpen, setHistoryOpen] = useState(false)
    const [historyLogs, setHistoryLogs] = useState<any[]>([])
    const [loadingHistory, setLoadingHistory] = useState(false)
    const [vehicles, setVehicles] = useState<any[]>([])
    const [historyFilter, setHistoryFilter] = useState("all")
    
    // Tab State
    const [activeTab, setActiveTab] = useState("pending")

    useEffect(() => {
        loadFaults()
    }, [])

    useEffect(() => {
        const action = searchParams.get("action")
        if (action === "new") setMaintenanceOpen(true)
    }, [searchParams])

    useEffect(() => {
        if (activeTab === 'history') loadHistory()
    }, [activeTab])

    async function loadFaults() {
        try {
            setLoading(true)
            const supabase = createClient()

            // 1. Fetch Existing Faults
            const { data: faultsData, error } = await supabase
                .from('fallas')
                .select(`id, vehiculo_id, descripcion, tipo_falla, prioridad, created_at, estado, fecha_solucion, vehiculos (placa, modelo, foto_url)`)
                .neq('estado', 'Reparado')
                .neq('estado', 'Descartado')
                .order('created_at', { ascending: false })

            if (error) throw error

            // 2. Fetch Vehicles & Mileage
            const { data: vehiclesData } = await supabase.from('vehiculos').select('*').order('modelo', { ascending: true })
            setVehicles(vehiclesData || [])
            const vehiclesList = vehiclesData || []
            const { data: mileageData } = await supabase.from('vista_ultimos_kilometrajes').select('*')

            // 3. Generate Maintenance Alerts
            const maintenanceAlerts: Fault[] = []
            vehiclesList.forEach(v => {
                const km = mileageData?.find(m => m.vehiculo_id === v.id)?.ultimo_kilometraje || 0
                const model = v.modelo.toUpperCase()
                const isMoto = model.includes('MOTO') || v.tipo?.toLowerCase() === 'moto'
                const hasChainOrGear = ['HILUX', 'TRITON', 'DONFENG', 'RICH', 'NKR'].some(k => model.includes(k))

                const activeFaults = faultsData?.filter(f => f.vehiculo_id === v.id && f.tipo_falla === 'Mantenimiento' && (f.estado === 'Pendiente' || f.estado === 'En Revisión')) || []

                const OIL_LIMIT = isMoto ? 2000 : 5000
                const OIL_WARN = isMoto ? 1800 : 4500
                const distOil = km - (v.last_oil_change_km || 0)
                
                if (distOil >= OIL_WARN && !activeFaults.some(f => f.descripcion.includes('Aceite'))) {
                    maintenanceAlerts.push(createAlertObj(v, `Cambio de Aceite (Uso: ${distOil.toLocaleString()} km)`, distOil >= OIL_LIMIT ? 'Crítica' : 'Alta', 'maint-oil-'))
                }

                if (!isMoto && !hasChainOrGear) {
                    const BELT_LIMIT = 50000, BELT_WARN = 49000
                    const distBelt = km - (v.last_timing_belt_km || 0)
                    if (distBelt >= BELT_WARN && !activeFaults.some(f => f.descripcion.includes('Correa'))) {
                        maintenanceAlerts.push(createAlertObj(v, `Correa de Tiempo (Uso: ${distBelt.toLocaleString()} km)`, distBelt >= BELT_LIMIT ? 'Crítica' : 'Alta', 'maint-belt-'))
                    }
                }

                if (isMoto) {
                    const CHAIN_LIMIT = 20000, CHAIN_WARN = 19000
                    const distChain = km - (v.last_chain_kit_km || 0)
                    if (distChain >= CHAIN_WARN && !activeFaults.some(f => f.descripcion.includes('Kit de Arrastre'))) {
                        maintenanceAlerts.push(createAlertObj(v, `Kit de Arrastre (Uso: ${distChain.toLocaleString()} km)`, distChain >= CHAIN_LIMIT ? 'Crítica' : 'Alta', 'maint-chain-'))
                    }
                }
            })

            // 4. Merge
            const mappedFaults: Fault[] = faultsData?.map((f: any) => ({
                ...f,
                placa: f.vehiculos?.placa || 'Desconocido',
                modelo: f.vehiculos?.modelo || 'Desconocido',
                foto_url: f.vehiculos?.foto_url
            })) || []

            setFaults([...maintenanceAlerts, ...mappedFaults])
        } catch (error) {
            console.error('Error loading faults:', error)
            toast.error('Error al cargar taller')
        } finally {
            setLoading(false)
        }
    }

    function createAlertObj(v: any, desc: string, prio: string, prefix: string): Fault {
        return {
            id: `${prefix}${v.id}`,
            vehiculo_id: v.id,
            descripcion: `Prevención: ${desc}`,
            tipo_falla: 'Mantenimiento',
            prioridad: prio,
            created_at: new Date().toISOString(),
            estado: 'Pendiente',
            placa: v.placa,
            modelo: v.modelo,
            foto_url: v.foto_url,
            isMaintenance: true
        }
    }

    async function loadHistory() {
        setLoadingHistory(true)
        const supabase = createClient()
        try {
            const { data: faultsData } = await supabase.from('fallas').select(`id, descripcion, tipo_falla, fecha_solucion, created_at, vehiculos(placa, modelo)`).eq('estado', 'Reparado').order('fecha_solucion', { ascending: false }).limit(50)
            const { data: maintenanceData } = await supabase.from('maintenance_logs').select(`id, service_type, mileage, notes, service_date, created_at, cost, parts_used, labor_cost, parts_cost, vehiculos(placa, modelo)`).order('created_at', { ascending: false }).limit(50)

            const combined = [
                ...(faultsData?.map((f: any) => ({
                    type: 'REPAIR', date: f.fecha_solucion || f.created_at, vehicle: f.vehiculos?.modelo || 'Desconocido', placa: f.vehiculos?.placa || '', description: f.descripcion, category: f.tipo_falla, id: f.id, mileage: null, parts: null, cost: null
                })) || []),
                ...(maintenanceData?.map((m: any) => ({
                    type: 'MAINTENANCE', date: m.service_date || m.created_at, vehicle: m.vehiculos?.modelo || 'Desconocido', placa: m.vehiculos?.placa || '', description: m.notes || 'Mantenimiento', category: m.service_type, mileage: m.mileage, id: m.id, parts: m.parts_used, cost: m.cost, labor: m.labor_cost, partsCost: m.parts_cost
                })) || [])
            ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

            setHistoryLogs(combined)
        } catch (error) {
            console.error('Error history:', error)
        } finally {
            setLoadingHistory(false)
        }
    }

    async function handleReview(fault: Fault) {
        if (fault.isMaintenance) {
            try {
                const supabase = createClient()
                const { error } = await supabase.from('fallas').insert({ vehiculo_id: fault.vehiculo_id, descripcion: fault.descripcion, tipo_falla: 'Mantenimiento', prioridad: fault.prioridad, estado: 'En Revisión', created_at: new Date().toISOString() })
                if (error) throw error
                toast.success("Mantenimiento iniciado")
                loadFaults()
            } catch (error) {
                toast.error('Error al iniciar')
            }
        } else {
            updateStatus(fault.id, 'En Revisión')
        }
    }

    function handleResolve(fault: Fault) {
        setSelectedVehicleId(fault.vehiculo_id)
        setPendingResolveId(fault.id)

        if (fault.tipo_falla === 'Mantenimiento') {
            const desc = (fault.descripcion || "").toLowerCase()
            let serviceCode = undefined
            if (desc.includes('aceite')) serviceCode = 'OIL_CHANGE'
            else if (desc.includes('correa')) serviceCode = 'TIMING_BELT'
            else if (desc.includes('arrastre') || desc.includes('cadena') || desc.includes('kit')) serviceCode = 'CHAIN_KIT'
            else if (desc.includes('lavado')) serviceCode = 'WASH'
            setSelectedServiceType(serviceCode)
        } else {
            setSelectedServiceType(undefined)
        }
        setMaintenanceOpen(true)
    }

    function handleMaintenanceSuccess() {
        if (pendingResolveId) updateStatus(pendingResolveId, 'Reparado')
        else loadFaults()
    }

    async function updateStatus(id: string, newStatus: string) {
        try {
            const supabase = createClient()
            const { error } = await supabase.from('fallas').update({ estado: newStatus, fecha_solucion: newStatus === 'Reparado' ? new Date() : null }).eq('id', id)
            if (error) throw error
            toast.success(`Estado: ${newStatus}`)
            loadFaults()
        } catch (error) {
            toast.error('Error al actualizar')
        }
    }

    const filteredFaults = faults.filter(f => f.placa.toLowerCase().includes(searchTerm.toLowerCase()) || f.modelo.toLowerCase().includes(searchTerm.toLowerCase()) || f.tipo_falla.toLowerCase().includes(searchTerm.toLowerCase()))
    const pending = filteredFaults.filter(f => f.estado === 'Pendiente')
    const inProgress = filteredFaults.filter(f => f.estado === 'En Revisión')

    return (
        <main className="min-h-screen bg-zinc-50 pb-28 md:pb-12 font-sans text-zinc-900">
            {/* Header Mobile-First */}
            <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-zinc-200 px-4 py-4">
                <div className="max-w-4xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="bg-indigo-50 text-indigo-600 p-2 rounded-xl">
                            <Hammer size={24} />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-zinc-900 leading-none">Taller</h1>
                            <p className="text-xs text-zinc-500 font-medium mt-1">Gestión Activa</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button 
                            onClick={() => { setSelectedVehicleId(undefined); setSelectedServiceType(undefined); setPendingResolveId(null); setMaintenanceOpen(true); }}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-10 w-10 p-0 md:w-auto md:px-4"
                        >
                            <PlusIcon className="md:hidden" />
                            <span className="hidden md:inline-flex items-center gap-2"><Wrench size={16}/> Nuevo Registro</span>
                        </Button>
                        <a href="/" className="h-10 w-10 text-zinc-400 hover:text-zinc-900 bg-white rounded-xl flex items-center justify-center border border-zinc-200">
                            <HomeIcon size={18} />
                        </a>
                    </div>
                </div>
            </header>

            <div className="max-w-4xl mx-auto px-4 mt-6">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    {/* Sticky Tabs for easy access on mobile */}
                    <div className="sticky top-[73px] z-20 bg-zinc-50 pt-2 pb-4">
                        <TabsList className="grid w-full grid-cols-3 bg-white border border-zinc-200 p-1 rounded-2xl h-14 shadow-sm">
                            <TabsTrigger value="pending" className="rounded-xl text-xs sm:text-sm data-[state=active]:bg-zinc-100 data-[state=active]:text-zinc-900 data-[state=active]:font-bold transition-all">
                                <AlertTriangle size={14} className="mr-1.5 hidden sm:inline" />
                                Pendientes {pending.length > 0 && <span className="ml-1.5 bg-red-100 text-red-600 text-[10px] px-2 py-0.5 rounded-full">{pending.length}</span>}
                            </TabsTrigger>
                            <TabsTrigger value="progress" className="rounded-xl text-xs sm:text-sm data-[state=active]:bg-indigo-600 data-[state=active]:text-white font-medium transition-all">
                                <Wrench size={14} className="mr-1.5 hidden sm:inline" />
                                En Taller {inProgress.length > 0 && <span className="ml-1.5 bg-indigo-500 text-white text-[10px] px-2 py-0.5 rounded-full">{inProgress.length}</span>}
                            </TabsTrigger>
                            <TabsTrigger value="history" className="rounded-xl text-xs sm:text-sm data-[state=active]:bg-zinc-100 data-[state=active]:text-zinc-900 font-medium transition-all">
                                <ClipboardList size={14} className="mr-1.5 hidden sm:inline" />
                                Historial
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    {/* Search Bar - Only for Active Tabs */}
                    {activeTab !== 'history' && (
                        <div className="relative mb-6">
                            <Search className="absolute left-4 top-3.5 text-zinc-400" size={18} />
                            <input
                                type="text"
                                placeholder="Buscar placa o modelo..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full h-12 pl-12 pr-4 bg-white border border-zinc-200 rounded-2xl text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all shadow-sm"
                            />
                        </div>
                    )}

                    {loading ? (
                        <div className="py-20 text-center text-zinc-400 flex flex-col items-center">
                            <div className="animate-spin w-8 h-8 border-2 border-zinc-200 border-t-indigo-500 rounded-full mb-4"></div>
                            Cargando datos...
                        </div>
                    ) : (
                        <div className="pb-8">
                            <TabsContent value="pending" className="mt-0 space-y-4 outline-none">
                                {pending.length === 0 ? (
                                    <EmptyState message="No hay mantenimientos ni fallas pendientes." icon={CheckCircle} />
                                ) : (
                                    pending.map(fault => (
                                        <MobileFaultCard key={fault.id} fault={fault} actionText="Pasar a Taller" actionColor="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20" onAction={() => handleReview(fault)} />
                                    ))
                                )}
                            </TabsContent>

                            <TabsContent value="progress" className="mt-0 space-y-4 outline-none">
                                {inProgress.length === 0 ? (
                                    <EmptyState message="El taller está vacío." icon={Wrench} />
                                ) : (
                                    inProgress.map(fault => (
                                        <MobileFaultCard key={fault.id} fault={fault} isReviewing actionText="Finalizar & Reportar" actionColor="bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20" onAction={() => handleResolve(fault)} onSecondaryAction={() => updateStatus(fault.id, 'Pendiente')} secondaryActionText="Regresar a Pendiente" />
                                    ))
                                )}
                            </TabsContent>

                            <TabsContent value="history" className="mt-0 outline-none">
                                <div className="mb-4">
                                    <Select value={historyFilter} onValueChange={setHistoryFilter}>
                                        <SelectTrigger className="w-full h-12 bg-white border-zinc-200 rounded-2xl shadow-sm">
                                            <div className="flex items-center gap-2 text-zinc-500">
                                                <Search size={16} />
                                                <SelectValue placeholder="Todos los vehículos" />
                                            </div>
                                        </SelectTrigger>
                                        <SelectContent className="bg-white border-zinc-200 text-zinc-900">
                                            <SelectItem value="all">Todos los vehículos</SelectItem>
                                            {vehicles.map((v) => (
                                                <SelectItem key={v.id} value={v.placa}>{v.modelo} ({v.placa})</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                
                                <div className="space-y-3">
                                    {loadingHistory ? (
                                        <div className="py-10 text-center text-zinc-400">Cargando historial...</div>
                                    ) : historyLogs.length === 0 ? (
                                        <EmptyState message="No hay historial registrado." icon={ClipboardList} />
                                    ) : (
                                        historyLogs.filter(log => historyFilter === "all" || log.placa === historyFilter).map((log: any) => (
                                            <div key={log.id} className="bg-white p-4 rounded-2xl border border-zinc-200 flex flex-col gap-3 shadow-sm">
                                                <div className="flex justify-between items-start">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${log.type === 'REPAIR' ? 'bg-emerald-50 text-emerald-600' : 'bg-indigo-50 text-indigo-600'}`}>
                                                            {log.type === 'REPAIR' ? <CheckCircle size={18} /> : <Wrench size={18} />}
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-zinc-900">{log.vehicle}</div>
                                                            <div className="text-xs text-zinc-500">{log.placa}</div>
                                                        </div>
                                                    </div>
                                                    <div className="text-right text-xs text-zinc-400">
                                                        <div>{new Date(log.date).toLocaleDateString()}</div>
                                                        <div>{new Date(log.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                                    </div>
                                                </div>
                                                <div className="bg-zinc-50 p-3 rounded-xl border border-zinc-100">
                                                    <p className="text-sm text-zinc-600"><span className="font-bold text-zinc-900">{log.category}:</span> {log.description}</p>
                                                    {(log.parts || log.cost > 0) && (
                                                        <div className="mt-2 flex flex-wrap gap-2 text-xs">
                                                            {log.parts && <span className="bg-white text-zinc-600 border border-zinc-200 px-2 py-1 rounded-md">Repuestos: {log.parts}</span>}
                                                            {log.cost > 0 && <span className="bg-emerald-50 text-emerald-700 px-2 py-1 rounded-md font-mono font-medium">${log.cost}</span>}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </TabsContent>
                        </div>
                    )}
                </Tabs>
            </div>

            {/* Dialogs */}
            <MaintenanceRegistrationDialog
                isOpen={maintenanceOpen}
                onClose={() => setMaintenanceOpen(false)}
                initialVehicleId={selectedVehicleId}
                initialServiceType={selectedServiceType}
                lockServiceType={!!selectedServiceType}
                lockVehicle={!!selectedVehicleId}
                onSuccess={handleMaintenanceSuccess}
                closingFaultId={pendingResolveId || undefined}
            />

            <VehicleHistoryDialog
                isOpen={historyOpen}
                onClose={() => setHistoryOpen(false)}
                vehicleId={historyVehicleId}
                vehiclePlate={historyVehiclePlate}
            />
        </main>
    )
}

function MobileFaultCard({ fault, actionText, actionColor, onAction, onSecondaryAction, secondaryActionText, isReviewing }: any) {
    const isMaintenance = fault.tipo_falla === 'Mantenimiento'
    
    // Calculate Days Active
    const daysActive = Math.floor((new Date().getTime() - new Date(fault.created_at).getTime()) / (1000 * 3600 * 24))

    return (
        <div className={`bg-white border ${isMaintenance ? 'border-indigo-100 shadow-indigo-100/50' : 'border-zinc-200 shadow-zinc-200/50'} rounded-3xl p-4 flex flex-col gap-4 relative overflow-hidden shadow-sm`}>
            {/* Top Indicator Line */}
            <div className={`absolute top-0 left-0 w-full h-1 ${isMaintenance ? 'bg-indigo-500' : 'bg-red-500'}`} />
            
            <div className="flex gap-4 items-start pt-1">
                {/* Vehicle Image/Avatar */}
                <div className="relative w-16 h-16 bg-zinc-100 rounded-2xl overflow-hidden shrink-0 border border-zinc-100">
                    {fault.foto_url ? (
                        <Image src={fault.foto_url} alt={fault.modelo} fill className="object-cover" />
                    ) : (
                        <div className="flex items-center justify-center h-full text-zinc-300">
                            <Wrench size={24} />
                        </div>
                    )}
                </div>

                <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-zinc-900 text-lg leading-tight truncate">{fault.modelo}</h3>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs font-mono bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded-md">{fault.placa}</span>
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${
                            fault.prioridad === 'Crítica' ? 'bg-red-50 text-red-600' :
                            fault.prioridad === 'Alta' ? 'bg-orange-50 text-orange-600' :
                            'bg-zinc-100 text-zinc-500'
                        }`}>
                            {fault.prioridad}
                        </span>
                    </div>
                </div>
            </div>

            <div className="bg-zinc-50 p-3 rounded-2xl border border-zinc-100">
                <div className="flex items-center gap-2 text-xs text-zinc-500 font-bold mb-1 uppercase tracking-wider">
                    {isMaintenance ? <Clock size={12} className="text-indigo-500"/> : <AlertTriangle size={12} className="text-red-500"/>}
                    {fault.tipo_falla}
                </div>
                <p className="text-sm text-zinc-700 font-medium">{fault.descripcion}</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 mt-1">
                <Button onClick={onAction} className={`flex-1 h-12 rounded-xl font-bold transition-all ${actionColor}`}>
                    {actionText}
                </Button>
                {onSecondaryAction && (
                    <Button onClick={onSecondaryAction} variant="outline" className="h-12 rounded-xl bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 font-bold shadow-sm">
                        {secondaryActionText}
                    </Button>
                )}
            </div>
            
            <div className="flex justify-between items-center px-1 text-[10px] text-zinc-400 font-bold uppercase tracking-wider">
                <span>Registrado: {new Date(fault.created_at).toLocaleDateString()}</span>
                {daysActive > 0 ? (
                    <span className="text-orange-500 flex items-center gap-1"><Clock3 size={10}/> {daysActive} días activo</span>
                ) : (
                    <span>Hoy</span>
                )}
            </div>
        </div>
    )
}

function EmptyState({ message, icon: Icon }: any) {
    return (
        <div className="py-16 flex flex-col items-center justify-center text-center px-4 bg-zinc-50 rounded-3xl border border-zinc-200 border-dashed">
            <div className="w-16 h-16 bg-white shadow-sm rounded-full flex items-center justify-center text-zinc-400 mb-4 border border-zinc-100">
                <Icon size={32} />
            </div>
            <p className="text-zinc-500 font-medium">{message}</p>
        </div>
    )
}

function PlusIcon({ className }: { className?: string }) {
    return <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M5 12h14"/><path d="M12 5v14"/></svg>
}
