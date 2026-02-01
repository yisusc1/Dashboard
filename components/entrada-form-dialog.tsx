"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { CheckCircle, Send, AlertCircle, Plus, Trash2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { VehicleSelector, Vehicle } from "@/components/vehicle-selector"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { revalidateGerencia, getActiveFaults, submitEntryReport } from "@/app/transporte/actions" // [UPDATED]
import { reportFault } from "@/app/taller/actions"

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
        odometro_averiado?: boolean
    }
}

type EntradaFormDialogProps = {
    isOpen: boolean
    onClose: () => void
    initialVehicleId?: string
    onSuccess?: () => void
}

export function EntradaFormDialog({ isOpen, onClose, initialVehicleId, onSuccess }: EntradaFormDialogProps) {
    const [loading, setLoading] = useState(false)
    const [reportes, setReportes] = useState<Reporte[]>([])
    const [reporteId, setReporteId] = useState("")
    const [kmEntrada, setKmEntrada] = useState("")
    const [selectedReport, setSelectedReport] = useState<Reporte | null>(null)
    const [gasolina, setGasolina] = useState("Full")
    const [faultsToAdd, setFaultsToAdd] = useState<string[]>([]) // [NEW] Explicit faults
    const [activeFaults, setActiveFaults] = useState<any[]>([]) // [NEW] Existing active faults from DB
    const [newFaultText, setNewFaultText] = useState("")
    const [step, setStep] = useState<'form' | 'success'>('form')
    const [whatsappText, setWhatsappText] = useState("")
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

    // [FIX] Effect 1: Load Reports on Open (Initial Load Only)
    useEffect(() => {
        if (isOpen) {
            setStep('form') // Reset step
            loadPendingReports().then((data) => {
                if (initialVehicleId && data) {
                    const matchingReport = data.find((r: any) => r.vehiculo_id === initialVehicleId)
                    if (matchingReport) {
                        setReporteId(matchingReport.id)
                        // Supabase sometimes returns single relation as array or object depending on query
                        // @ts-ignore
                        setSelectedReport(matchingReport) // [FIX] TS Error ignored as structure is compatible at runtime

                        // Initial Check Reset
                        setChecks({
                            aceite: false, agua: false, gato: false, cruz: false,
                            triangulo: false, caucho: false, carpeta: false,
                            onu: false, ups: false, escalera: false,
                            casco: false, luces: false, herramientas: false
                        })
                    }
                }
            })
        }
    }, [isOpen, initialVehicleId])

    // [FIX] Effect 2: Fetch Active Faults when Selected Report Changes
    useEffect(() => {
        if (selectedReport && selectedReport.vehiculo_id) {
            getActiveFaults(selectedReport.vehiculo_id)
                .then((faults: any[]) => {
                    if (faults) setActiveFaults(faults)
                })
                .catch((err: any) => console.error("Error loading faults:", err))
        } else {
            setActiveFaults([])
        }
    }, [selectedReport])

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
                created_at,
                vehiculos ( modelo, placa, codigo, tipo, odometro_averiado )
            `)
            .is('km_entrada', null)
            .order('created_at', { ascending: false })

        // @ts-ignore
        if (data) setReportes(data)
        return data
    }

    const handleReportChange = async (value: string) => {
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

        // [NEW] Fetch Active Faults via Server Action
        if (report && report.vehiculo_id) {
            getActiveFaults(report.vehiculo_id)
                .then(faults => {
                    if (faults) setActiveFaults(faults)
                })
                .catch(err => console.error("Error loading faults:", err))
        } else {
            setActiveFaults([])
        }
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


        // [FIX] Strict Validation
        // Bypass if odometer broken
        const isOdometerBroken = (selectedReport?.vehiculos as any)?.odometro_averiado

        if (!isOdometerBroken) {
            if (selectedReport && km <= selectedReport.km_salida) {
                toast.error(`Error Crítico: El KM de entrada (${km}) NO puede ser menor o igual al de salida (${selectedReport.km_salida}). Verifique el tablero.`)
                return
            }
        }

        // [NEW] Anomaly Detection (Warning)
        const diff = selectedReport ? km - selectedReport.km_salida : 0
        // Skip anomaly check if broken?? No, big jump is still weird. But 0 diff is expected.
        if (diff > 1000 && !isOdometerBroken) {
            // Check if user already confirmed via a secondary state or simply use a confirm dialog
            // For now, simpler approach: use native confirm or custom logic. 
            // Since browsers block native confirm in some contexts or it looks bad, let's use a simple state check or assume browser confirm is acceptable for this edge case temporarily, 
            // OR better: use sonner toast with action.

            // Let's use a toast with action for "Double Confirmation" if possible, but blocking is safer.
            // Using a standard confirm for this specific anomaly is effective and robust enough for now.
            if (!window.confirm(`⚠️ ADVERTENCIA DE SEGURIDAD ⚠️\n\nEstás reportando un recorrido de ${diff} kilómetros en un solo viaje.\n\n¿Es esto correcto?`)) {
                return
            }
        }

        setLoading(true)
        try {
            // [NEW] Use Unified Server Action
            const result = await submitEntryReport({
                reporte_id: reporteId,
                vehiculo_id: selectedReport?.vehiculo_id, // Passed implicitly via report association but good for reference if needed

                km_entrada: km,
                gasolina_entrada: gasolina,

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

                onu_entrada: checks.onu,
                ups_entrada: checks.ups,
                escalera_entrada: checks.escalera,

                // Explicit Faults
                faults: faultsToAdd
            })

            if (!result.success) {
                throw new Error(result.error)
            }

            toast.success("Entrada registrada correctamente")

            // --- WhatsApp Integration ---
            if (selectedReport) {
                const text = formatEntradaText({
                    km_entrada: km,
                    gasolina_entrada: gasolina,
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

                setWhatsappText(text)
                setStep('success')
            }

            // Trigger background refresh
            router.refresh()
            if (onSuccess) onSuccess()

            // Reset form fields
            setReporteId("")
            setKmEntrada("")
            // setSelectedReport(null) // Keep selectedReport for success view formatting
            setGasolina("Full")
            setFaultsToAdd([])
            setNewFaultText("")
            setActiveFaults([])
            setChecks({
                aceite: false, agua: false, gato: false, cruz: false,
                triangulo: false, caucho: false, carpeta: false,
                onu: false, ups: false, escalera: false,
                casco: false, luces: false, herramientas: false
            })

        } catch (error) {
            console.error(error)
            toast.error("Error al registrar entrada: " + (error as Error).message)
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

        // vehiculos is an object in Reporte type based on our interface, but Supabase may return an array if not 1:1 strictly enforced in types
        // @ts-ignore
        const vData = reporteOriginal.vehiculos
        const vehiculo = Array.isArray(vData) ? vData[0] : vData

        const vehiculoNombre = vehiculo ? vehiculo.modelo : 'Desconocido'
        const kmRecorrido = Number(entradaData.km_entrada) - Number(reporteOriginal.km_salida)

        const isMoto = vehiculo?.codigo?.startsWith('M-') || vehiculo?.tipo === 'Moto' || vehiculo?.modelo?.toLowerCase().includes('moto') || false

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

        if (reporteOriginal.departamento === 'Instalación' && !isMoto) {
            msg += `\n*Equipos Asignados:*\n`
            msg += `ONU/Router: ${check(entradaData.onu_entrada)}\n`
            msg += `Mini-UPS: ${check(entradaData.ups_entrada)}\n`
            msg += `Escalera: ${check(entradaData.escalera_entrada)}\n`
        }

        if (activeFaults.length > 0) {
            msg += `\n*Fallas Pendientes (Anteriores):*\n`
            activeFaults.forEach(f => msg += `⚠️ ${f.descripcion.replace('[Reporte Salida] ', '').replace('[Reporte Entrada] ', '')}\n`)
        }

        if (faultsToAdd.length > 0) {
            msg += `\n*Nuevas Fallas Reportadas:*\n`
            faultsToAdd.forEach(f => msg += `❌ ${f}\n`)
        }

        return msg
    }

    // Helpers conditions
    // Note: In Entrada, we use selectedReport.vehiculos which is an object
    const v = selectedReport?.vehiculos
    const isMoto = v?.codigo?.startsWith('M-') || v?.tipo === 'Moto' || v?.modelo?.toLowerCase().includes('moto')
    const isInstalacion = selectedReport?.departamento === 'Instalación'


    return (
        <Dialog open={isOpen} onOpenChange={(open) => {
            if (!open && step === 'success') return
            onClose()
        }}>
            <DialogContent
                onInteractOutside={(e) => {
                    if (step === 'success') e.preventDefault()
                }}
                onEscapeKeyDown={(e) => {
                    if (step === 'success') e.preventDefault()
                }}
                className="sm:max-w-xl rounded-[32px] border-none shadow-2xl max-h-[90vh] flex flex-col p-0 focus:outline-none bg-zinc-50 overflow-hidden"
            >

                {step === 'success' ? (
                    <div className="p-8 flex flex-col items-center justify-center text-center space-y-6 bg-white h-full min-h-[400px]">
                        <div className="h-20 w-20 bg-green-100 rounded-full flex items-center justify-center text-green-600 animate-in zoom-in spin-in-3">
                            <CheckCircle size={40} />
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-2xl font-bold text-slate-900">¡Entrada Registrada!</h2>
                            <p className="text-slate-500 text-sm">El vehículo ha sido recibido correctamente.</p>
                        </div>

                        <div className="w-full space-y-3 pt-4">
                            <Button
                                onClick={() => window.location.href = `https://wa.me/?text=${encodeURIComponent(whatsappText)}`}
                                className="w-full h-14 bg-[#25D366] hover:bg-[#128C7E] text-white rounded-2xl font-bold text-lg shadow-lg shadow-green-500/20 active:scale-95 transition-all"
                            >
                                <Send size={24} className="mr-2" />
                                Reportar en WhatsApp
                            </Button>
                            <Button onClick={onClose} variant="ghost" className="w-full text-slate-400">
                                Cerrar y Volver
                            </Button>
                        </div>
                    </div>
                ) : (
                    <>
                        <DialogHeader className="bg-white p-6 pb-4 border-b border-zinc-100">
                            <DialogTitle className="text-2xl font-bold text-center">Registrar Entrada</DialogTitle>
                            <DialogDescription className="text-center">Cierre de ruta y novedades</DialogDescription>
                        </DialogHeader>

                        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
                            {/* Basic Info */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2 col-span-2">
                                    <VehicleSelector
                                        vehicles={reportes.map(r => ({
                                            id: r.vehiculo_id,
                                            placa: r.vehiculos.placa,
                                            modelo: r.vehiculos.modelo,
                                            codigo: r.vehiculos.codigo,
                                            tipo: r.vehiculos.tipo,
                                            // Custom property to show driver name in the selector if needed? 
                                            // The selector standardizes display. 
                                            // If we want to show driver, we might need to extend VehicleSelector or just accept mapped data.
                                            // But standard is Model - Plate (Code). Driver isn't in standard selector yet.
                                            // Let's stick to standard for now as requested "standardize".
                                        }))}
                                        selectedVehicleId={selectedReport?.vehiculo_id}
                                        onSelect={(v) => {
                                            if (v) {
                                                // Find report for this vehicle
                                                const r = reportes.find(rep => rep.vehiculo_id === v.id)
                                                if (r) handleReportChange(r.id)
                                            } else {
                                                setReporteId("")
                                                setSelectedReport(null)
                                                setActiveFaults([]) // Clear active faults if no vehicle selected
                                            }
                                        }}
                                        label="Vehículo en Ruta"
                                    />
                                    {selectedReport && (
                                        <div className="mt-2">
                                            {/* [NEW] Odometer Warning */}
                                            {(selectedReport.vehiculos as any)?.odometro_averiado && (
                                                <div className="mb-2 bg-yellow-50 border border-yellow-200 rounded-lg p-2.5 flex items-start gap-2">
                                                    <AlertTriangle size={16} className="text-yellow-600 shrink-0 mt-0.5" />
                                                    <div>
                                                        <p className="text-xs font-bold text-yellow-700">⚠️ Odómetro Averiado</p>
                                                        <p className="text-[10px] text-yellow-600/90 leading-tight">
                                                            Se permite ingresar el mismo kilometraje de salida.
                                                        </p>
                                                    </div>
                                                </div>
                                            )}
                                            <p className="text-xs text-zinc-500 text-right">
                                                Conductor: {selectedReport.conductor} • Salida: {selectedReport.km_salida.toLocaleString()} km
                                            </p>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-2 col-span-2">
                                    <Label>Kilometraje Llegada</Label>
                                    <Input
                                        type="number"
                                        value={kmEntrada}
                                        onChange={e => setKmEntrada(e.target.value)}
                                        className="h-12 rounded-xl bg-white"
                                        placeholder={selectedReport ? `> ${selectedReport.km_salida}` : "0"}
                                    />
                                </div>

                                <div className="space-y-2 col-span-2">
                                    <Label>Nivel de Gasolina</Label>
                                    <div className="flex gap-1 h-12 bg-zinc-100 p-1 rounded-xl">
                                        {["Full", "3/4", "1/2", "1/4", "Reserva"].map((level) => (
                                            <button
                                                key={level}
                                                type="button"
                                                onClick={() => setGasolina(level)}
                                                className={`flex-1 rounded-lg text-xs font-bold transition-all ${gasolina === level
                                                    ? "bg-white text-black shadow-sm"
                                                    : "text-zinc-400 hover:text-zinc-600"
                                                    }`}
                                            >
                                                {level === "Reserva" ? "Res" : level}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Checks section */}
                            <div className="bg-white p-5 rounded-[24px] border border-zinc-100 shadow-sm space-y-6">

                                {/* TÉCNICO */}
                                <div>
                                    <h4 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                        Chequeo Técnico (Llegada)
                                    </h4>
                                    <div className="grid grid-cols-1 gap-3">
                                        <div className="flex items-center justify-between p-3 rounded-2xl bg-zinc-50 border border-transparent hover:border-zinc-200 transition-all">
                                            <Label htmlFor="aceite" className="text-sm font-medium text-zinc-700 cursor-pointer">Nivel de Aceite</Label>
                                            <Switch id="aceite" checked={checks.aceite} onCheckedChange={() => toggleCheck('aceite')} />
                                        </div>
                                        {!isMoto && (
                                            <div className="flex items-center justify-between p-3 rounded-2xl bg-zinc-50 border border-transparent hover:border-zinc-200 transition-all">
                                                <Label htmlFor="agua" className="text-sm font-medium text-zinc-700 cursor-pointer">Agua / Refrigerante</Label>
                                                <Switch id="agua" checked={checks.agua} onCheckedChange={() => toggleCheck('agua')} />
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
                                        <div className="grid grid-cols-1 gap-3">
                                            <div className="flex items-center justify-between p-3 rounded-2xl bg-zinc-50 border border-transparent hover:border-zinc-200 transition-all">
                                                <Label htmlFor="gato" className="text-sm font-medium text-zinc-700 cursor-pointer">Gato Hidráulico</Label>
                                                <Switch id="gato" checked={checks.gato} onCheckedChange={() => toggleCheck('gato')} />
                                            </div>
                                            <div className="flex items-center justify-between p-3 rounded-2xl bg-zinc-50 border border-transparent hover:border-zinc-200 transition-all">
                                                <Label htmlFor="cruz" className="text-sm font-medium text-zinc-700 cursor-pointer">Llave Cruz</Label>
                                                <Switch id="cruz" checked={checks.cruz} onCheckedChange={() => toggleCheck('cruz')} />
                                            </div>
                                            <div className="flex items-center justify-between p-3 rounded-2xl bg-zinc-50 border border-transparent hover:border-zinc-200 transition-all">
                                                <Label htmlFor="triangulo" className="text-sm font-medium text-zinc-700 cursor-pointer">Triángulo</Label>
                                                <Switch id="triangulo" checked={checks.triangulo} onCheckedChange={() => toggleCheck('triangulo')} />
                                            </div>
                                            <div className="flex items-center justify-between p-3 rounded-2xl bg-zinc-50 border border-transparent hover:border-zinc-200 transition-all">
                                                <Label htmlFor="caucho" className="text-sm font-medium text-zinc-700 cursor-pointer">Caucho Repuesto</Label>
                                                <Switch id="caucho" checked={checks.caucho} onCheckedChange={() => toggleCheck('caucho')} />
                                            </div>
                                            <div className="flex items-center justify-between p-3 rounded-2xl bg-zinc-50 border border-transparent hover:border-zinc-200 transition-all">
                                                <Label htmlFor="carpeta" className="text-sm font-medium text-zinc-700 cursor-pointer">Carpeta / Permisos</Label>
                                                <Switch id="carpeta" checked={checks.carpeta} onCheckedChange={() => toggleCheck('carpeta')} />
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
                                        <div className="grid grid-cols-1 gap-3">
                                            <div className="flex items-center justify-between p-3 rounded-2xl bg-zinc-50 border border-transparent hover:border-zinc-200 transition-all">
                                                <Label htmlFor="casco" className="text-sm font-medium text-zinc-700 cursor-pointer">Casco</Label>
                                                <Switch id="casco" checked={checks.casco} onCheckedChange={() => toggleCheck('casco')} />
                                            </div>
                                            <div className="flex items-center justify-between p-3 rounded-2xl bg-zinc-50 border border-transparent hover:border-zinc-200 transition-all">
                                                <Label htmlFor="luces" className="text-sm font-medium text-zinc-700 cursor-pointer">Luces</Label>
                                                <Switch id="luces" checked={checks.luces} onCheckedChange={() => toggleCheck('luces')} />
                                            </div>
                                            <div className="flex items-center justify-between p-3 rounded-2xl bg-zinc-50 border border-transparent hover:border-zinc-200 transition-all">
                                                <Label htmlFor="herramientas" className="text-sm font-medium text-zinc-700 cursor-pointer">Herramientas Básicas</Label>
                                                <Switch id="herramientas" checked={checks.herramientas} onCheckedChange={() => toggleCheck('herramientas')} />
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
                                        <div className="grid grid-cols-1 gap-3">
                                            <div className="flex items-center justify-between p-3 rounded-2xl bg-zinc-50 border border-transparent hover:border-zinc-200 transition-all">
                                                <Label htmlFor="onu" className="text-sm font-medium text-zinc-700 cursor-pointer">ONU / Router</Label>
                                                <Switch id="onu" checked={checks.onu} onCheckedChange={() => toggleCheck('onu')} />
                                            </div>
                                            <div className="flex items-center justify-between p-3 rounded-2xl bg-zinc-50 border border-transparent hover:border-zinc-200 transition-all">
                                                <Label htmlFor="ups" className="text-sm font-medium text-zinc-700 cursor-pointer">Mini-UPS</Label>
                                                <Switch id="ups" checked={checks.ups} onCheckedChange={() => toggleCheck('ups')} />
                                            </div>
                                            <div className="flex items-center justify-between p-3 rounded-2xl bg-zinc-50 border border-transparent hover:border-zinc-200 transition-all">
                                                <Label htmlFor="escalera" className="text-sm font-medium text-zinc-700 cursor-pointer">Escalera</Label>
                                                <Switch id="escalera" checked={checks.escalera} onCheckedChange={() => toggleCheck('escalera')} />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* [NEW] Explicit Fault Reporting Section - Minimalist */}
                            <div className="bg-zinc-50/50 p-5 rounded-[24px] border border-zinc-100 space-y-4">
                                <h4 className="text-sm font-bold text-zinc-600 uppercase tracking-wider flex items-center gap-2">
                                    <AlertCircle size={16} className="text-zinc-600" />
                                    Reportar Fallas
                                </h4>

                                {/* [NEW] Active Faults Warning */}
                                {activeFaults.length > 0 && (
                                    <div className="bg-yellow-50/50 border border-yellow-100 rounded-xl p-3 mb-2">
                                        <p className="text-xs font-bold text-yellow-600 mb-2 uppercase tracking-wide">
                                            ⚠️ Ya reportado (No duplicar):
                                        </p>
                                        <ul className="space-y-1">
                                            {activeFaults.map((f, i) => (
                                                <li key={i} className="text-xs text-yellow-700/80 flex items-start gap-1">
                                                    <span>•</span>
                                                    <span className="line-clamp-1">{f.descripcion.replace('[Reporte Salida] ', '').replace('[Reporte Entrada] ', '')}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                <div className="space-y-3">
                                    <div className="flex gap-2">
                                        <Input
                                            value={newFaultText}
                                            onChange={(e) => setNewFaultText(e.target.value)}
                                            placeholder="Ej: Luz de freno quemada..."
                                            className="bg-white border-zinc-200 focus-visible:ring-zinc-400"
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault()
                                                    if (newFaultText.trim()) {
                                                        setFaultsToAdd([...faultsToAdd, newFaultText.trim()])
                                                        setNewFaultText("")
                                                    }
                                                }
                                            }}
                                        />
                                        <Button
                                            type="button"
                                            onClick={() => {
                                                if (newFaultText.trim()) {
                                                    setFaultsToAdd([...faultsToAdd, newFaultText.trim()])
                                                    setNewFaultText("")
                                                }
                                            }}
                                            className="bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl aspect-square p-0 w-12 shrink-0"
                                        >
                                            <Plus size={20} />
                                        </Button>
                                    </div>

                                    {/* Fault List */}
                                    {faultsToAdd.length > 0 && (
                                        <div className="space-y-2">
                                            {faultsToAdd.map((fault, idx) => (
                                                <div key={idx} className="flex items-center justify-between bg-white p-3 rounded-xl border border-zinc-100 shadow-sm animate-in slide-in-from-top-1">
                                                    <span className="text-sm font-medium text-zinc-700">{fault}</span>
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        onClick={() => setFaultsToAdd(prev => prev.filter((_, i) => i !== idx))}
                                                        className="h-8 w-8 text-zinc-400 hover:text-red-500 hover:bg-red-50"
                                                    >
                                                        <Trash2 size={16} />
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Removed "Notas Adicionales" section */}
                            {/* <div className="space-y-2">
                                <Label className="text-zinc-500">Notas Adicionales (No genera falla)</Label>
                                <Textarea
                                    value={observaciones}
                                    onChange={e => setObservaciones(e.target.value)}
                                    className="bg-white py-3 min-h-[80px]"
                                    placeholder="Detalle cualquier novedad encontrada..."
                                />
                            </div> */}
                        </div>

                        <DialogFooter className="bg-white p-4 border-t border-zinc-100 flex-col sm:flex-col gap-2">
                            <Button onClick={handleSubmit} disabled={loading} className="w-full h-12 rounded-xl bg-black text-white hover:bg-zinc-800 text-lg shadow-lg shadow-black/10">
                                {loading ? "Registrando..." : "Confirmar Entrada"}
                            </Button>
                            <Button variant="ghost" onClick={onClose} className="w-full rounded-xl">
                                Cancelar
                            </Button>
                        </DialogFooter>
                    </>
                )}
            </DialogContent>
        </Dialog >
    )
}
