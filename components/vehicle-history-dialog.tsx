"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Loader2, MapPin, User, Calendar } from "lucide-react"

interface VehicleHistoryDialogProps {
    isOpen: boolean
    onClose: () => void
    vehicleId?: string
    vehiclePlate?: string
}

export function VehicleHistoryDialog({ isOpen, onClose, vehicleId, vehiclePlate }: VehicleHistoryDialogProps) {
    const [loading, setLoading] = useState(false)
    const [history, setHistory] = useState<any[]>([])

    useEffect(() => {
        if (isOpen && vehicleId) {
            loadHistory(vehicleId)
        }
    }, [isOpen, vehicleId])

    async function loadHistory(id: string) {
        setLoading(true)
        const supabase = createClient()

        const { data } = await supabase
            .from('reportes')
            .select('*')
            .eq('vehiculo_id', id)
            .order('created_at', { ascending: false })
            .limit(10)

        if (data) setHistory(data)
        setLoading(false)
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto rounded-3xl bg-zinc-50 border-none">
                <DialogHeader className="mb-4">
                    <DialogTitle className="text-2xl font-bold">Historial de Transporte</DialogTitle>
                    <DialogDescription>
                        Últimos recorridos del vehículo <span className="font-mono font-bold text-black">{vehiclePlate}</span>
                    </DialogDescription>
                </DialogHeader>

                <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-x-auto">
                    <Table>
                        <TableHeader className="bg-zinc-50">
                            <TableRow>
                                <TableHead>Fecha</TableHead>
                                <TableHead>Conductor</TableHead>
                                <TableHead>Departamento</TableHead>
                                <TableHead className="text-right">Salida (km)</TableHead>
                                <TableHead className="text-right">Entrada (km)</TableHead>
                                <TableHead>Novedades</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                                        <div className="flex flex-col items-center gap-2">
                                            <Loader2 className="animate-spin" />
                                            Cargando historial...
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : history.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                                        No hay reportes recientes.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                history.map((trip) => (
                                    <TableRow key={trip.id} className="hover:bg-zinc-50/50">
                                        <TableCell className="font-medium text-xs">
                                            <div className="flex flex-col">
                                                <span>{format(new Date(trip.created_at), "dd MMM yy", { locale: es })}</span>
                                                <span className="text-zinc-400">{format(new Date(trip.created_at), "HH:mm")}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2 text-sm">
                                                <User size={14} className="text-zinc-400" />
                                                {trip.conductor}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <span className="px-2 py-1 rounded-md bg-zinc-100 text-xs font-semibold text-zinc-600">
                                                {trip.departamento}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right font-mono text-zinc-600">
                                            {trip.km_salida.toLocaleString()}
                                        </TableCell>
                                        <TableCell className="text-right font-mono font-bold text-zinc-900">
                                            {trip.km_entrada ? trip.km_entrada.toLocaleString() : (
                                                <span className="text-amber-500 text-xs italic">En ruta</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="max-w-[200px]">
                                            <div className="text-xs text-zinc-600 truncate" title={trip.observaciones_entrada || trip.observaciones_salida}>
                                                {trip.observaciones_entrada || trip.observaciones_salida || "-"}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </DialogContent>
        </Dialog>
    )
}
