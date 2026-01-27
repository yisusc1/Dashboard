"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"
import { Loader2, AlertTriangle, Save, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog"
import { getMileageSource, correctMileage, type MileageSource } from "@/app/admin/vehiculos/actions"

interface MileageCorrectionDialogProps {
    isOpen: boolean
    onClose: () => void
    vehicleId: string
    vehicleName: string
    currentMileage: number
    onUpdate: () => void
}

export function MileageCorrectionDialog({ isOpen, onClose, vehicleId, vehicleName, currentMileage, onUpdate }: MileageCorrectionDialogProps) {
    const [loading, setLoading] = useState(false)
    const [analyzing, setAnalyzing] = useState(true)
    const [source, setSource] = useState<MileageSource | null>(null)
    const [newMileage, setNewMileage] = useState<string>("")
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (isOpen && vehicleId) {
            analyzeSource()
            setNewMileage(currentMileage.toString())
        } else {
            // Reset state on close
            setSource(null)
            setAnalyzing(true)
            setError(null)
        }
    }, [isOpen, vehicleId, currentMileage])

    async function analyzeSource() {
        setAnalyzing(true)
        try {
            const result = await getMileageSource(vehicleId, currentMileage)
            setSource(result)
            if (!result) {
                setError("No se pudo identificar el registro origen de este kilometraje. Podría ser un valor heredado o antiguo.")
            }
        } catch (err) {
            console.error(err)
            setError("Error al analizar el origen del kilometraje.")
        } finally {
            setAnalyzing(false)
        }
    }

    async function handleSave() {
        if (!source) return

        const val = parseInt(newMileage)
        if (isNaN(val) || val < 0) {
            toast.error("Ingrese un kilometraje válido")
            return
        }

        setLoading(true)
        try {
            const { success, error } = await correctMileage(source, val)
            if (success) {
                toast.success("Kilometraje corregido exitosamente")
                onUpdate()
                onClose()
            } else {
                toast.error(error || "Error al actualizar")
            }
        } catch (err) {
            console.error(err)
            toast.error("Error inesperado")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px] rounded-3xl border-zinc-200 shadow-2xl">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold text-zinc-900">Corregir Kilometraje</DialogTitle>
                    <DialogDescription className="text-zinc-500">
                        {vehicleName}
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4">
                    {analyzing ? (
                        <div className="flex flex-col items-center justify-center py-6 gap-2 text-zinc-500">
                            <Loader2 className="animate-spin" />
                            <span className="text-sm">Buscando origen del dato...</span>
                        </div>
                    ) : error ? (
                        <div className="p-4 bg-yellow-50 text-yellow-800 rounded-xl flex gap-3 items-start text-sm">
                            <AlertTriangle className="shrink-0 mt-0.5" size={16} />
                            <p>{error}</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Source Info Card */}
                            <div className="p-4 bg-zinc-50 border border-zinc-100 rounded-2xl space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Origen Detectado</span>
                                    {source?.type === 'fuel_log' ? (
                                        <div className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded-full">CARGA COMBUSTIBLE</div>
                                    ) : (
                                        <div className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold rounded-full">REPORTE</div>
                                    )}
                                </div>
                                <div className="font-medium text-zinc-900 flex items-center gap-2">
                                    <CheckCircle size={16} className="text-emerald-500" />
                                    {source?.description}
                                </div>
                                <p className="text-xs text-zinc-500">
                                    Registrado el: {source?.date ? new Date(source.date).toLocaleDateString() : 'N/A'}
                                </p>
                            </div>

                            {/* Input Field */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-zinc-700">Nuevo Kilometraje</label>
                                <Input
                                    type="number"
                                    value={newMileage}
                                    onChange={(e) => setNewMileage(e.target.value)}
                                    className="h-12 text-lg font-mono"
                                />
                                <p className="text-xs text-zinc-400">
                                    Esto modificará directamente el registro original.
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="outline" onClick={onClose} className="rounded-xl h-12">
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={loading || analyzing || !!error}
                        className="rounded-xl h-12 bg-black hover:bg-zinc-800 text-white gap-2"
                    >
                        {loading && <Loader2 className="animate-spin" size={16} />}
                        <Save size={18} />
                        Guardar Corrección
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
