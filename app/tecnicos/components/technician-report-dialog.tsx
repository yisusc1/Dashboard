"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MessageSquare, Send, Plus, Trash2, SlidersHorizontal, Car } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { saveTechnicianReport, getTechnicianReport } from "@/app/tecnicos/actions"
import { toast } from "sonner"

type Props = {
    profile: any
    stock: any
    todaysInstallations: any[]
    activeClients: any[]
    vehicles: any[]
}

// Helper: safe number parse
const parseNum = (val: any) => parseFloat(String(val).replace(/[^0-9.]/g, '')) || 0

export function TechnicianReportDialog({ profile, stock, todaysInstallations, activeClients, vehicles }: Props) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)

    // --- FORM STATE ---
    const [selectedVehicle, setSelectedVehicle] = useState("")

    // Dynamic Serials
    const [onuCount, setOnuCount] = useState<number>(0)
    const [onuSerials, setOnuSerials] = useState<string[]>([])

    const [routerCount, setRouterCount] = useState<number>(0)
    const [routerSerials, setRouterSerials] = useState<string[]>([])

    // Materials
    const [materials, setMaterials] = useState({
        conectores_used: 0,
        conectores_remaining: 0,
        conectores_defective: 0,
        tensores_used: 0,
        patchcords_used: 0,
        rosetas_used: 0
    })

    // Spools (Dynamic Array)
    type SpoolEntry = { serial: string, used: number, remaining: number }
    const [spools, setSpools] = useState<SpoolEntry[]>([])

    // Available Spools (from Stock) for Dropdown
    const availableSpools = Object.keys(stock)
        .filter(k => k.includes("CARRETE"))
        .map(k => {
            const parts = k.split("__")
            return parts[1] || parts[0]
        })

    useEffect(() => {
        if (open) {
            loadExistingData()
        }
    }, [open])

    async function loadExistingData() {
        setLoading(true)
        try {
            // 1. Try to get saved report from DB
            const saved = await getTechnicianReport()
            if (saved) {
                // Populate from DB
                setSelectedVehicle(saved.vehicle_id || "")

                // Serials
                const onus = Array.isArray(saved.onu_serials) ? saved.onu_serials : []
                setOnuCount(onus.length)
                setOnuSerials(onus)

                const routers = Array.isArray(saved.router_serials) ? saved.router_serials : []
                setRouterCount(routers.length)
                setRouterSerials(routers)

                // Materials
                if (saved.materials) setMaterials(saved.materials)

                // Spools
                if (saved.spools) setSpools(saved.spools)

            } else {
                // 2. Fallback to Auto-Calculation (First time)
                calculateInitialValues()
            }
        } catch (e) {
            console.error(e)
            calculateInitialValues()
        } finally {
            setLoading(false)
        }
    }

    // Resize Serial Arrays when Count Changes
    useEffect(() => {
        setOnuSerials(prev => {
            const arr = [...prev]
            if (onuCount > arr.length) return [...arr, ...Array(onuCount - arr.length).fill("")]
            return arr.slice(0, onuCount)
        })
    }, [onuCount])

    useEffect(() => {
        setRouterSerials(prev => {
            const arr = [...prev]
            if (routerCount > arr.length) return [...arr, ...Array(routerCount - arr.length).fill("")]
            return arr.slice(0, routerCount)
        })
    }, [routerCount])


    function calculateInitialValues() {
        // A. Materials
        let c_used = 0, t_used = 0, p_used = 0, r_used = 0

        todaysInstallations.forEach((c: any) => {
            c_used += parseInt(String(c.conectores || 0).replace(/\D/g, '')) || 0
            t_used += parseInt(String(c.tensores || 0).replace(/\D/g, '')) || 0
            if (c.patchcord === 'Si' || c.patchcord === true) p_used++
            if (c.rosetas === 'Si' || c.rosetas === true) r_used++
        })

        const c_remaining = activeStockQuantity(stock, "CONV")

        setMaterials({
            conectores_used: c_used,
            conectores_remaining: c_remaining,
            conectores_defective: 0,
            tensores_used: t_used,
            patchcords_used: p_used,
            rosetas_used: r_used
        })

        // B. Spools (Auto-detect usage)
        const detectedSpools: Record<string, SpoolEntry> = {}

        todaysInstallations.forEach((c: any) => {
            if (c.codigo_carrete && availableSpools.includes(c.codigo_carrete)) {
                if (!detectedSpools[c.codigo_carrete]) {
                    const stockKey = Object.keys(stock).find(k => k.includes(c.codigo_carrete))
                    const rem = stockKey ? stock[stockKey].quantity : 0

                    detectedSpools[c.codigo_carrete] = {
                        serial: c.codigo_carrete,
                        used: 0,
                        remaining: rem
                    }
                }
                const u = parseNum(c.metraje_usado)
                const w = parseNum(c.metraje_desechado)
                detectedSpools[c.codigo_carrete].used += (u + w)
            }
        })

        setSpools(Object.values(detectedSpools))
    }

    function activeStockQuantity(stockObj: any, keyMap: string) {
        let q = 0
        Object.keys(stockObj).forEach(k => {
            if (k.includes(keyMap)) q += stockObj[k].quantity
        })
        return q
    }

    // --- ACTIONS ---
    function addSpool() {
        setSpools([...spools, { serial: "", used: 0, remaining: 0 }])
    }

    function removeSpool(index: number) {
        const n = [...spools]
        n.splice(index, 1)
        setSpools(n)
    }

    function updateSpool(index: number, field: keyof SpoolEntry, val: any) {
        const n = [...spools]
        // @ts-ignore
        n[index][field] = val
        setSpools(n)
    }

    function updateSerial(type: 'ONU' | 'ROUTER', index: number, val: string) {
        if (type === 'ONU') {
            const arr = [...onuSerials]
            arr[index] = val
            setOnuSerials(arr)
        } else {
            const arr = [...routerSerials]
            arr[index] = val
            setRouterSerials(arr)
        }
    }

    // --- GENERATOR ---
    async function generateAndSend() {
        const teamName = profile.team?.name || "Sin Equipo"
        const partner = profile.team?.profiles?.find((p: any) => p.id !== profile.id)

        // Find vehicle model/plate if selected
        const vObj = vehicles.find(v => v.id === selectedVehicle)
        const vehicleStr = vObj ? `${vObj.modelo} (${vObj.placa})` : "No asignado"

        // 1. Save to DB (Background)
        const toastId = toast.loading("Guardando reporte...")

        const payload = {
            vehicle_id: selectedVehicle === "none" ? null : selectedVehicle,
            onu_serials: onuSerials.filter(s => s.trim().length > 0),
            router_serials: routerSerials.filter(s => s.trim().length > 0),
            materials: materials,
            spools: spools
        }

        const res = await saveTechnicianReport(payload)

        if (!res?.success) {
            toast.dismiss(toastId)
            toast.error("Error al guardar: " + res?.error)
            return // Block WhatsApp if save fails? Or allow? Better block to ensure consistency.
        }

        toast.dismiss(toastId)
        toast.success("Reporte guardado")

        // 2. Generate WhatsApp Text
        let t = `*Reporte De Entrada ${teamName}*\n`
        t += `*Fecha: ${new Date().toLocaleDateString("es-ES")}*\n`
        t += `*Nombre De Instaladores:* ${profile.first_name} ${profile.last_name}`
        if (partner) t += ` y ${partner.first_name} ${partner.last_name}`
        t += `\n\n`

        t += `*Vehículo Asignado:* ${vehicleStr}\n\n`

        t += `*ONUS:* ${String(onuSerials.length).padStart(2, '0')}\n\n`
        if (onuSerials.length > 0) {
            onuSerials.forEach(s => t += `${s}\n`)
        } else {
            t += `(Ninguna)\n`
        }
        t += `\n`

        t += `*ROUTER:* ${String(routerSerials.length).padStart(2, '0')}\n\n`
        if (routerSerials.length > 0) {
            routerSerials.forEach(s => t += `${s}\n`)
            t += `\n`
        }

        t += `*Instalaciones Asignadas No Efectuadas:* ${String(activeClients.length).padStart(2, '0')}\n\n`
        activeClients.forEach(c => {
            t += `${c.nombre}: (Pendiente)\n`
        })
        t += `\n`

        t += `*Total De Instalaciones Realizadas:* ${String(todaysInstallations.length).padStart(2, '0')}\n\n`

        t += `*Conectores Utilizados:*  ${String(materials.conectores_used).padStart(2, '0')}\n`
        t += `*Conectores  Restantes:* ${String(materials.conectores_remaining).padStart(2, '0')}\n`
        t += `*Conectores Defectuosos:* ${String(materials.conectores_defective).padStart(2, '0')}\n`
        t += `*Tensores Utilizados:* ${String(materials.tensores_used).padStart(2, '0')}\n`
        t += `*Patchcords Utilizados:* ${String(materials.patchcords_used).padStart(2, '0')}\n`
        t += `*Rosetas Utilizadas:* ${String(materials.rosetas_used).padStart(2, '0')}\n\n`

        spools.forEach(s => {
            t += `Carrete ${s.serial}\n`
            t += ` Metraje Utilizado:  ${s.used}Mts\n`
            t += `*Metraje Restante:* ${s.remaining}Mts\n\n`
        })

        const url = `https://wa.me/?text=${encodeURIComponent(t)}`
        window.open(url, '_blank')
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="w-full bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl mt-4 h-12 gap-2 shadow-sm">
                    <MessageSquare size={20} />
                    Reporte WhatsApp
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl w-full max-h-[90vh] overflow-y-auto rounded-[32px] bg-[#F2F2F7] p-0 border-0 outline-none">
                {/* iOS Header */}
                <div className="bg-white/80 backdrop-blur-xl sticky top-0 z-10 border-b border-slate-200/50 px-6 py-4 flex items-center justify-between">
                    <DialogTitle className="text-lg font-semibold text-slate-900">Reporte Diario</DialogTitle>
                    <Button variant="ghost" size="sm" onClick={() => generateAndSend()} className="text-blue-500 font-bold hover:bg-blue-50 hover:text-blue-600">
                        Enviar
                    </Button>
                </div>

                <div className="p-6 space-y-8">

                    {/* SECTION: VEHICLE */}
                    <section className="space-y-3">
                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider ml-1">
                            <Car size={14} /> Vehículo
                        </div>
                        <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100 p-2">
                            <Select value={selectedVehicle} onValueChange={setSelectedVehicle}>
                                <SelectTrigger className="border-0 bg-transparent h-12 text-base">
                                    <SelectValue placeholder="Seleccionar Vehículo..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {vehicles.map(v => (
                                        <SelectItem key={v.id} value={v.id}>{v.modelo} - {v.placa}</SelectItem>
                                    ))}
                                    <SelectItem value="none">Ninguno / N/A</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </section>

                    {/* SECTION: SERIALS (DYNAMIC) */}
                    <section className="space-y-6">
                        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider ml-1">Seriales Restantes</div>

                        {/* ONUS */}
                        <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 space-y-4">
                            <div className="flex justify-between items-center">
                                <Label className="font-bold text-slate-900 text-base">ONUs</Label>
                                <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-1">
                                    <span className="text-xs font-bold text-slate-500 pl-2">CANT:</span>
                                    <Input
                                        type="number"
                                        className="h-8 w-16 border-0 bg-white shadow-sm text-center font-bold"
                                        value={onuCount}
                                        onChange={e => setOnuCount(parseInt(e.target.value) || 0)}
                                    />
                                </div>
                            </div>

                            {onuCount > 0 && (
                                <div className="space-y-3 pt-2 animate-in slide-in-from-top-2 fade-in">
                                    {onuSerials.map((serial, idx) => (
                                        <div key={idx} className="flex gap-3 items-center">
                                            <span className="text-xs font-mono text-slate-300 w-6 text-right">#{idx + 1}</span>
                                            <Input
                                                placeholder={`Serial ONU ${idx + 1}`}
                                                className="bg-slate-50 border-0 rounded-xl"
                                                value={serial}
                                                onChange={e => updateSerial('ONU', idx, e.target.value)}
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* ROUTERS */}
                        <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 space-y-4">
                            <div className="flex justify-between items-center">
                                <Label className="font-bold text-slate-900 text-base">Routers</Label>
                                <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-1">
                                    <span className="text-xs font-bold text-slate-500 pl-2">CANT:</span>
                                    <Input
                                        type="number"
                                        className="h-8 w-16 border-0 bg-white shadow-sm text-center font-bold"
                                        value={routerCount}
                                        onChange={e => setRouterCount(parseInt(e.target.value) || 0)}
                                    />
                                </div>
                            </div>

                            {routerCount > 0 && (
                                <div className="space-y-3 pt-2 animate-in slide-in-from-top-2 fade-in">
                                    {routerSerials.map((serial, idx) => (
                                        <div key={idx} className="flex gap-3 items-center">
                                            <span className="text-xs font-mono text-slate-300 w-6 text-right">#{idx + 1}</span>
                                            <Input
                                                placeholder={`Serial Router ${idx + 1}`}
                                                className="bg-slate-50 border-0 rounded-xl"
                                                value={serial}
                                                onChange={e => updateSerial('ROUTER', idx, e.target.value)}
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                    </section>

                    {/* SECTION: SPOOLS */}
                    <section className="space-y-3">
                        <div className="flex items-center justify-between ml-1">
                            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Carretes Utilizados</div>
                            <Button size="sm" variant="ghost" onClick={addSpool} className="h-6 text-blue-500 hover:text-blue-600 hover:bg-blue-50 p-2 rounded-full">
                                <Plus size={16} className="mr-1" /> Añadir
                            </Button>
                        </div>

                        <div className="space-y-3">
                            {spools.map((spool, idx) => (
                                <div key={idx} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 relative group">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => removeSpool(idx)}
                                        className="absolute top-2 right-2 text-slate-300 hover:text-red-500 h-8 w-8"
                                    >
                                        <Trash2 size={16} />
                                    </Button>
                                    <div className="grid gap-4">
                                        <div>
                                            <Label className="text-xs text-slate-500 mb-1.5 block">Serial Carrete</Label>
                                            <Select value={spool.serial} onValueChange={(v) => updateSpool(idx, "serial", v)}>
                                                <SelectTrigger className="bg-slate-50 border-0 h-10 rounded-xl">
                                                    <SelectValue placeholder="Seleccionar..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {availableSpools.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                                    <SelectItem value="OTRO">Otro / Manual</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <Label className="text-xs text-slate-500 mb-1.5 block">Usado (m)</Label>
                                                <Input
                                                    type="number"
                                                    className="bg-slate-50 border-0 rounded-xl"
                                                    value={spool.used}
                                                    onChange={e => updateSpool(idx, "used", parseFloat(e.target.value) || 0)}
                                                />
                                            </div>
                                            <div>
                                                <Label className="text-xs text-slate-500 mb-1.5 block">Restante (m)</Label>
                                                <Input
                                                    type="number"
                                                    className="bg-slate-50 border-0 rounded-xl font-bold text-slate-700"
                                                    value={spool.remaining}
                                                    onChange={e => updateSpool(idx, "remaining", parseFloat(e.target.value) || 0)}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {spools.length === 0 && (
                                <div className="text-center p-6 bg-slate-100/50 rounded-2xl border border-dashed border-slate-200">
                                    <p className="text-sm text-slate-400">Ningún carrete añadido</p>
                                </div>
                            )}
                        </div>
                    </section>

                    {/* SECTION: MATERIALS */}
                    <section className="space-y-3">
                        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider ml-1">Consumo de Materiales</div>
                        <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100 divide-y divide-slate-50">

                            {/* Connectors Row */}
                            <div className="p-4 grid grid-cols-3 gap-4">
                                <div className="col-span-3 pb-1"><Label className="font-bold text-slate-700">Conectores</Label></div>
                                <div>
                                    <Label className="text-[10px] text-slate-400 uppercase mb-1 block">Usados</Label>
                                    <Input
                                        type="number" className="bg-blue-50/50 border-0 text-blue-700 font-bold rounded-xl"
                                        value={materials.conectores_used}
                                        onChange={e => setMaterials({ ...materials, conectores_used: parseFloat(e.target.value) || 0 })}
                                    />
                                </div>
                                <div>
                                    <Label className="text-[10px] text-slate-400 uppercase mb-1 block">Restantes</Label>
                                    <Input
                                        type="number" className="bg-slate-50 border-0 rounded-xl"
                                        value={materials.conectores_remaining}
                                        onChange={e => setMaterials({ ...materials, conectores_remaining: parseFloat(e.target.value) || 0 })}
                                    />
                                </div>
                                <div>
                                    <Label className="text-[10px] text-slate-400 uppercase mb-1 block">Defectuosos</Label>
                                    <Input
                                        type="number" className="bg-red-50/50 border-0 text-red-600 font-bold rounded-xl"
                                        value={materials.conectores_defective}
                                        onChange={e => setMaterials({ ...materials, conectores_defective: parseFloat(e.target.value) || 0 })}
                                    />
                                </div>
                            </div>

                            {/* Others */}
                            <div className="p-4 grid grid-cols-3 gap-4">
                                <div>
                                    <Label className="text-[10px] text-slate-400 uppercase mb-1 block">Tensores</Label>
                                    <Input
                                        type="number" className="bg-slate-50 border-0 rounded-xl"
                                        value={materials.tensores_used}
                                        onChange={e => setMaterials({ ...materials, tensores_used: parseFloat(e.target.value) || 0 })}
                                    />
                                </div>
                                <div>
                                    <Label className="text-[10px] text-slate-400 uppercase mb-1 block">Patchcords</Label>
                                    <Input
                                        type="number" className="bg-slate-50 border-0 rounded-xl"
                                        value={materials.patchcords_used}
                                        onChange={e => setMaterials({ ...materials, patchcords_used: parseFloat(e.target.value) || 0 })}
                                    />
                                </div>
                                <div>
                                    <Label className="text-[10px] text-slate-400 uppercase mb-1 block">Rosetas</Label>
                                    <Input
                                        type="number" className="bg-slate-50 border-0 rounded-xl"
                                        value={materials.rosetas_used}
                                        onChange={e => setMaterials({ ...materials, rosetas_used: parseFloat(e.target.value) || 0 })}
                                    />
                                </div>
                            </div>
                        </div>
                    </section>

                    <Button onClick={generateAndSend} className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white font-bold h-14 rounded-2xl shadow-lg shadow-green-500/20 text-lg">
                        <Send className="mr-2" /> Enviar Reporte por WhatsApp
                    </Button>
                    <p className="text-center text-xs text-slate-400 px-4">
                        Al enviar, se abrirá WhatsApp con el formato listo para compartir.
                    </p>

                </div>
            </DialogContent>
        </Dialog>
    )
}
