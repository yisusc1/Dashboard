"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { CheckCircle, Send } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { VehicleSelector, Vehicle } from "@/components/vehicle-selector"

// Use Vehicle type from component but extend if needed or just use it
// The local type had 'department', let's extend
interface Vehiculo extends Vehicle {
    department?: string
}

type SalidaFormDialogProps = {
    isOpen: boolean
    onClose: () => void
    initialVehicleId?: string
    onSuccess?: () => void
}

export function SalidaFormDialog({ isOpen, onClose, initialVehicleId, onSuccess }: SalidaFormDialogProps) {
    const [loading, setLoading] = useState(false)
    const [step, setStep] = useState<'form' | 'success'>('form')
    const [whatsappText, setWhatsappText] = useState("")

    // Form State
    const [vehiculos, setVehiculos] = useState<Vehiculo[]>([])
    const [vehiculoId, setVehiculoId] = useState("")
    const [selectedVehicle, setSelectedVehicle] = useState<Vehiculo | null>(null)
    const [kmSalida, setKmSalida] = useState("")
    const [conductor, setConductor] = useState("")
    const [departamento, setDepartamento] = useState("")
    const [gasolina, setGasolina] = useState("Full")
    const [observaciones, setObservaciones] = useState("")
    const [lastKm, setLastKm] = useState<number | null>(null)

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

    const router = useRouter()

    useEffect(() => {
        if (isOpen) {
            setStep('form') // Reset step on open
            loadVehicles().then((loadedVehicles) => {
                if (initialVehicleId && loadedVehicles) {
                    const found = loadedVehicles.find(v => v.id === initialVehicleId)
                    if (found) handleVehicleChange(found)
                }
            })
        }
    }, [isOpen, initialVehicleId])

    async function loadVehicles() {
        const supabase = createClient()

        // 1. Get User Profile
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return []

        const { data: profile } = await supabase
            .from('profiles')
            .select('department, roles, first_name, last_name') // [UPDATED] Fetch names
            .eq('id', user.id)
            .single()

        const userDept = profile?.department

        // [NEW] Auto-fill Conductor Name
        if (profile?.first_name || profile?.last_name) {
            const fullName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
            setConductor(fullName)
        }

        // 2. Get Vehicles
        const { data: allVehicles } = await supabase.from('vehiculos').select('*').order('codigo')
        const { data: busyReports } = await supabase.from('reportes').select('vehiculo_id').is('km_entrada', null)
        const { data: kData } = await supabase.from('vista_ultimos_kilometrajes').select('*')

        const busyIds = new Set(busyReports?.map(r => r.vehiculo_id))

        const available = allVehicles?.filter(v => {
            if (busyIds.has(v.id)) return false

            // Filter by department if set
            if (v.department && userDept) {
                return v.department === userDept
            }

            if (!v.department) return true

            return false
        }).map(v => ({
            ...v,
            kilometraje: kData?.find(k => k.vehiculo_id === v.id)?.ultimo_kilometraje || 0
        })) || []

        setVehiculos(available)

        // Auto-select department in form if user has one
        if (userDept) setDepartamento(userDept)

        return available
    }

    async function handleVehicleChange(selected: Vehicle | null) {
        if (!selected) {
            setVehiculoId("")
            setSelectedVehicle(null)
            setLastKm(null)
            return
        }

        const value = selected.id
        setVehiculoId(value)
        // @ts-ignore
        setSelectedVehicle(selected)

        const supabase = createClient()
        // Keep legacy logic for lastKm validation just in case
        const { data } = await supabase
            .from('reportes')
            .select('km_entrada')
            .eq('vehiculo_id', value)
            .not('km_entrada', 'is', null)
            .order('created_at', { ascending: false })
            .limit(1)
            .single()

        if (data) setLastKm(data.km_entrada)
        else setLastKm(selected.kilometraje || 0) // Fallback to current mileage if no report found
    }

    const toggleCheck = (key: keyof typeof checks) => {
        setChecks(prev => ({ ...prev, [key]: !prev[key] }))
    }

    async function handleSubmit() {
        if (!vehiculoId || !kmSalida || !conductor || !departamento) {
            toast.error("Complete todos los campos obligatorios")
            return
        }

        const km = parseInt(kmSalida)
        if (lastKm !== null && km < lastKm) {
            toast.error(`El kilometraje no puede ser menor al anterior (${lastKm} km)`)
            return
        }

        setLoading(true)
        try {
            const supabase = createClient()
            const { error } = await supabase
                .from('reportes')
                .insert({
                    vehiculo_id: vehiculoId,
                    km_salida: km,
                    conductor,
                    departamento,
                    gasolina_salida: gasolina,
                    observaciones_salida: observaciones,

                    aceite_salida: checks.aceite,
                    agua_salida: checks.agua,

                    // Car specific
                    gato_salida: checks.gato,
                    cruz_salida: checks.cruz,
                    triangulo_salida: checks.triangulo,
                    caucho_salida: checks.caucho,
                    carpeta_salida: checks.carpeta,

                    // Moto specific
                    casco_salida: checks.casco,
                    luces_salida: checks.luces,
                    herramientas_salida: checks.herramientas,

                    onu_salida: checks.onu ? 1 : 0,
                    ups_salida: checks.ups ? 1 : 0,
                    escalera_salida: checks.escalera,

                    created_at: new Date().toISOString()
                })

            if (error) throw error

            // [NEW] Update Vehicle Fuel Level on Checkout
            const fuelMap: Record<string, number> = {
                "Full": 100,
                "3/4": 75,
                "1/2": 50,
                "1/4": 25,
                "Reserva": 10
            }
            const fuelLevel = fuelMap[gasolina] || 0

            await supabase.from('vehiculos').update({
                current_fuel_level: fuelLevel,
                kilometraje: km,
                last_fuel_update: new Date().toISOString()
            }).eq('id', vehiculoId)

            toast.success("Salida registrada correctamente")

            // --- WhatsApp Integration ---
            const text = formatSalidaText({
                km_salida: km,
                conductor,
                departamento,
                gasolina_salida: gasolina,
                observaciones_salida: observaciones,
                aceite_salida: checks.aceite,
                agua_salida: checks.agua,
                gato_salida: checks.gato,
                cruz_salida: checks.cruz,
                triangulo_salida: checks.triangulo,
                caucho_salida: checks.caucho,
                carpeta_salida: checks.carpeta,
                // Moto
                casco_salida: checks.casco,
                luces_salida: checks.luces,
                herramientas_salida: checks.herramientas,

                onu_salida: checks.onu ? 1 : 0,
                ups_salida: checks.ups ? 1 : 0,
                escalera_salida: checks.escalera
            }, selectedVehicle)

            setWhatsappText(text)
            setStep('success')
            router.refresh()
            if (onSuccess) onSuccess() // [NEW] Trigger refresh in parent
            // ----------------------------

            // Reset
            setVehiculoId("")
            setSelectedVehicle(null)
            setKmSalida("")
            setConductor("")
            setDepartamento("")
            setGasolina("Full")
            setObservaciones("")
            setLastKm(null)
            setChecks({
                aceite: false, agua: false, gato: false, cruz: false,
                triangulo: false, caucho: false, carpeta: false,
                onu: false, ups: false, escalera: false,
                casco: false, luces: false, herramientas: false
            })

        } catch (error) {
            console.error(error)
            toast.error("Error al registrar salida")
        } finally {
            setLoading(false)
        }
    }

    // Helpers
    const formatSalidaText = (data: any, vehiculoObj: Vehiculo | null) => {
        const check = (val: boolean | number) => val ? '✅' : '❌'
        const vehiculoNombre = vehiculoObj ? vehiculoObj.modelo : 'Desconocido'
        const fecha = new Date().toLocaleDateString()
        const hora = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        const isMoto = vehiculoObj?.codigo?.startsWith('M-') || vehiculoObj?.tipo === 'Moto' || vehiculoObj?.modelo?.toLowerCase().includes('moto')

        let msg = `*Reporte de Salida*\n\n`
        msg += `Fecha: ${fecha}\n`
        msg += `Hora: ${hora}\n\n`

        msg += `Conductor: ${data.conductor}\n`
        msg += `Departamento: ${data.departamento}\n\n`

        msg += `Vehículo: ${vehiculoNombre}\n`
        if (vehiculoObj?.placa) msg += `Placa: ${vehiculoObj.placa}\n`
        msg += `Kilometraje (Salida): ${data.km_salida}\n`
        msg += `Nivel de Gasolina: ${data.gasolina_salida}\n\n`

        msg += `*Chequeo Técnico:*\n`
        msg += `Chequeo de Aceite: ${check(data.aceite_salida)}\n`
        if (!isMoto) msg += `Chequeo de Agua/Refrigerante: ${check(data.agua_salida)}\n`

        msg += `\n`

        if (isMoto) {
            msg += `*Seguridad (Moto):*\n`
            msg += `Casco: ${check(data.casco_salida)}\n`
            msg += `Luces: ${check(data.luces_salida)}\n`
            msg += `Herramientas: ${check(data.herramientas_salida)}\n`
        } else {
            msg += `*Seguridad:*\n`
            msg += `Gato: ${check(data.gato_salida)}\n`
            msg += `Llave Cruz: ${check(data.cruz_salida)}\n`
            msg += `Triángulo: ${check(data.triangulo_salida)}\n`
            msg += `Caucho: ${check(data.caucho_salida)}\n`
            msg += `Carpeta de Permisos: ${check(data.carpeta_salida)}\n`
        }
        msg += `\n`

        if (data.departamento === 'Instalación' && !isMoto) {
            msg += `*Equipos Asignados:*\n`
            msg += `ONU/Router: ${check(data.onu_salida)}\n`
            msg += `Mini-UPS: ${check(data.ups_salida)}\n`
            msg += `Escalera: ${check(data.escalera_salida)}\n\n`
        }

        msg += `Observaciones: ${data.observaciones_salida || 'Ninguna'}`
        return msg
    }

    // Helpers conditions
    const isMoto = selectedVehicle?.codigo?.startsWith('M-') || selectedVehicle?.tipo === 'Moto' || selectedVehicle?.modelo?.toLowerCase().includes('moto')
    const isInstalacion = departamento === 'Instalación'

    return (
        <Dialog open={isOpen} onOpenChange={(open) => {
            // Prevent closing if in success step unless explicitly closed by button
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
                            <h2 className="text-2xl font-bold text-slate-900">¡Salida Registrada!</h2>
                            <p className="text-slate-500 text-sm">El vehículo ha sido despachado correctamente.</p>
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
                            <DialogTitle className="text-2xl font-bold text-center">Registrar Salida</DialogTitle>
                            <DialogDescription className="text-center">Complete el formulario de pre-operación</DialogDescription>
                        </DialogHeader>

                        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
                            {/* Basic Info */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2 col-span-2">
                                    <VehicleSelector
                                        vehicles={vehiculos}
                                        selectedVehicleId={vehiculoId}
                                        onSelect={handleVehicleChange}
                                        label="Vehículo Disponible"
                                    />
                                    {lastKm !== null && (
                                        <p className="text-xs text-zinc-500 text-right">Anterior: {lastKm.toLocaleString()} km</p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label>Kilometraje Actual</Label>
                                    <Input
                                        type="number"
                                        value={kmSalida}
                                        onChange={e => setKmSalida(e.target.value)}
                                        className="h-12 rounded-xl bg-white"
                                        placeholder={lastKm ? `> ${lastKm}` : "0"}
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

                                <div className="space-y-2 col-span-2">
                                    <Label>Conductor (Auto-asignado)</Label>
                                    <Input
                                        value={conductor}
                                        readOnly
                                        className="h-12 rounded-xl bg-zinc-100 text-zinc-500 border-zinc-200 cursor-not-allowed focus-visible:ring-0"
                                        placeholder="Cargando identidad..."
                                    />
                                </div>

                                <div className="space-y-2 col-span-2">
                                    <Label>Departamento/Uso</Label>
                                    <Select value={departamento} onValueChange={setDepartamento}>
                                        <SelectTrigger className="h-12 rounded-xl bg-white">
                                            <SelectValue placeholder="Seleccione el destino" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Instalación">Instalación</SelectItem>
                                            <SelectItem value="Afectaciones">Afectaciones</SelectItem>
                                            <SelectItem value="Distribución">Distribución</SelectItem>
                                            <SelectItem value="Comercialización">Comercialización</SelectItem>
                                            <SelectItem value="Transporte">Transporte</SelectItem>
                                            <SelectItem value="Operaciones">Operaciones</SelectItem>
                                            <SelectItem value="Administración">Administración</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* Checks section */}
                            <div className="bg-white p-5 rounded-[24px] border border-zinc-100 shadow-sm space-y-6">

                                {/* TÉCNICO */}
                                <div>
                                    <h4 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                        Chequeo Técnico
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
                                {!isMoto && (
                                    <div>
                                        <h4 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-3 flex items-center gap-2 border-t border-zinc-100 pt-4">
                                            Seguridad y Herramientas
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
                                {isMoto && (
                                    <div>
                                        <h4 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-3 flex items-center gap-2 border-t border-zinc-100 pt-4">
                                            Seguridad Moto
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
                                {loading ? "Registrando..." : "Confirmar Salida"}
                            </Button>
                            <Button variant="ghost" onClick={onClose} className="w-full rounded-xl">
                                Cancelar
                            </Button>
                        </DialogFooter>
                    </>
                )}
            </DialogContent>
        </Dialog>
    )
}
