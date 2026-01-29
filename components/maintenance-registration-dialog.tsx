"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { createClient } from "@/lib/supabase/client"
import { Droplets, Gauge, Bike, Command, Loader2, Car, Timer, AlertTriangle } from "lucide-react"
import { registerMaintenance, reportFault, resolveFault } from "@/app/taller/actions"
import { toast } from "sonner"

type Vehicle = {
    id: string
    placa: string
    modelo: string
    tipo: string
    kilometraje?: number
}

interface MaintenanceRegistrationDialogProps {
    isOpen: boolean
    onClose: () => void
    initialVehicleId?: string
    initialServiceType?: string // [NEW] Pre-select service
    lockServiceType?: boolean   // [NEW] Prevent changing service
    lockVehicle?: boolean // [NEW]
    onSuccess?: () => void
    closingFaultId?: string // [NEW] If set, this log resolves a fault
}

export function MaintenanceRegistrationDialog({
    isOpen,
    onClose,
    initialVehicleId,
    initialServiceType,
    lockServiceType = false,
    lockVehicle = false, // [NEW]
    onSuccess,
    closingFaultId
}: MaintenanceRegistrationDialogProps) {
    const [vehicles, setVehicles] = useState<Vehicle[]>([])
    const [loadingVehicles, setLoadingVehicles] = useState(false)
    const [searchTerm, setSearchTerm] = useState("")

    // Tab State
    const [activeTab, setActiveTab] = useState<'maintenance' | 'fault' | 'corrective'>('maintenance')

    // Form State
    const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null)
    const [serviceType, setServiceType] = useState<string>("")
    const [mileage, setMileage] = useState<string>("")
    const [notes, setNotes] = useState("")
    const [faultPriority, setFaultPriority] = useState("Media") // For Fault Report
    const [faultType, setFaultType] = useState("Mecánica") // For Fault Report
    // [New] Reparación Fields
    const [partsUsed, setPartsUsed] = useState("")
    const [userName, setUserName] = useState("Mecánico") // [NEW] Store current user name
    const [originalFaultDescription, setOriginalFaultDescription] = useState("") // [NEW] Store fault desc
    // Removed Cost Fields as per user request

    const [isSubmitting, setIsSubmitting] = useState(false)
    const [successData, setSuccessData] = useState<any>(null) // To store data for WhatsApp

    useEffect(() => {
        if (isOpen) {
            loadVehicles()
            resetForm()
            // If resolving a fault (and not a specific preventive maintenance), default to Corrective
            if (closingFaultId && !initialServiceType) {
                setActiveTab('corrective')
            }
        }
    }, [isOpen, initialVehicleId, initialServiceType, lockVehicle, lockServiceType, closingFaultId])

    async function loadVehicles() {
        setLoadingVehicles(true)
        const supabase = createClient()

        // Fetch vehicles and current mileage
        const { data: vData } = await supabase.from('vehiculos').select('id, placa, modelo, tipo')
        const { data: kData } = await supabase.from('vista_ultimos_kilometrajes').select('*')

        if (vData) {
            const merged = vData.map(v => ({
                ...v,
                kilometraje: kData?.find(k => k.vehiculo_id === v.id)?.ultimo_kilometraje || 0
            }))
            setVehicles(merged)

            // Handle Pre-selection
            if (initialVehicleId) {
                const preselected = merged.find(v => v.id === initialVehicleId)
                if (preselected) {
                    setSelectedVehicle(preselected)
                    setMileage(preselected.kilometraje?.toString() || "")
                }
            }
        }

        // [NEW] Fetch Current User
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('first_name, last_name') // [FIX] Correct columns
                .eq('id', user.id)
                .single()

            if (profile) {
                const fullName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
                if (fullName) setUserName(fullName)
            }
        }

        // [NEW] Fetch Fault Description if closingFaultId
        if (closingFaultId) {
            const { data: faultData } = await supabase
                .from('fallas')
                .select('descripcion')
                .eq('id', closingFaultId)
                .single()

            if (faultData?.descripcion) {
                setOriginalFaultDescription(faultData.descripcion)
            }
        }

        setLoadingVehicles(false)
    }

    function resetForm() {
        if (!initialVehicleId && !lockVehicle) setSelectedVehicle(null)

        // Handle Service Type Pre-selection
        if (initialServiceType) {
            setServiceType(initialServiceType)
        } else {
            setServiceType("")
        }

        setNotes("")
        setFaultPriority("Media")
        setFaultType("Mecánica")
        setSearchTerm("")
        setPartsUsed("")
        setActiveTab('maintenance')
        setSuccessData(null)
    }

    const filteredVehicles = vehicles.filter(v =>
        v.placa.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.modelo.toLowerCase().includes(searchTerm.toLowerCase())
    )

    async function handleSubmit() {
        if (!selectedVehicle) return

        if (activeTab === 'maintenance' && (!serviceType || !mileage)) {
            toast.error("Complete todos los campos requeridos")
            return
        }

        if (activeTab === 'fault' && !notes) {
            toast.error("Describa la falla")
            return
        }

        if (activeTab === 'corrective' && !notes) {
            toast.error("Describa el trabajo realizado")
            return
        }

        const currentKm = selectedVehicle.kilometraje || 0
        const newKm = parseFloat(mileage)

        if (serviceType !== 'WASH' && activeTab !== 'fault' && activeTab !== 'corrective' && newKm < currentKm) {
            toast.error(`El kilometraje no puede ser menor al actual (${currentKm} km)`)
            return
        }

        setIsSubmitting(true)

        let result
        if (activeTab === 'fault') {
            result = await reportFault({
                vehicle_id: selectedVehicle!.id,
                description: notes || "Sin descripción",
                priority: faultPriority,
                fault_type: faultType
            })
        } else if (activeTab === 'corrective') {
            result = await registerMaintenance({
                vehicle_id: selectedVehicle!.id,
                service_type: 'CORRECTIVE',
                mileage: parseFloat(mileage) || currentKm,
                notes: `[Falla: ${originalFaultDescription}] ${notes}`, // Prepend fault desc to notes for DB history
                performed_by: userName,
                parts_used: partsUsed,
                labor_cost: 0,
                parts_cost: 0
            })
        } else {
            result = await registerMaintenance({
                vehicle_id: selectedVehicle!.id,
                service_type: serviceType,
                mileage: parseFloat(mileage),
                notes,
                performed_by: userName
            })
        }

        setIsSubmitting(false)

        if (result.success) {
            toast.success(activeTab === 'fault' ? "Falla reportada correctamente" : "Mantenimiento registrado correctamente")

            // Prepare data for WhatsApp
            setSuccessData({
                type: activeTab,
                vehicle: selectedVehicle,
                details: {
                    serviceType,
                    mileage,
                    notes,
                    faultType,
                    faultPriority,
                    partsUsed,
                    originalFaultDescription // Pass to success view
                }
            })

            // Trigger parent refresh immediately
            if (onSuccess) onSuccess()

            // Don't close immediately. Wait for user to click "Cerrar" in success view or "Enviar WhatsApp"
            // if (onSuccess) onSuccess() <--- Delayed
        } else {
            toast.error("Error al registrar: " + result.error)
        }
    }

    const generateWhatsAppLink = () => {
        if (!successData || !successData.vehicle) return ""

        const { type, vehicle, details } = successData
        const date = new Date().toLocaleDateString('es-VE')
        const time = new Date().toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })

        let header = "Reporte de Reparación Vehicular"
        let typeLabel = "Mantenimiento"

        if (type === 'fault') {
            typeLabel = "Falla"
            header = "Reporte de Falla Vehicular"
        } else if (type === 'corrective') {
            typeLabel = "Reparación"
        }

        let message = `${header}\n\n` +
            `Fecha: ${date}\n` +
            `Hora: ${time}\n` +
            `Vehículo: ${vehicle.modelo}\n` +
            `Placa: ${vehicle.placa}\n` +
            `Tipo: ${typeLabel}\n\n`

        if (type === 'fault') {
            message += `Falla: ${details.notes || "Sin descripción"}\n` +
                `Prioridad: ${details.faultPriority}\n` +
                `Tipo Falla: ${details.faultType}`
        } else if (type === 'corrective') {
            message += `Kilometraje: ${parseFloat(details.mileage).toLocaleString()} km\n` +
                `Falla: ${details.originalFaultDescription || "No especificada"}\n` + // [NEW] Added Falla field
                `Trabajo Realizado: ${details.notes || "Sin detalles"}\n` +
                `Repuestos Utilizados: ${details.partsUsed || "N/A"}\n` +
                `Realizado por: ${details.performedBy || "Mecánico"}`
        } else {
            const serviceLabel = {
                'OIL_CHANGE': 'Cambio de Aceite',
                'TIMING_BELT': 'Correa de Tiempo',
                'CHAIN_KIT': 'Kit de Arrastre',
                'WASH': 'Lavado'
            }[details.serviceType as string] || details.serviceType

            message += `Servicio: ${serviceLabel}\n` +
                `Kilometraje: ${parseFloat(details.mileage).toLocaleString()} km\n` +
                `Notas: ${details.notes || "-"}\n` +
                `Realizado por: ${details.performedBy || "Mecánico"}`
        }

        return `https://wa.me/?text=${encodeURIComponent(message)}`
    }




    // Render Success View
    if (successData) {
        return (
            <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
                <DialogContent className="max-w-md bg-white p-6 rounded-3xl text-center">
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-2">
                            <Droplets size={32} />
                        </div>
                        <DialogTitle className="text-xl font-bold text-zinc-900">
                            {successData.type === 'fault' ? 'Falla Reportada' : 'Registro Exitoso'}
                        </DialogTitle>
                        <DialogDescription className="text-center">
                            El registro se ha guardado correctamente en el sistema.
                        </DialogDescription>

                        <div className="w-full space-y-3 mt-4">
                            <a
                                href={generateWhatsAppLink()}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#128C7E] text-white font-bold py-3 px-4 rounded-xl transition-colors"
                            >
                                <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                                    <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-2.846-.848-.919-.386-1.526-1.286-1.571-1.353-.045-.067-1.144-1.522-1.144-2.903S9.882 7.732 10.428 7.732c.189 0 .313.003.447.006.14.003.324-.047.502.383.184.444.629 1.543.684 1.655.055.112.091.24.032.348-.06.107-.152.285-.259.417l-.234.25c-.105.122-.36.257.254 1.392 1.314 2.43 2.502 3.425 2.138 2.656.76.626 1.439.673 1.83 2 .385 0 .762.336 1.049.336 1.77.078.29.133.407.039.73-.095.321-.555.444-.812.541zM2.81 12.012c0 2.28 1.082 4.048 1.85 5.57L4 21l3.541-.884c1.19.467 2.76.85 4.5.85 5.523 0 10-4.477 10-10S17.523 1 12 1 2 5.477 2 12.012z" />
                                </svg>
                                Enviar Reporte por WhatsApp
                            </a>
                            <Button
                                variant="outline"
                                className="w-full h-12 rounded-xl"
                                onClick={() => {
                                    // if (onSuccess) onSuccess() // Handled immediately
                                    onClose()
                                }}
                            >
                                Cerrar
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        )
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-md bg-zinc-50 p-0 gap-0 overflow-hidden border-none rounded-3xl">
                <div className="p-6 pb-4 bg-white border-b border-zinc-100">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold text-zinc-900">Registrar Mantenimiento</DialogTitle>
                        <DialogDescription>Seleccione el vehículo y el tipo de servicio realizado.</DialogDescription>
                    </DialogHeader>
                </div>

                <div className="p-6 space-y-6 overflow-y-auto max-h-[70vh]">
                    {/* 1. Vehicle Selection */}
                    <div className="space-y-3">
                        <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Vehículo</Label>
                        {!selectedVehicle ? (
                            <div className="relative">
                                <SearchInput
                                    value={searchTerm}
                                    onChange={setSearchTerm}
                                    placeholder="Buscar placa o modelo..."
                                />
                                <div className="mt-2 max-h-40 overflow-y-auto border border-zinc-200 rounded-xl bg-white divide-y divide-zinc-50 shadow-sm">
                                    {loadingVehicles ? (
                                        <div className="p-4 text-center text-zinc-400 text-sm">Cargando...</div>
                                    ) : filteredVehicles.length === 0 ? (
                                        <div className="p-4 text-center text-zinc-400 text-sm">No se encontraron vehículos</div>
                                    ) : (
                                        filteredVehicles.map(v => (
                                            <div
                                                key={v.id}
                                                onClick={() => {
                                                    setSelectedVehicle(v)
                                                    setMileage(v.kilometraje?.toString() || "")
                                                }}
                                                className="p-3 hover:bg-zinc-50 cursor-pointer flex justify-between items-center transition-colors"
                                            >
                                                <div>
                                                    <div className="font-bold text-sm text-zinc-900">{v.modelo}</div>
                                                    <div className="text-xs text-zinc-500 font-mono">{v.placa}</div>
                                                </div>
                                                <div className="text-xs font-bold text-zinc-400 bg-zinc-100 px-2 py-1 rounded-md">
                                                    {(v.kilometraje || 0).toLocaleString()} km
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center justify-between p-3 bg-white border border-zinc-200 rounded-xl shadow-sm">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-zinc-100 rounded-full flex items-center justify-center">
                                        <Car size={18} className="text-zinc-500" />
                                    </div>
                                    <div>
                                        <div className="font-bold text-sm text-zinc-900">{selectedVehicle.modelo}</div>
                                        <div className="text-xs text-zinc-500 font-mono">{selectedVehicle.placa}</div>
                                    </div>
                                </div>
                                {!lockVehicle && activeTab !== 'fault' && (
                                    <Button variant="ghost" size="sm" onClick={() => setSelectedVehicle(null)}>Cambiar</Button>
                                )}
                            </div>
                        )}
                    </div>

                    {/* 2. Service Type */}
                    {/* 2. Toggle Mode (Only if vehicle selected) */}
                    {selectedVehicle && (
                        <div className="bg-zinc-100 p-1 rounded-xl flex gap-1">
                            <button
                                onClick={() => setActiveTab('maintenance')}
                                className={`flex-1 py-2 text-xs font-medium rounded-lg transition-all ${activeTab === 'maintenance' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}
                            >
                                Mantenimiento
                            </button>
                            <button
                                onClick={() => setActiveTab('corrective')}
                                className={`flex-1 py-2 text-xs font-medium rounded-lg transition-all ${activeTab === 'corrective' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}
                            >
                                Reparación
                            </button>
                            <button
                                onClick={() => setActiveTab('fault')}
                                className={`flex-1 py-2 text-xs font-medium rounded-lg transition-all ${activeTab === 'fault' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}
                            >
                                Falla
                            </button>
                        </div>
                    )}

                    {/* [NEW] Reparación Fields */}
                    {selectedVehicle && activeTab === 'corrective' && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Falla a Reparar</Label>
                                <Input
                                    value={originalFaultDescription}
                                    onChange={e => setOriginalFaultDescription(e.target.value)}
                                    placeholder="Describa la falla que está reparando..."
                                    className="bg-zinc-50"
                                    disabled={!!closingFaultId} // Disable if loaded from existing fault
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Repuestos Utilizados</Label>
                                <Input
                                    value={partsUsed}
                                    onChange={e => setPartsUsed(e.target.value)}
                                    placeholder="Ej. Pastillas de freno, Bombillo H4..."
                                    className="bg-zinc-50"
                                />
                            </div>
                        </div>
                    )}

                    {/* 3. Content based on Tab */}
                    {selectedVehicle && activeTab === 'maintenance' && (
                        <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Tipo de Servicio</Label>
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    { id: 'OIL_CHANGE', label: 'Cambio de Aceite', icon: Droplets },
                                    { id: 'TIMING_BELT', label: 'Correa de Tiempo', icon: Timer },
                                    { id: 'CHAIN_KIT', label: 'Kit de Arrastre', icon: Bike },
                                    { id: 'WASH', label: 'Lavado', icon: Droplets },
                                ].map((service) => {
                                    // Filter logic (Motorcycles etc)
                                    if (selectedVehicle) {
                                        const model = selectedVehicle.modelo.toUpperCase()
                                        const isMoto = model.includes('MOTO') || selectedVehicle.tipo?.toLowerCase() === 'moto'
                                        const hasChainOrGear = ['HILUX', 'TRITON', 'DONFENG', 'RICH', 'NKR'].some(k => model.includes(k))

                                        if (service.id === 'TIMING_BELT' && (isMoto || hasChainOrGear)) return null
                                        if (service.id === 'CHAIN_KIT' && !isMoto) return null
                                    }

                                    const isSelected = serviceType === service.id
                                    const isDisabled = lockServiceType && initialServiceType !== service.id

                                    if (isDisabled && !isSelected) return null

                                    return (
                                        <button
                                            key={service.id}
                                            onClick={() => !lockServiceType && setServiceType(service.id)}
                                            disabled={lockServiceType}
                                            className={`p-4 rounded-xl border-2 flex flex-col items-center gap-3 transition-all
                                                ${isSelected
                                                    ? 'border-zinc-900 bg-zinc-50 text-zinc-900'
                                                    : 'border-zinc-100 bg-white text-zinc-500 hover:border-zinc-200 hover:bg-zinc-50'
                                                }
                                                ${lockServiceType ? 'cursor-default opacity-70' : ''}
                                            `}
                                        >
                                            <service.icon size={24} className={isSelected ? 'text-zinc-900' : 'text-zinc-400'} />
                                            <span className="font-medium text-sm">{service.label}</span>
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                    )}

                    {selectedVehicle && activeTab === 'fault' && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Tipo de Falla</Label>
                                    <Select value={faultType} onValueChange={setFaultType}>
                                        <SelectTrigger className="h-11 rounded-xl bg-zinc-50 border-zinc-200">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Mecánica">Mecánica</SelectItem>
                                            <SelectItem value="Eléctrica">Eléctrica</SelectItem>
                                            <SelectItem value="Cauchos">Cauchos</SelectItem>
                                            <SelectItem value="Carrocería">Carrocería</SelectItem>
                                            <SelectItem value="Otro">Otro</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Prioridad</Label>
                                    <Select value={faultPriority} onValueChange={setFaultPriority}>
                                        <SelectTrigger className="h-11 rounded-xl bg-zinc-50 border-zinc-200">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Baja">Baja</SelectItem>
                                            <SelectItem value="Media">Media</SelectItem>
                                            <SelectItem value="Alta">Alta</SelectItem>
                                            <SelectItem value="Crítica">Crítica</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>
                    )}


                    {/* 4. Common Details */}
                    {selectedVehicle && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            {(activeTab === 'maintenance' || activeTab === 'corrective') && (
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Kilometraje Actual</Label>
                                    <div className="relative">
                                        <Input
                                            type="number"
                                            value={mileage}
                                            onChange={(e) => setMileage(e.target.value)}
                                            className="pl-10 font-mono font-bold"
                                        />
                                        <div className="absolute left-3 top-2.5 text-zinc-400">
                                            <Gauge size={16} />
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-zinc-400">
                                        Registrado: {(selectedVehicle.kilometraje || 0).toLocaleString()} km
                                    </p>
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                                    {activeTab === 'fault' ? 'Descripción del Problema' : 'Notas (Opcional)'}
                                </Label>
                                <Textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder={activeTab === 'fault' ? "Describa detalladamente la falla..." : activeTab === 'corrective' ? "Detalles del trabajo realizado..." : "Detalles adicionales del servicio..."}
                                    className="resize-none h-24"
                                />
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-4 bg-white border-t border-zinc-100 flex justify-end gap-2">
                    <Button variant="outline" onClick={onClose} disabled={isSubmitting}>Cancelar</Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={isSubmitting || !selectedVehicle || (activeTab === 'maintenance' && (!serviceType || !mileage)) || (activeTab === 'fault' && !notes)}
                        className="bg-black text-white hover:bg-zinc-800"
                    >
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {activeTab === 'fault' ? 'Reportar Falla' : activeTab === 'corrective' ? 'Registrar Reparación' : 'Registrar Servicio'}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}

function SearchInput({ value, onChange, placeholder }: any) {
    return (
        <div className="relative">
            <Command className="absolute left-3 top-3 text-zinc-400" size={16} />
            <Input
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="pl-9 h-10 bg-white"
            />
        </div>
    )
}
