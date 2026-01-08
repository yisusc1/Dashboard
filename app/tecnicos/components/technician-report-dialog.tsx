"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MessageSquare, Send, Plus, Trash2, SlidersHorizontal, ArrowLeft, CheckCircle, ArrowRight } from "lucide-react"
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
    const [step, setStep] = useState<'form' | 'preview' | 'success'>('form')

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
        .filter(k => {
            // Robust check using the isSpool flag from server or fallback to name/sku
            const entry = stock[k]
            if (entry?.isSpool) return true
            return k.includes("CARRETE") || k.includes("I002")
        })
        .map(k => {
            const parts = k.split("__")
            return parts[1] || parts[0]
        })

    useEffect(() => {
        if (open) {
            setStep('form')
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

        // Sum Supports 
        todaysSupports.forEach((s: any) => {
            c_used += parseIntSafe(s.conectores)
            t_used += parseIntSafe(s.tensores)
            p_used += parseIntSafe(s.patchcord)
            r_used += parseIntSafe(s.rosetas)
        })

        // Auto-calc remaining from stock?
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

        // B. Spools (Auto-detect usage) - IMPROVED MATCHING
        const detectedSpools: Record<string, SpoolEntry> = {}

        const processUsage = (item: any) => {
            const spoolCode = item.codigo_carrete ? String(item.codigo_carrete).trim() : null

            if (spoolCode) {
                // Find matching spool in available list (loose match)
                const match = availableSpools.find(s => s.includes(spoolCode) || spoolCode.includes(s))

                if (match) {
                    if (!detectedSpools[match]) {
                        // Find initial stock remaining
                        const stockKey = Object.keys(stock).find(k => k.includes(match))
                        const rem = stockKey ? stock[stockKey].quantity : 0

                        detectedSpools[match] = {
                            serial: match,
                            used: 0,
                            remaining: rem
                        }
                    }
                    const u = parseNum(item.metraje_usado)
                    const w = parseNum(item.metraje_desechado)

                    detectedSpools[match].used += (u + w)
                    // We assume 'remaining' in stock is the starting value for the day/shift.
                    // So we subtract usage from that starting value to estimate current remaining.
                    detectedSpools[match].remaining = Math.max(0, detectedSpools[match].remaining - (u + w))
                }
            }
        }

        todaysInstallations.forEach(processUsage)
        todaysSupports.forEach(processUsage)

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
        const dateStr = new Date().toLocaleDateString("es-VE", { timeZone: "America/Caracas" })
        const timeStr = new Date().toLocaleTimeString("es-VE", { timeZone: "America/Caracas", hour: '2-digit', minute: '2-digit', hour12: true })

        const vObj = vehicles.find(v => v.id === selectedVehicle)
        const vehicleStr = vObj ? `${vObj.modelo} (${vObj.placa})` : "No asignado"

        let t = `*Reporte De Entrada ${teamName}*\n`
        t += `*Fecha:* ${dateStr}\n`
        t += `*Hora:* ${timeStr}\n`
        t += `*Nombre De Instaladores:* ${profile.first_name} ${profile.last_name}\n`
        t += `*Vehículo Asignado:* ${vehicleStr}\n\n`

        t += `*ONUS:* ${String(onuSerials.length).padStart(2, '0')}\n`
        if (onuSerials.length > 0) {
            onuSerials.forEach(s => t += `${s}\n`)
        }
        t += `\n`

        t += `*ROUTER:* ${String(routerSerials.length).padStart(2, '0')}\n`
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

    const openWhatsApp = () => {
        const text = getWhatsAppText()
        const url = `https://wa.me/?text=${encodeURIComponent(text)}`
        window.open(url, '_blank')
    }

    async function handleSave() {
        const payload = {
            vehicle_id: selectedVehicle === "none" ? null : selectedVehicle,
            onu_serials: onuSerials.filter(s => s.trim().length > 0),
            router_serials: routerSerials.filter(s => s.trim().length > 0),
            materials: materials,
            spools: spools,
            clients_snapshot: todaysInstallations.map((c: any) => ({ client: c.cliente, cedula: c.cedula || 'S/I' }))
        }

        const toastId = toast.loading("Guardando reporte...")
        const res = await saveTechnicianReport(payload)

        if (!res?.success) {
            toast.dismiss(toastId)
            toast.error("Error al guardar: " + res?.error)
            return
        }

        toast.dismiss(toastId)
        toast.success("Guardado exitoso")
        setStep('success')
    }

    // --- RENDER ---

    // 1. SUCCESS VIEW
    if (step === 'success') {
        return (
            <Dialog open={open} onOpenChange={(v) => { if (!v) window.location.reload(); setOpen(v); }}>
                <DialogContent className="max-w-md w-full rounded-[32px] p-0 border-0 bg-white">
                    <div className="p-8 flex flex-col items-center justify-center text-center space-y-6">
                        <div className="h-20 w-20 bg-green-100 rounded-full flex items-center justify-center text-green-600 animate-in zoom-in spin-in-3">
                            <CheckCircle size={40} />
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-2xl font-bold text-slate-900">¡Reporte Enviado!</h2>
                            <p className="text-slate-500 text-sm">El reporte diario se ha guardado correctamente.</p>
                        </div>

                        <div className="w-full space-y-3 pt-4">
                            <Button onClick={openWhatsApp} className="w-full h-14 bg-[#25D366] hover:bg-[#128C7E] text-white rounded-2xl font-bold text-lg shadow-lg shadow-green-500/20 active:scale-95 transition-all">
                                <Send size={24} className="mr-2" />
                                Abrir WhatsApp
                            </Button>
                            <Button onClick={() => window.location.reload()} variant="ghost" className="w-full text-slate-400">
                                Cerrar y Actualizar
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        )
    }


    // 2. PREVIEW VIEW
    if (step === 'preview') {
        const text = getWhatsAppText().replace(/\*/g, '')
        return (
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-w-md w-full max-h-[90vh] flex flex-col rounded-[32px] p-0 border-0 bg-[#F2F2F7]">
                    <div className="bg-white/80 backdrop-blur-md px-6 py-4 border-b border-slate-200 sticky top-0 flex justify-between items-center">
                        <Button onClick={() => setStep('form')} variant="ghost" size="icon" className="-ml-2"><ArrowLeft /></Button>
                        <DialogTitle className="text-base font-bold text-slate-900">Previsualización</DialogTitle>
                        <div className="w-8" />
                    </div>

                    <div className="flex-1 overflow-y-auto p-6">
                        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 text-sm font-mono text-slate-600 whitespace-pre-wrap leading-relaxed">
                            {text}
                        </div>
                    </div>

                    <div className="p-6 bg-white border-t border-slate-100">
                        <Button onClick={handleSave} className="w-full h-14 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold text-lg shadow-lg shadow-green-600/20">
                            <Send size={20} className="mr-2" /> Confirmar y Guardar
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        )
    }

    // 3. FORM VIEW
    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="w-full bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl mt-4 h-12 gap-2 shadow-sm">
                    <MessageSquare size={20} />
                    Reporte WhatsApp
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[95vw] md:max-w-2xl w-full max-h-[92vh] flex flex-col rounded-[32px] bg-[#F2F2F7] p-0 border-0 outline-none">

                {/* Header iOS Style */}
                <div className="bg-white/80 backdrop-blur-xl sticky top-0 z-50 border-b border-slate-200/50 px-6 py-4 flex items-center justify-between shrink-0">
                    <div>
                        <DialogTitle className="text-xl font-bold text-slate-900 tracking-tight">Reporte Diario</DialogTitle>
                        <p className="text-xs text-slate-500 font-medium">Verifique los datos antes de enviar</p>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto px-4 md:px-6 py-6 space-y-6">

                    {/* VEHICLE */}
                    <section className="space-y-2">
                        <Label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider pl-1">Vehículo Asignado</Label>
                        <div className="bg-white rounded-[20px] p-2 border border-slate-100 shadow-sm">
                            <Select value={selectedVehicle} onValueChange={setSelectedVehicle}>
                                <SelectTrigger className="border-0 h-11 bg-transparent font-medium text-base">
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
                        <div className="bg-white p-5 rounded-[24px] shadow-sm border border-slate-100 space-y-4">
                            <div className="flex justify-between items-center">
                                <Label className="font-bold text-slate-900 text-base">ONUs</Label>
                                <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl">
                                    <span className="text-[10px] font-bold text-slate-400 pl-2 uppercase">Cant</span>
                                    <Input type="number" className="h-9 w-14 text-center font-bold text-lg border-0 bg-white shadow-sm rounded-lg"
                                        value={onuCount} onChange={e => setOnuCount(parseInt(e.target.value) || 0)} />
                                </div>
                            </div>
                            {onuCount > 0 && <div className="space-y-3 pt-2">{onuSerials.map((s, i) => <Input key={i} value={s} onChange={e => updateSerial('ONU', i, e.target.value)} placeholder={`Serial ONU ${i + 1}`} className="bg-slate-50 border-0 rounded-xl h-11 text-base placeholder:text-slate-300" />)}</div>}
                        </div>
                        {/* Routers */}
                        <div className="bg-white p-5 rounded-[24px] shadow-sm border border-slate-100 space-y-4">
                            <div className="flex justify-between items-center">
                                <Label className="font-bold text-slate-900 text-base">Routers</Label>
                                <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl">
                                    <span className="text-[10px] font-bold text-slate-400 pl-2 uppercase">Cant</span>
                                    <Input type="number" className="h-9 w-14 text-center font-bold text-lg border-0 bg-white shadow-sm rounded-lg"
                                        value={routerCount} onChange={e => setRouterCount(parseInt(e.target.value) || 0)} />
                                </div>
                            </div>
                            {routerCount > 0 && <div className="space-y-3 pt-2">{routerSerials.map((s, i) => <Input key={i} value={s} onChange={e => updateSerial('ROUTER', i, e.target.value)} placeholder={`Serial Router ${i + 1}`} className="bg-slate-50 border-0 rounded-xl h-11 text-base placeholder:text-slate-300" />)}</div>}
                        </div>
                    </section>

                    {/* SPOOLS */}
                    <section className="space-y-3">
                        <div className="flex justify-between items-center px-1">
                            <Label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Carretes</Label>
                            <Button size="sm" variant="ghost" className="text-blue-600 hover:bg-blue-50 h-8 rounded-lg text-xs font-bold" onClick={addSpool}><Plus size={16} className="mr-1" /> Añadir</Button>
                        </div>
                        <div className="p-2 bg-yellow-100 text-xs font-mono mb-2 rounded">
                            DEBUG KEYS: {JSON.stringify(Object.keys(stock))}
                        </div>
                        {spools.map((spool, idx) => (
                            <div key={idx} className="bg-white p-4 rounded-[24px] border border-slate-100 shadow-sm space-y-4 relative">
                                <Button variant="ghost" size="icon" className="absolute top-3 right-3 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl" onClick={() => removeSpool(idx)}><Trash2 size={18} /></Button>
                                <div className="pr-10">
                                    <Label className="text-[10px] uppercase text-slate-400 font-bold ml-1">Serial Carrete</Label>
                                    <Select value={spool.serial} onValueChange={v => updateSpool(idx, 'serial', v)}>
                                        <SelectTrigger className="h-11 border-0 bg-slate-50 mt-1 rounded-xl text-base font-medium"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                                        <SelectContent>
                                            {availableSpools.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                            <SelectItem value="OTRO">Manual...</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div><Label className="text-[10px] uppercase text-blue-500 font-bold ml-1">Usado (m)</Label><Input type="number" className="bg-blue-50/50 border-blue-100 text-blue-900 mt-1 h-11 rounded-xl text-base font-bold" value={spool.used} onChange={e => updateSpool(idx, 'used', parseFloat(e.target.value))} /></div>
                                    <div><Label className="text-[10px] uppercase text-slate-400 font-bold ml-1">Restante (m)</Label><Input type="number" className="bg-slate-50 border-0 mt-1 h-11 rounded-xl text-base" value={spool.remaining} onChange={e => updateSpool(idx, 'remaining', parseFloat(e.target.value))} /></div>
                                </div>
                            </div>
                        ))}
                    </section>

                    {/* MATERIALS (Updated with Remaining) */}
                    <section className="space-y-3">
                        <Label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider pl-1">Resumen Materiales</Label>
                        <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm divide-y divide-slate-50 overflow-hidden">
                            {/* CONECTORES */}
                            <div className="p-5 grid grid-cols-3 gap-3">
                                <div className="col-span-3 font-bold text-sm text-slate-900 mb-1">Conectores</div>
                                <div><Label className="text-[9px] text-slate-400 uppercase font-bold text-center block mb-1">Usados</Label><Input type="number" className="bg-blue-50 text-blue-700 font-bold border-0 h-10 rounded-xl text-center text-base" value={materials.conectores_used} onChange={e => setMaterials({ ...materials, conectores_used: parseFloat(e.target.value) })} /></div>
                                <div><Label className="text-[9px] text-slate-400 uppercase font-bold text-center block mb-1">Restantes</Label><Input type="number" className="bg-slate-50 border-0 h-10 rounded-xl text-center text-base" value={materials.conectores_remaining} onChange={e => setMaterials({ ...materials, conectores_remaining: parseFloat(e.target.value) })} /></div>
                                <div><Label className="text-[9px] text-red-400 uppercase font-bold text-center block mb-1">Malos</Label><Input type="number" className="bg-red-50 text-red-600 font-bold border-0 h-10 rounded-xl text-center text-base" value={materials.conectores_defective} onChange={e => setMaterials({ ...materials, conectores_defective: parseFloat(e.target.value) })} /></div>
                            </div>
                            {/* TENSORES */}
                            <div className="p-5 grid grid-cols-3 gap-3">
                                <div className="col-span-3 font-bold text-sm text-slate-900 mb-1">Tensores</div>
                                <div><Label className="text-[9px] text-slate-400 uppercase font-bold text-center block mb-1">Usados</Label><Input type="number" className="bg-slate-50 border-0 h-10 rounded-xl text-center text-base" value={materials.tensores_used} onChange={e => setMaterials({ ...materials, tensores_used: parseFloat(e.target.value) })} /></div>
                                <div className="col-span-2"><Label className="text-[9px] text-slate-400 uppercase font-bold text-center block mb-1">Restantes</Label><Input type="number" className="bg-slate-50 border-0 h-10 rounded-xl text-center text-base" value={materials.tensores_remaining} onChange={e => setMaterials({ ...materials, tensores_remaining: parseFloat(e.target.value) })} /></div>
                            </div>
                            {/* PATCHCORDS */}
                            <div className="p-5 grid grid-cols-3 gap-3">
                                <div className="col-span-3 font-bold text-sm text-slate-900 mb-1">Patchcords</div>
                                <div><Label className="text-[9px] text-slate-400 uppercase font-bold text-center block mb-1">Usados</Label><Input type="number" className="bg-slate-50 border-0 h-10 rounded-xl text-center text-base" value={materials.patchcords_used} onChange={e => setMaterials({ ...materials, patchcords_used: parseFloat(e.target.value) })} /></div>
                                <div className="col-span-2"><Label className="text-[9px] text-slate-400 uppercase font-bold text-center block mb-1">Restantes</Label><Input type="number" className="bg-slate-50 border-0 h-10 rounded-xl text-center text-base" value={materials.patchcords_remaining} onChange={e => setMaterials({ ...materials, patchcords_remaining: parseFloat(e.target.value) })} /></div>
                            </div>
                            {/* ROSETAS */}
                            <div className="p-5 grid grid-cols-3 gap-3">
                                <div className="col-span-3 font-bold text-sm text-slate-900 mb-1">Rosetas</div>
                                <div className="col-span-3"><Label className="text-[9px] text-slate-400 uppercase font-bold text-center block mb-1">Utilizadas</Label><Input type="number" className="bg-slate-50 border-0 h-10 rounded-xl text-center text-base" value={materials.rosetas_used} onChange={e => setMaterials({ ...materials, rosetas_used: parseFloat(e.target.value) })} /></div>
                            </div>
                        </div>
                    </section>

                </div>

                <div className="p-4 bg-white border-t border-slate-200 shrink-0">
                    <Button onClick={() => setStep('preview')} className="w-full h-14 text-lg font-bold rounded-2xl bg-black hover:bg-zinc-800 text-white shadow-xl shadow-black/10 active:scale-[0.98] transition-all">
                        Continuar <ArrowRight className="ml-2" />
                    </Button>
                </div>

            </DialogContent>
        </Dialog>
    )
}
