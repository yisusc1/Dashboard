"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { CalendarIcon, FileText, Loader2, CheckCircle2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { generateDailyReport } from "./actions"

export function DailyReportDialog() {
    const [open, setOpen] = useState(false)
    const [date, setDate] = useState<Date>()
    const [loading, setLoading] = useState(false)
    const [successData, setSuccessData] = useState<{ total: number, count: number, details?: any[], date?: string, supervisor?: string } | null>(null)

    useEffect(() => {
        setDate(new Date())
    }, [])

    const handleGenerate = async () => {
        if (!date) return
        setLoading(true)
        setSuccessData(null)

        try {
            const dateStr = format(date, "yyyy-MM-dd")
            const res = await generateDailyReport(dateStr)

            if (res.success) {
                toast.success("Reporte generado correctamente")
                setSuccessData({
                    total: res.totalLiters || 0,
                    count: res.count || 0,
                    details: res.details,
                    date: dateStr,
                    supervisor: res.supervisorName
                })
            } else {
                toast.error(res.error || "Error al generar reporte")
            }
        } catch (error) {
            console.error(error)
            toast.error("Error de conexión")
        } finally {
            setLoading(false)
        }
    }

    const handleWhatsApp = () => {
        if (!successData) return

        const vehiclesList = successData.details?.map((v: any, index: number) =>
            `${index + 1}. ${v.model} / ${v.liters.toFixed(2)} L`
        ).join("\n")

        const message = `*Reporte de Combustible Diario*

*Fecha:* ${successData.date}
*Supervisor:* ${successData.supervisor || "N/A"}

*Vehículos:*
${vehiclesList}

*Total:* ${successData.total.toFixed(2)} L`

        const url = `https://wa.me/?text=${encodeURIComponent(message)}`
        window.open(url, '_blank')
    }

    const reset = () => {
        setOpen(false)
        setSuccessData(null)
        setDate(new Date())
    }

    return (
        <Dialog open={open} onOpenChange={(val) => !val && reset()}>
            <DialogTrigger asChild>
                <Button
                    variant="outline"
                    onClick={() => setOpen(true)}
                    className="flex-1 md:flex-none gap-2 rounded-xl h-12 bg-white hover:bg-slate-50 border-slate-200 text-slate-700 shadow-sm"
                >
                    <FileText size={18} className="text-indigo-600" />
                    <span className="md:inline font-medium">Generar Reporte</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] rounded-3xl">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold text-center">Generar Reporte Diario</DialogTitle>
                    <DialogDescription className="text-center">
                        Selecciona la fecha para consolidar el reporte de combustible.
                    </DialogDescription>
                </DialogHeader>

                {!successData ? (
                    <div className="py-6 space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700 ml-1">Fecha del Reporte</label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant={"outline"}
                                        className={cn(
                                            "w-full h-14 rounded-xl justify-start text-left font-normal border-slate-200 text-base",
                                            !date && "text-muted-foreground"
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {date ? format(date, "PPP", { locale: es }) : <span>Seleccionar fecha</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="center">
                                    <Calendar
                                        mode="single"
                                        selected={date}
                                        onSelect={(d) => d && setDate(d)}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>

                        <Button
                            onClick={handleGenerate}
                            disabled={loading}
                            className="w-full h-14 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-lg font-bold shadow-lg shadow-indigo-200"
                        >
                            {loading ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Generando...</> : "Generar Reporte"}
                        </Button>
                    </div>
                ) : (
                    <div className="py-8 flex flex-col items-center animate-in fade-in zoom-in duration-300">
                        <div className="h-16 w-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
                            <CheckCircle2 size={32} />
                        </div>
                        <h3 className="text-2xl font-bold text-slate-900 mb-1">¡Reporte Guardado!</h3>
                        <p className="text-slate-500 text-center mb-6">El reporte ha sido archivado exitosamente.</p>

                        <div className="bg-slate-50 rounded-2xl p-4 w-full grid grid-cols-2 gap-4 text-center mb-6">
                            <div>
                                <p className="text-xs font-bold uppercase text-slate-400">Total Litros</p>
                                <p className="text-xl font-bold text-slate-900">{successData.total.toFixed(2)} L</p>
                            </div>
                            <div>
                                <p className="text-xs font-bold uppercase text-slate-400">Registros</p>
                                <p className="text-xl font-bold text-slate-900">{successData.count}</p>
                            </div>
                        </div>

                        <div className="flex flex-col gap-3 w-full">
                            <Button onClick={handleWhatsApp} className="w-full h-12 rounded-xl bg-green-600 hover:bg-green-700 font-bold text-white shadow-lg shadow-green-200">
                                Enviar por WhatsApp
                            </Button>
                            <Button variant="ghost" onClick={reset} className="w-full h-12 rounded-xl">
                                Cerrar
                            </Button>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}
