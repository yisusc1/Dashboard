"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"
import { Loader2, Save, FileDigit } from "lucide-react"
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
import { resetVehicleTalonario } from "@/app/admin/vehiculos/actions"

interface TalonarioCorrectionDialogProps {
    isOpen: boolean
    onClose: () => void
    vehicleId: string
    vehicleName: string
    onUpdate: () => void
}

export function TalonarioCorrectionDialog({ isOpen, onClose, vehicleId, vehicleName, onUpdate }: TalonarioCorrectionDialogProps) {
    const [loading, setLoading] = useState(false)
    const [nextTicket, setNextTicket] = useState<string>("")

    useEffect(() => {
        if (!isOpen) {
            setNextTicket("")
        }
    }, [isOpen])

    async function handleSave() {
        if (!nextTicket) {
            toast.error("Ingrese el número del próximo ticket")
            return
        }

        setLoading(true)
        try {
            const { success, error } = await resetVehicleTalonario(vehicleId, nextTicket)
            if (success) {
                toast.success("Talonario actualizado exitosamente")
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
                    <DialogTitle className="text-xl font-bold text-zinc-900">Actualizar Talonario</DialogTitle>
                    <DialogDescription className="text-zinc-500">
                        {vehicleName}
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4">
                    <div className="space-y-6">
                        <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl space-y-2">
                            <div className="flex items-center gap-2 text-indigo-700 font-bold">
                                <FileDigit size={20} />
                                Nuevo Talonario
                            </div>
                            <p className="text-xs text-indigo-600/80">
                                Establece el número del <strong>siguiente ticket vacío</strong> que tienes en tu talonario físico.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-zinc-700">Número del próximo ticket</label>
                            <Input
                                type="text"
                                placeholder="Ej. 0001"
                                value={nextTicket}
                                onChange={(e) => {
                                    const val = e.target.value.replace(/\D/g, '')
                                    setNextTicket(val)
                                }}
                                className="h-12 text-lg font-mono font-bold"
                            />
                        </div>
                    </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="outline" onClick={onClose} className="rounded-xl h-12">
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={loading || !nextTicket}
                        className="rounded-xl h-12 bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
                    >
                        {loading && <Loader2 className="animate-spin" size={16} />}
                        <Save size={18} />
                        Guardar Talonario
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
