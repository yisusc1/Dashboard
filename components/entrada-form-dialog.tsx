"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

type Reporte = {
    id: string
    vehiculo_id: string
    km_salida: number
    conductor: string
    departamento: string
    created_at: string
    vehiculos: {
        modelo: string
        placa: string
        codigo: string
        tipo: string
    }
}

type EntradaFormDialogProps = {
    isOpen: boolean
    onClose: () => void
    initialVehicleId?: string
}

export function EntradaFormDialog({ isOpen, onClose, initialVehicleId }: EntradaFormDialogProps) {
    const [loading, setLoading] = useState(false)
    const [reportes, setReportes] = useState<Reporte[]>([])
    const [reporteId, setReporteId] = useState("")
    const [kmEntrada, setKmEntrada] = useState("")
    const [selectedReport, setSelectedReport] = useState<Reporte | null>(null)
    const [gasolina, setGasolina] = useState("Full")
    const [observaciones, setObservaciones] = useState("")
    const router = useRouter()

    // Checks
    const [checks, setChecks] = useState({
        aceite: false,
        agua: false,
        gato: false,
        cruz: false,
        triangulo: false,
        caucho: false,
        carpeta: false,
        onu: false,
        ups: false,
        escalera: false,
        // Moto specific
        casco: false,
        luces: false,
        herramientas: false
    })

    useEffect(() => {
        if (isOpen) {
            loadPendingReports().then((data) => {
                if (initialVehicleId && data) {
                    const matchingReport = data.find((r: any) => r.vehiculo_id === initialVehicleId)
                    if (matchingReport) {
                        handleReportChange(matchingReport.id)
                    }
                }
            })
        }
    }, [isOpen, initialVehicleId])

    async function loadPendingReports() {
        const supabase = createClient()
        const { data } = await supabase
            .from('reportes')
            .select(`
                id, 
                vehiculo_id,
                km_salida, 
                conductor,
                departamento,
                created_at,
                vehiculos ( modelo, placa, codigo, tipo )
            `)
            .is('km_entrada', null)
            .order('created_at', { ascending: false })

        // @ts-ignore
        if (data) setReportes(data)
        return data
    }

    function handleReportChange(value: string) {
        setReporteId(value)
        const report = reportes.find(r => r.id === value) || null
        setSelectedReport(report)
        // Reset checks on change
        setChecks({
            aceite: false, agua: false, gato: false, cruz: false,
            triangulo: false, caucho: false, carpeta: false,
            onu: false, ups: false, escalera: false,
            casco: false, luces: false, herramientas: false
        })
    }

    const toggleCheck = (key: keyof typeof checks) => {
        setChecks(prev => ({ ...prev, [key]: !prev[key] }))
    }

    async function handleSubmit() {
        if (!reporteId || !kmEntrada) {
            toast.error("Complete todos los campos obligatorios")
            return
        }

        const km = parseInt(kmEntrada)
        if (selectedReport && km < selectedReport.km_salida) {
            toast.error(`Error: El KM de entrada (${km}) es menor al de salida (${selectedReport.km_salida})`)
            return
        }

        setLoading(true)
        try {
            const supabase = createClient()
            const { error } = await supabase
                .from('reportes')
                .update({
                    km_entrada: km,
                    gasolina_entrada: gasolina,
                    observaciones_entrada: observaciones,

                    aceite_entrada: checks.aceite,
                    agua_entrada: checks.agua,

                    // Car specific
                    gato_entrada: checks.gato,
                    cruz_entrada: checks.cruz,
                    triangulo_entrada: checks.triangulo,
                    caucho_entrada: checks.caucho,
                    carpeta_entrada: checks.carpeta,

                    // Moto specific
                    casco_entrada: checks.casco,
                    luces_entrada: checks.luces,
                    herramientas_entrada: checks.herramientas,

                    onu_entrada: checks.onu ? 1 : 0,
                    ups_entrada: checks.ups ? 1 : 0,
                    escalera_entrada: checks.escalera,
                })
                .eq('id', reporteId)

            if (error) throw error

            // [NEW] Update Vehicle Fuel Level
            const fuelMap: Record<string, number> = {
                "Full": 100,
                "3/4": 75,
                "1/2": 50,
                "1/4": 25,
                "Reserva": 10
            }
            const fuelLevel = fuelMap[gasolina] || 0

            // We update the vehicle directly
            if (selectedReport?.vehiculo_id) {
                await supabase.from('vehiculos').update({
                    current_fuel_level: fuelLevel,
                    last_fuel_update: new Date().toISOString()
                }).eq('id', selectedReport.vehiculo_id)
            }

            toast.success("Entrada registrada correctamente")

            // --- WhatsApp Integration ---
            if (selectedReport) {
                const text = formatEntradaText({
                    km_entrada: km,
                    gasolina_entrada: gasolina,
                    observaciones_entrada: observaciones,
                    aceite_entrada: checks.aceite,
                    agua_entrada: checks.agua,
                    gato_entrada: checks.gato,
                    cruz_entrada: checks.cruz,
                    triangulo_entrada: checks.triangulo,
                    caucho_entrada: checks.caucho,
                    carpeta_entrada: checks.carpeta,
                    // Moto
                    casco_entrada: checks.casco,
                    luces_entrada: checks.luces,
                    herramientas_entrada: checks.herramientas,

                    onu_entrada: checks.onu ? 1 : 0,
                    ups_entrada: checks.ups ? 1 : 0,
                    escalera_entrada: checks.escalera
                }, selectedReport)

                window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
            }
            // ----------------------------

            router.refresh()
            onClose()

            // Reset form
            setReporteId("")
            setKmEntrada("")
            setSelectedReport(null)
            setGasolina("Full")
            setObservaciones("")
            setChecks({
                aceite: false, agua: false, gato: false, cruz: false,
                triangulo: false, caucho: false, carpeta: false,
                onu: false, ups: false, escalera: false,
                casco: false, luces: false, herramientas: false
            })

        } catch (error) {
            console.error(error)
            toast.error("Error al registrar entrada")
        } finally {
            setLoading(false)
        }
    }

    // Helpers
    const formatEntradaText = (entradaData: any, reporteOriginal: Reporte) => {
        const check = (val: boolean | number) => val ? '✅' : '❌'

        // Calcular fechas y horas
        const fechaSalidaObj = new Date(reporteOriginal.created_at)
        const fechaEntradaObj = new Date()

        const fechaEntrada = fechaEntradaObj.toLocaleDateString()
        const horaSalida = fechaSalidaObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        const horaEntrada = fechaEntradaObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

        // vehiculos is an object in Reporte type based on our interface
        const vehiculo = reporteOriginal.vehiculos
        const vehiculoNombre = vehiculo ? vehiculo.modelo : 'Desconocido'
        const kmRecorrido = Number(entradaData.km_entrada) - Number(reporteOriginal.km_salida)

        let msg = `*Reporte de Entrada*\n\n`

        msg += `Fecha (Entrada): ${fechaEntrada}\n`
        msg += `Hora (Salida): ${horaSalida}\n`
        msg += `Hora (Entrada): ${horaEntrada}\n\n`

        msg += `Conductor: ${reporteOriginal.conductor}\n`
        msg += `Departamento: ${reporteOriginal.departamento}\n\n`

        msg += `Vehículo: ${vehiculoNombre}\n`
        if (vehiculo?.placa) msg += `Placa: ${vehiculo.placa}\n`
        msg += `Kilometraje (Salida): ${reporteOriginal.km_salida}\n`
        msg += `Kilometraje (Entrada): ${entradaData.km_entrada}\n`
        msg += `Kilometraje Recorrido: ${kmRecorrido}\n`
        msg += `Nivel de Gasolina: ${entradaData.gasolina_entrada}\n\n`

        msg += `*Chequeo Técnico:*\n`
        msg += `Chequeo de Aceite: ${check(entradaData.aceite_entrada)}\n`

        const isMoto = vehiculo?.codigo?.startsWith('M-') || vehiculo.tipo === 'Moto' || vehiculo.modelo?.toLowerCase().includes('moto')

        if (!isMoto) msg += `Chequeo de Agua/Refrigerante: ${check(entradaData.agua_entrada)}\n`

        msg += `\n`

        if (!isMoto) {
            msg += `*Herramientas:*\n`
            msg += `Gato: ${check(entradaData.gato_entrada)}\n`
            msg += `Llave Cruz: ${check(entradaData.cruz_entrada)}\n`
            msg += `Triángulo: ${check(entradaData.triangulo_entrada)}\n`
            msg += `Caucho: ${check(entradaData.caucho_entrada)}\n`
            msg += `Carpeta de Permisos: ${check(entradaData.carpeta_entrada)}\n`
        } else {
            msg += `*Seguridad (Moto):*\n`
            msg += `Casco: ${check(entradaData.casco_entrada)}\n`
            msg += `Luces: ${check(entradaData.luces_entrada)}\n`
            msg += `Herramientas: ${check(entradaData.herramientas_entrada)}\n`
        }
        msg += `\n`

        if (reporteOriginal.departamento === 'Instalación' && !isMoto) {
            msg += `*Equipos Asignados:*\n`
            msg += `ONU/Router: ${check(entradaData.onu_entrada)}\n`
            msg += `Mini-UPS: ${check(entradaData.ups_entrada)}\n`
            msg += `Escalera: ${check(entradaData.escalera_entrada)}\n\n`
        }

        msg += `Observaciones: ${entradaData.observaciones_entrada || 'Ninguna'}`
        return msg
    }

    // Helpers conditions
    // Note: In Entrada, we use selectedReport.vehiculos which is an object
    const v = selectedReport?.vehiculos
    const isMoto = v?.codigo?.startsWith('M-') || v?.tipo === 'Moto' || v?.modelo?.toLowerCase().includes('moto')
    const isInstalacion = selectedReport?.departamento === 'Instalación'


    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-xl rounded-[32px] border-none shadow-2xl max-h-[90vh] flex flex-col p-0 focus:outline-none bg-zinc-50 overflow-hidden">
                <DialogHeader className="bg-white p-6 pb-4 border-b border-zinc-100">
                    <DialogTitle className="text-2xl font-bold text-center">Registrar Entrada</DialogTitle>
                    <DialogDescription className="text-center">Cierre de ruta y novedades</DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
                    {/* Basic Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2 col-span-2">
                            <Label>Vehículo en Ruta</Label>
                            <Select value={reporteId} onValueChange={handleReportChange}>
                                <SelectTrigger className="h-12 rounded-xl bg-white border-zinc-200">
                                    <SelectValue placeholder="Seleccione vehículo..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {reportes.map(r => (
                                        <SelectItem key={r.id} value={r.id}>
                                            {r.vehiculos.modelo} - {r.vehiculos.placa} ({r.conductor})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {selectedReport && (
                                <p className="text-xs text-zinc-500 text-right">Salida: {selectedReport.km_salida.toLocaleString()} km</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label>Kilometraje Llegada</Label>
                            <Input
                                type="number"
                                value={kmEntrada}
                                onChange={e => setKmEntrada(e.target.value)}
                                className="h-12 rounded-xl bg-white"
                                placeholder={selectedReport ? `> ${selectedReport.km_salida}` : "0"}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Nivel de Gasolina</Label>
                            <Select value={gasolina} onValueChange={setGasolina}>
                                <SelectTrigger className="h-12 rounded-xl bg-white">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Full">Full</SelectItem>
                                    <SelectItem value="3/4">3/4</SelectItem>
                                    <SelectItem value="1/2">1/2</SelectItem>
                                    <SelectItem value="1/4">1/4</SelectItem>
                                    <SelectItem value="Reserva">Reserva</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Checks section */}
                    <div className="bg-white p-5 rounded-[24px] border border-zinc-100 shadow-sm space-y-6">

                        {/* TÉCNICO */}
                        <div>
                            <h4 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                Chequeo Técnico (Llegada)
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="flex items-center gap-3 p-3 rounded-2xl bg-zinc-50 border border-transparent hover:border-zinc-200 transition-all">
                                    <Checkbox id="aceite" checked={checks.aceite} onCheckedChange={() => toggleCheck('aceite')} className="w-6 h-6 rounded-md border-2 border-zinc-300 data-[state=checked]:bg-black data-[state=checked]:border-black transition-colors" />
                                    <Label htmlFor="aceite" className="text-base font-medium text-zinc-700 cursor-pointer flex-1 py-1">Nivel de Aceite</Label>
                                </div>
                                {!isMoto && (
                                    <div className="flex items-center gap-3 p-3 rounded-2xl bg-zinc-50 border border-transparent hover:border-zinc-200 transition-all">
                                        <Checkbox id="agua" checked={checks.agua} onCheckedChange={() => toggleCheck('agua')} className="w-6 h-6 rounded-md border-2 border-zinc-300 data-[state=checked]:bg-black data-[state=checked]:border-black transition-colors" />
                                        <Label htmlFor="agua" className="text-base font-medium text-zinc-700 cursor-pointer flex-1 py-1">Agua / Refrigerante</Label>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* SEGURIDAD - CARROS */}
                        {!isMoto && selectedReport && (
                            <div>
                                <h4 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-3 flex items-center gap-2 border-t border-zinc-100 pt-4">
                                    Herramientas (Verificar devolución)
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div className="flex items-center gap-3 p-3 rounded-2xl bg-zinc-50 border border-transparent hover:border-zinc-200 transition-all">
                                        <Checkbox id="gato" checked={checks.gato} onCheckedChange={() => toggleCheck('gato')} className="w-6 h-6 rounded-md border-2 border-zinc-300 data-[state=checked]:bg-black data-[state=checked]:border-black" />
                                        <Label htmlFor="gato" className="text-base font-medium text-zinc-700 cursor-pointer flex-1 py-1">Gato Hidráulico</Label>
                                    </div>
                                    <div className="flex items-center gap-3 p-3 rounded-2xl bg-zinc-50 border border-transparent hover:border-zinc-200 transition-all">
                                        <Checkbox id="cruz" checked={checks.cruz} onCheckedChange={() => toggleCheck('cruz')} className="w-6 h-6 rounded-md border-2 border-zinc-300 data-[state=checked]:bg-black data-[state=checked]:border-black" />
                                        <Label htmlFor="cruz" className="text-base font-medium text-zinc-700 cursor-pointer flex-1 py-1">Llave Cruz</Label>
                                    </div>
                                    <div className="flex items-center gap-3 p-3 rounded-2xl bg-zinc-50 border border-transparent hover:border-zinc-200 transition-all">
                                        <Checkbox id="triangulo" checked={checks.triangulo} onCheckedChange={() => toggleCheck('triangulo')} className="w-6 h-6 rounded-md border-2 border-zinc-300 data-[state=checked]:bg-black data-[state=checked]:border-black" />
                                        <Label htmlFor="triangulo" className="text-base font-medium text-zinc-700 cursor-pointer flex-1 py-1">Triángulo</Label>
                                    </div>
                                    <div className="flex items-center gap-3 p-3 rounded-2xl bg-zinc-50 border border-transparent hover:border-zinc-200 transition-all">
                                        <Checkbox id="caucho" checked={checks.caucho} onCheckedChange={() => toggleCheck('caucho')} className="w-6 h-6 rounded-md border-2 border-zinc-300 data-[state=checked]:bg-black data-[state=checked]:border-black" />
                                        <Label htmlFor="caucho" className="text-base font-medium text-zinc-700 cursor-pointer flex-1 py-1">Caucho Repuesto</Label>
                                    </div>
                                    <div className="flex items-center gap-3 p-3 rounded-2xl bg-zinc-50 border border-transparent hover:border-zinc-200 transition-all">
                                        <Checkbox id="carpeta" checked={checks.carpeta} onCheckedChange={() => toggleCheck('carpeta')} className="w-6 h-6 rounded-md border-2 border-zinc-300 data-[state=checked]:bg-black data-[state=checked]:border-black" />
                                        <Label htmlFor="carpeta" className="text-base font-medium text-zinc-700 cursor-pointer flex-1 py-1">Carpeta / Permisos</Label>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* SEGURIDAD - MOTO */}
                        {isMoto && selectedReport && (
                            <div>
                                <h4 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-3 flex items-center gap-2 border-t border-zinc-100 pt-4">
                                    Seguridad Moto (Verificar devolución)
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div className="flex items-center gap-3 p-3 rounded-2xl bg-zinc-50 border border-transparent hover:border-zinc-200 transition-all">
                                        <Checkbox id="casco" checked={checks.casco} onCheckedChange={() => toggleCheck('casco')} className="w-6 h-6 rounded-md border-2 border-zinc-300 data-[state=checked]:bg-black data-[state=checked]:border-black" />
                                        <Label htmlFor="casco" className="text-base font-medium text-zinc-700 cursor-pointer flex-1 py-1">Casco</Label>
                                    </div>
                                    <div className="flex items-center gap-3 p-3 rounded-2xl bg-zinc-50 border border-transparent hover:border-zinc-200 transition-all">
                                        <Checkbox id="luces" checked={checks.luces} onCheckedChange={() => toggleCheck('luces')} className="w-6 h-6 rounded-md border-2 border-zinc-300 data-[state=checked]:bg-black data-[state=checked]:border-black" />
                                        <Label htmlFor="luces" className="text-base font-medium text-zinc-700 cursor-pointer flex-1 py-1">Luces Nuevas</Label>
                                    </div>
                                    <div className="flex items-center gap-3 p-3 rounded-2xl bg-zinc-50 border border-transparent hover:border-zinc-200 transition-all">
                                        <Checkbox id="herramientas" checked={checks.herramientas} onCheckedChange={() => toggleCheck('herramientas')} className="w-6 h-6 rounded-md border-2 border-zinc-300 data-[state=checked]:bg-black data-[state=checked]:border-black" />
                                        <Label htmlFor="herramientas" className="text-base font-medium text-zinc-700 cursor-pointer flex-1 py-1">Herramientas Básicas</Label>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* EQUIPOS - SOLO INSTALACION Y NO MOTO */}
                        {isInstalacion && !isMoto && (
                            <div>
                                <h4 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-3 flex items-center gap-2 border-t border-zinc-100 pt-4">
                                    Equipos Asignados
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div className="flex items-center gap-3 p-3 rounded-2xl bg-zinc-50 border border-transparent hover:border-zinc-200 transition-all">
                                        <Checkbox id="onu" checked={checks.onu} onCheckedChange={() => toggleCheck('onu')} className="w-6 h-6 rounded-md border-2 border-zinc-300 data-[state=checked]:bg-black data-[state=checked]:border-black" />
                                        <Label htmlFor="onu" className="text-base font-medium text-zinc-700 cursor-pointer flex-1 py-1">ONU / Router</Label>
                                    </div>
                                    <div className="flex items-center gap-3 p-3 rounded-2xl bg-zinc-50 border border-transparent hover:border-zinc-200 transition-all">
                                        <Checkbox id="ups" checked={checks.ups} onCheckedChange={() => toggleCheck('ups')} className="w-6 h-6 rounded-md border-2 border-zinc-300 data-[state=checked]:bg-black data-[state=checked]:border-black" />
                                        <Label htmlFor="ups" className="text-base font-medium text-zinc-700 cursor-pointer flex-1 py-1">Mini-UPS</Label>
                                    </div>
                                    <div className="flex items-center gap-3 p-3 rounded-2xl bg-zinc-50 border border-transparent hover:border-zinc-200 transition-all">
                                        <Checkbox id="escalera" checked={checks.escalera} onCheckedChange={() => toggleCheck('escalera')} className="w-6 h-6 rounded-md border-2 border-zinc-300 data-[state=checked]:bg-black data-[state=checked]:border-black" />
                                        <Label htmlFor="escalera" className="text-base font-medium text-zinc-700 cursor-pointer flex-1 py-1">Escalera</Label>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label>Observaciones / Novedades</Label>
                        <Textarea
                            value={observaciones}
                            onChange={e => setObservaciones(e.target.value)}
                            className="bg-white py-3 min-h-[80px]"
                            placeholder="Detalle cualquier novedad encontrada..."
                        />
                    </div>
                </div>

                <DialogFooter className="bg-white p-4 border-t border-zinc-100 flex-col sm:flex-col gap-2">
                    <Button onClick={handleSubmit} disabled={loading} className="w-full h-12 rounded-xl bg-black text-white hover:bg-zinc-800 text-lg shadow-lg shadow-black/10">
                        {loading ? "Registrando..." : "Confirmar Entrada"}
                    </Button>
                    <Button variant="ghost" onClick={onClose} className="w-full rounded-xl">
                        Cancelar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
