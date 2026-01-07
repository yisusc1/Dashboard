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
    todaysSupports: any[]
    activeClients: any[]
    vehicles: any[]
}

// Helper: safe number parse
const parseNum = (val: any) => parseFloat(String(val).replace(/[^0-9.]/g, '')) || 0
const parseIntSafe = (val: any) => parseInt(String(val || 0).replace(/\D/g, '')) || 0

// Helper: check stock (pure function)
function activeStockQuantity(stockObj: any, keyMap: string) {
    let q = 0
    if (!stockObj) return 0
    Object.keys(stockObj).forEach(k => {
        if (k.includes(keyMap)) q += stockObj[k].quantity
    })
    return q
}

export function TechnicianReportDialog({ profile, stock, todaysInstallations, todaysSupports, activeClients, vehicles }: Props) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)

    // --- STATE ---
    const [step, setStep] = useState<'form' | 'preview'>('form')

    // Form Fields
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
        tensores_remaining: 0,
        patchcords_used: 0,
        patchcords_remaining: 0,
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
            setStep('form') // Reset to form on open
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
                // Materials - CAREFUL MERGE to preserve new keys if missing in DB
                if (saved.materials) {
                    setMaterials(prev => ({ ...prev, ...saved.materials }))
                }

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

    // Update calculateInitialValues to include new fields if possible, or just default 0
    function calculateInitialValues() {
        // A. Materials
        let c_used = 0, t_used = 0, p_used = 0, r_used = 0

        // Sum Installations
        todaysInstallations.forEach((c: any) => {
            c_used += parseIntSafe(c.conectores)
            t_used += parseIntSafe(c.tensores)
            if (c.patchcord === 'Si' || c.patchcord === true) p_used++
            if (c.rosetas === 'Si' || c.rosetas === true) r_used++
        })

        // Sum Supports (Assuming integer columns or strings)
        todaysSupports.forEach((s: any) => {
            c_used += parseIntSafe(s.conectores)
            t_used += parseIntSafe(s.tensores)
            p_used += parseIntSafe(s.patchcord) // Support uses integer count usually?
            r_used += parseIntSafe(s.rosetas)
        })

        // Auto-calc remaining from stock?
        // Stock passed is "Current System Stock".
        const c_rem = activeStockQuantity(stock, "CONV")
        const t_rem = activeStockQuantity(stock, "TENS")
        const p_rem = activeStockQuantity(stock, "PATCH1")

        setMaterials({
            conectores_used: c_used,
            conectores_remaining: c_rem > 0 ? c_rem : 0,
            conectores_defective: 0,
            tensores_used: t_used,
            tensores_remaining: t_rem > 0 ? t_rem : 0,
            patchcords_used: p_used,
            patchcords_remaining: p_rem > 0 ? p_rem : 0,
            rosetas_used: r_used
        })

        // B. Spools (Auto-detect usage)
        const detectedSpools: Record<string, SpoolEntry> = {}

        const processUsage = (item: any) => {
            if (item.codigo_carrete && availableSpools.includes(item.codigo_carrete)) {
                if (!detectedSpools[item.codigo_carrete]) {
                    const stockKey = Object.keys(stock).find(k => k.includes(item.codigo_carrete))
                    const rem = stockKey ? stock[stockKey].quantity : 0

                    detectedSpools[item.codigo_carrete] = {
                        serial: item.codigo_carrete,
                        used: 0,
                        remaining: rem
                    }
                }
                const u = parseNum(item.metraje_usado)
                const w = parseNum(item.metraje_desechado)
                // Note: Remaining in SpoolEntry should be updated?
                // Initial Remaining is Stock. We subtract usage from it?
                // Or we leave it as valid stock?
                // Let's subtract for accuracy in suggestion.
                detectedSpools[item.codigo_carrete].used += (u + w)
                // detectedSpools[item.codigo_carrete].remaining -= (u + w)
            }
        }

        todaysInstallations.forEach(processUsage)
        todaysSupports.forEach(processUsage) // Supports also use spools

        setSpools(Object.values(detectedSpools))
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

    // --- WHATSAPP GENERATOR ---
    function getWhatsAppText() {
        const teamName = profile.team?.name || "Sin Equipo"
        // Force Caracas Time
        const dateStr = new Date().toLocaleDateString("es-VE", { timeZone: "America/Caracas" })
        const timeStr = new Date().toLocaleTimeString("es-VE", { timeZone: "America/Caracas", hour: '2-digit', minute: '2-digit', hour12: true })

        const vObj = vehicles.find(v => v.id === selectedVehicle)
        const vehicleStr = vObj ? `${vObj.modelo} (${vObj.placa})` : "No asignado"

        let t = `*Reporte De Entrada ${teamName}*\n`
        t += `*Fecha:* ${dateStr}\n`
        t += `*Hora:* ${timeStr}\n`
        t += `*Nombre De Instaladores:* ${profile.first_name} ${profile.last_name}\n`
        t += `*Vehículo Asignado:* ${vehicleStr}\n\n`

        t += `*ONUS:* ${String(onuSerials.length).padStart(2, '0')}\n\n`
        if (onuSerials.length > 0) {
            onuSerials.forEach(s => t += `${s}\n`)
        }
        t += `\n`

        t += `*ROUTER:* ${String(routerSerials.length).padStart(2, '0')}\n\n`
        if (routerSerials.length > 0) {
            routerSerials.forEach(s => t += `${s}\n`)
        }
        t += `\n`

        // Total Installations
        t += `*Total De Instalaciones Realizadas:* ${String(todaysInstallations.length).padStart(2, '0')}\n\n`

        todaysInstallations.forEach((c: any) => {
            t += `${c.cliente}\n`
            t += `${c.cedula || 'S/I'}\n\n`
        })

        // Materials
        t += `*Conectores Utilizados:*  ${String(materials.conectores_used).padStart(2, '0')}\n`
        t += `*Conectores  Restantes:* ${String(materials.conectores_remaining).padStart(2, '0')}\n`
        t += `*Conectores Defectuosos:* ${String(materials.conectores_defective).padStart(2, '0')}\n`
        t += `*Tensores Utilizados:* ${String(materials.tensores_used).padStart(2, '0')}\n`
        t += `*Tensores Restantes:* ${String(materials.tensores_remaining).padStart(2, '0')}\n`
        t += `*Patchcords Utilizados:* ${String(materials.patchcords_used).padStart(2, '0')}\n`
        t += `*Patchcords Restantes:* ${String(materials.patchcords_remaining).padStart(2, '0')}\n`
        t += `*Rosetas Utilizadas:* ${String(materials.rosetas_used).padStart(2, '0')}\n\n`

        spools.forEach(s => {
            t += `Carrete: ${s.serial}\n`
            t += `Metraje Utilizado: ${s.used}\n`
            t += `Metraje Restante: ${s.remaining}\n\n`
        })

        return t
    }

    async function handleSaveAndSend() {
        const payload = {
            vehicle_id: selectedVehicle === "none" ? null : selectedVehicle,
            onu_serials: onuSerials.filter(s => s.trim().length > 0),
            router_serials: routerSerials.filter(s => s.trim().length > 0),
            materials: materials,
            spools: spools,
            // Capture Text for potential debugging or just rely on backend
        }

        const toastId = toast.loading("Guardando reporte...")
        const res = await saveTechnicianReport(payload)

        if (!res?.success) {
            toast.dismiss(toastId)
            toast.error("Error al guardar: " + res?.error)
            return
        }

        toast.dismiss(toastId)
        toast.success("Enviando WhatsApp...")

        const text = getWhatsAppText()
        const url = `https://wa.me/?text=${encodeURIComponent(text)}`
        window.open(url, '_blank')

        // Close dialog? User requested button to disappear.
        // Page refresh is triggered by save action revalidation usually?
        // Pass router refresh?
        setOpen(false)
        window.location.reload() // Force reload to ensure 'isReportSubmitted' logic hides the button immediately
    }

    const PreviewView = () => (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 font-mono text-sm text-slate-700 whitespace-pre-wrap leading-relaxed shadow-inner max-h-[60vh] overflow-y-auto">
                {getWhatsAppText().replace(/\*/g, '')}
            </div>

            <div className="grid grid-cols-2 gap-4">
                <Button variant="outline" onClick={() => setStep('form')} className="h-12 rounded-xl border-slate-300 font-bold text-slate-600">
                    <SlidersHorizontal size={18} className="mr-2" /> Editar
                </Button>
                <Button onClick={handleSaveAndSend} className="h-12 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold shadow-lg shadow-green-600/20">
                    <Send size={18} className="mr-2" /> Guardar y Enviar
                </Button>
            </div>
        </div>
    )

    // --- FORM RENDER ---
    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="w-full bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl mt-4 h-12 gap-2 shadow-sm">
                    <MessageSquare size={20} />
                    Reporte WhatsApp
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl w-full max-h-[90vh] overflow-y-auto rounded-[32px] bg-[#F2F2F7] p-0 border-0 outline-none">
                <div className="bg-white/80 backdrop-blur-xl sticky top-0 z-10 border-b border-slate-200/50 px-6 py-4 flex items-center justify-between">
                    <DialogTitle className="text-lg font-semibold text-slate-900">
                        {step === 'form' ? 'Reporte Diario (Actualizado)' : 'Vista Previa'}
                    </DialogTitle>
                </div>

                <div className="p-6">
                    {step === 'preview' ? (
                        <PreviewView />
                    ) : (
                        <div className="space-y-8">
                            {/* ... (Existing Form Sections) ... */}
                            {/* Only showing changes to Materials Section for brevity inheritance */}

                            {/* VEHICLE */}
                            <section className="space-y-3">
                                <Label className="text-xs font-semibold text-slate-400 uppercase tracking-wider ml-1">Vehículo Asignado</Label>
                                <div className="bg-white rounded-2xl p-2 border border-slate-100 shadow-sm">
                                    <Select value={selectedVehicle} onValueChange={setSelectedVehicle}>
                                        <SelectTrigger className="border-0 h-10 bg-transparent font-medium">
                                            <SelectValue placeholder="Seleccionar..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {vehicles.map(v => <SelectItem key={v.id} value={v.id}>{v.modelo} ({v.placa})</SelectItem>)}
                                            <SelectItem value="none">Ninguno</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </section>

                            {/* SERIALS */}
                            <section className="space-y-4">
                                {/* ONUs */}
                                <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 space-y-4">
                                    <div className="flex justify-between items-center">
                                        <Label className="font-bold text-slate-900">ONUs</Label>
                                        <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-lg">
                                            <span className="text-xs font-bold text-slate-500 pl-2">CANT</span>
                                            <Input type="number" className="h-8 w-16 text-center font-bold border-0 bg-white shadow-sm"
                                                value={onuCount} onChange={e => setOnuCount(parseInt(e.target.value) || 0)} />
                                        </div>
                                    </div>
                                    {onuCount > 0 && <div className="space-y-2">{onuSerials.map((s, i) => <Input key={i} value={s} onChange={e => updateSerial('ONU', i, e.target.value)} placeholder={`Serial ONU ${i + 1}`} className="bg-slate-50 border-0 rounded-xl" />)}</div>}
                                </div>
                                {/* Routers */}
                                <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 space-y-4">
                                    <div className="flex justify-between items-center">
                                        <Label className="font-bold text-slate-900">Routers</Label>
                                        <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-lg">
                                            <span className="text-xs font-bold text-slate-500 pl-2">CANT</span>
                                            <Input type="number" className="h-8 w-16 text-center font-bold border-0 bg-white shadow-sm"
                                                value={routerCount} onChange={e => setRouterCount(parseInt(e.target.value) || 0)} />
                                        </div>
                                    </div>
                                    {routerCount > 0 && <div className="space-y-2">{routerSerials.map((s, i) => <Input key={i} value={s} onChange={e => updateSerial('ROUTER', i, e.target.value)} placeholder={`Serial Router ${i + 1}`} className="bg-slate-50 border-0 rounded-xl" />)}</div>}
                                </div>
                            </section>

                            {/* SPOOLS */}
                            <section className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <Label className="text-xs font-semibold text-slate-400 uppercase tracking-wider ml-1">Carretes</Label>
                                    <Button size="sm" variant="ghost" className="text-blue-600 hover:bg-blue-50" onClick={addSpool}><Plus size={16} /> Añadir</Button>
                                </div>
                                {spools.map((spool, idx) => (
                                    <div key={idx} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-3 relative">
                                        <Button variant="ghost" size="icon" className="absolute top-2 right-2 text-slate-300 hover:text-red-500" onClick={() => removeSpool(idx)}><Trash2 size={16} /></Button>
                                        <div>
                                            <Label className="text-[10px] uppercase text-slate-400 font-bold">Serial</Label>
                                            <Select value={spool.serial} onValueChange={v => updateSpool(idx, 'serial', v)}>
                                                <SelectTrigger className="h-9 border-0 bg-slate-50 mt-1"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                                                <SelectContent>
                                                    {availableSpools.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                                    <SelectItem value="OTRO">Manual...</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div><Label className="text-[10px] uppercase text-slate-400 font-bold">Usado</Label><Input type="number" className="bg-slate-50 border-0 mt-1" value={spool.used} onChange={e => updateSpool(idx, 'used', parseFloat(e.target.value))} /></div>
                                            <div><Label className="text-[10px] uppercase text-slate-400 font-bold">Restante</Label><Input type="number" className="bg-slate-50 border-0 mt-1 font-bold" value={spool.remaining} onChange={e => updateSpool(idx, 'remaining', parseFloat(e.target.value))} /></div>
                                        </div>
                                    </div>
                                ))}
                            </section>

                            {/* MATERIALS (Updated with Remaining) */}
                            <section className="space-y-3">
                                <Label className="text-xs font-semibold text-slate-400 uppercase tracking-wider ml-1">Materiales</Label>
                                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm divide-y divide-slate-50 overflow-hidden">
                                    {/* CONECTORES */}
                                    <div className="p-4 grid grid-cols-3 gap-3">
                                        <div className="col-span-3 font-bold text-sm text-slate-800">Conectores</div>
                                        <div><Label className="text-[10px] text-slate-400 uppercase">Usados</Label><Input type="number" className="bg-blue-50 text-blue-700 font-bold border-0 mt-1 h-9 rounded-lg" value={materials.conectores_used} onChange={e => setMaterials({ ...materials, conectores_used: parseFloat(e.target.value) })} /></div>
                                        <div><Label className="text-[10px] text-slate-400 uppercase">Restantes</Label><Input type="number" className="bg-slate-50 border-0 mt-1 h-9 rounded-lg" value={materials.conectores_remaining} onChange={e => setMaterials({ ...materials, conectores_remaining: parseFloat(e.target.value) })} /></div>
                                        <div><Label className="text-[10px] text-slate-400 uppercase">Defectus.</Label><Input type="number" className="bg-red-50 text-red-600 font-bold border-0 mt-1 h-9 rounded-lg" value={materials.conectores_defective} onChange={e => setMaterials({ ...materials, conectores_defective: parseFloat(e.target.value) })} /></div>
                                    </div>
                                    {/* TENSORES */}
                                    <div className="p-4 grid grid-cols-3 gap-3">
                                        <div className="col-span-3 font-bold text-sm text-slate-800">Tensores</div>
                                        <div><Label className="text-[10px] text-slate-400 uppercase">Usados</Label><Input type="number" className="bg-slate-50 border-0 mt-1 h-9 rounded-lg" value={materials.tensores_used} onChange={e => setMaterials({ ...materials, tensores_used: parseFloat(e.target.value) })} /></div>
                                        <div className="col-span-2"><Label className="text-[10px] text-slate-400 uppercase">Restantes</Label><Input type="number" className="bg-slate-50 border-0 mt-1 h-9 rounded-lg" value={materials.tensores_remaining} onChange={e => setMaterials({ ...materials, tensores_remaining: parseFloat(e.target.value) })} /></div>
                                    </div>
                                    {/* PATCHCORDS */}
                                    <div className="p-4 grid grid-cols-3 gap-3">
                                        <div className="col-span-3 font-bold text-sm text-slate-800">Patchcords</div>
                                        <div><Label className="text-[10px] text-slate-400 uppercase">Usados</Label><Input type="number" className="bg-slate-50 border-0 mt-1 h-9 rounded-lg" value={materials.patchcords_used} onChange={e => setMaterials({ ...materials, patchcords_used: parseFloat(e.target.value) })} /></div>
                                        <div className="col-span-2"><Label className="text-[10px] text-slate-400 uppercase">Restantes</Label><Input type="number" className="bg-slate-50 border-0 mt-1 h-9 rounded-lg" value={materials.patchcords_remaining} onChange={e => setMaterials({ ...materials, patchcords_remaining: parseFloat(e.target.value) })} /></div>
                                    </div>
                                    {/* ROSETAS */}
                                    <div className="p-4 grid grid-cols-3 gap-3">
                                        <div className="col-span-3 font-bold text-sm text-slate-800">Rosetas</div>
                                        <div className="col-span-3"><Label className="text-[10px] text-slate-400 uppercase">Utilizadas</Label><Input type="number" className="bg-slate-50 border-0 mt-1 h-9 rounded-lg" value={materials.rosetas_used} onChange={e => setMaterials({ ...materials, rosetas_used: parseFloat(e.target.value) })} /></div>
                                    </div>
                                </div>
                            </section>

                            <Button onClick={() => setStep('preview')} className="w-full h-14 bg-black hover:bg-slate-900 text-white font-bold rounded-2xl text-lg shadow-lg">
                                Previsualizar Reporte
                            </Button>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
