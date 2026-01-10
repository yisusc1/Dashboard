"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { createClient } from "@/lib/supabase/client"
import { Droplets, Gauge, Bike, Command, Loader2, Car, Timer } from "lucide-react"
import { registerMaintenance } from "@/app/taller/actions"
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
}

export function MaintenanceRegistrationDialog({
    isOpen,
    onClose,
    initialVehicleId,
    initialServiceType,
    lockServiceType = false,
    lockVehicle = false, // [NEW]
    onSuccess
}: MaintenanceRegistrationDialogProps) {
    const [vehicles, setVehicles] = useState<Vehicle[]>([])
    const [loadingVehicles, setLoadingVehicles] = useState(false)
    const [searchTerm, setSearchTerm] = useState("")

    // Form State
    const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null)
    const [serviceType, setServiceType] = useState<string>("")
    const [mileage, setMileage] = useState<string>("")
    const [notes, setNotes] = useState("")
    const [isSubmitting, setIsSubmitting] = useState(false)

    useEffect(() => {
        if (isOpen) {
            loadVehicles()
            resetForm()
        }
    }, [isOpen, initialVehicleId, initialServiceType, lockVehicle, lockServiceType])

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

        // setMileage("") // Don't reset mileage if pre-selected logic handled it? better to wait for loadVehicles
        setNotes("")
        setSearchTerm("")
    }

    const filteredVehicles = vehicles.filter(v =>
        v.placa.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.modelo.toLowerCase().includes(searchTerm.toLowerCase())
    )

    async function handleSubmit() {
        if (!selectedVehicle || !serviceType || !mileage) {
            toast.error("Complete todos los campos requeridos")
            return
        }

        const currentKm = selectedVehicle.kilometraje || 0
        const newKm = parseFloat(mileage)

        if (serviceType !== 'WASH' && newKm < currentKm) {
            toast.error(`El kilometraje no puede ser menor al actual (${currentKm} km)`)
            return
        }

        setIsSubmitting(true)
        const result = await registerMaintenance({
            vehicle_id: selectedVehicle!.id,
            service_type: serviceType,
            mileage: parseFloat(mileage), // Keep mileage for wash even if unused for logic, good for history
            notes,
            performed_by: 'Mecánico' // Could be dynamic if we had auth context here easily
        })

        setIsSubmitting(false)

        if (result.success) {
            toast.success("Mantenimiento registrado correctamente")
            if (onSuccess) onSuccess()
            onClose()
        } else {
            toast.error("Error al registrar: " + result.error)
        }
    }

    // ServiceCard component is no longer used directly in the render loop, but the definition is kept if needed elsewhere.
    const ServiceCard = ({ id, label, icon: Icon, color }: any) => (
        <div
            onClick={() => setServiceType(id)}
            className={`cursor-pointer p-4 rounded-xl border transition-all flex flex-col items-center justify-center gap-2 text-center h-24
                ${serviceType === id
                    ? `bg-${color}-50 border-${color}-500 text-${color}-700 ring-1 ring-${color}-500`
                    : `bg-white border-zinc-200 hover:border-${color}-200 hover:bg-${color}-50/50`
                }
            `}
        >
            <Icon size={24} className={serviceType === id ? `text-${color}-600` : `text-zinc-400`} />
            <span className={`text-xs font-bold ${serviceType === id ? `text-${color}-900` : `text-zinc-600`}`}>
                {label}
            </span>
        </div>
    )

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
                                {!lockVehicle && (
                                    <Button variant="ghost" size="sm" onClick={() => setSelectedVehicle(null)}>Cambiar</Button>
                                )}
                            </div>
                        )}
                    </div>

                    {/* 2. Service Type */}
                    {selectedVehicle && (
                        <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Tipo de Servicio</Label>
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    { id: 'OIL_CHANGE', label: 'Cambio de Aceite', icon: Droplets },
                                    { id: 'TIMING_BELT', label: 'Correa de Tiempo', icon: Timer },
                                    { id: 'CHAIN_KIT', label: 'Kit de Arrastre', icon: Bike },
                                    { id: 'WASH', label: 'Lavado', icon: Droplets }, // Using Droplets as placeholder or different icon if avail
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

                                    if (isDisabled && !isSelected) return null // Hide others if locked? Or just disable? User asked "debe elegir el que esta por vencerse" implying strictness. Hiding is cleaner.

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

                    {/* 3. Details */}
                    {selectedVehicle && serviceType && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
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

                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Notas (Opcional)</Label>
                                <Textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="Detalles adicionales del servicio..."
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
                        disabled={isSubmitting || !selectedVehicle || !serviceType || !mileage}
                        className="bg-black text-white hover:bg-zinc-800"
                    >
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Registrar Servicio
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
