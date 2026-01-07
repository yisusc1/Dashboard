"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { MessageSquare, Send, Plus, Trash2, SlidersHorizontal } from "lucide-react"
import { toast } from "sonner"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type Props = {
    profile: any
    stock: any
    todaysInstallations: any[]
    activeClients: any[]
}

// Helper: safe number parse
const parseNum = (val: any) => parseFloat(String(val).replace(/[^0-9.]/g, '')) || 0

export function TechnicianReportDialog({ profile, stock, todaysInstallations, activeClients }: Props) {
    const [open, setOpen] = useState(false)

    // --- FORM STATE ---
    const [statusOnus, setStatusOnus] = useState("Panel 04")
    const [onuSerials, setOnuSerials] = useState("")
    const [routerSerials, setRouterSerials] = useState("")

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
            calculateInitialValues()
        }
    }, [open])

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
                    // Find current remaining from stock object?
                    // Stock key is tricky "CARRETE-XXX__SERIAL". Need to find it.
                    const stockKey = Object.keys(stock).find(k => k.includes(c.codigo_carrete))
                    const rem = stockKey ? stock[stockKey].quantity : 0

                    detectedSpools[c.codigo_carrete] = {
                        serial: c.codigo_carrete,
                        used: 0,
                        remaining: rem // Stock is current live remaining usually
                    }
                }
                const u = parseNum(c.metraje_usado)
                const w = parseNum(c.metraje_desechado)
                detectedSpools[c.codigo_carrete].used += (u + w)
            }
        })

        // If detected spools empty, add one empty row if available spools exist
        let initSpools = Object.values(detectedSpools)
        if (initSpools.length === 0 && availableSpools.length > 0) {
            // We don't auto-add to keep clean unless they used one.
        }
        setSpools(initSpools)
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

    // --- GENERATOR ---
    function generateAndSend() {
        const teamName = profile.team?.name || "Sin Equipo"
        const partner = profile.team?.profiles?.find((p: any) => p.id !== profile.id)

        let t = `*Reporte De Entrada ${teamName}*\n`
        t += `*Fecha: ${new Date().toLocaleDateString("es-ES")}*\n`
        t += `*Nombre De Instaladores:* ${profile.first_name} ${profile.last_name}`
        if (partner) t += ` y ${partner.first_name} ${partner.last_name}`
        t += `\n\n`

        t += `*Estatus ONUS:* ${statusOnus}\n\n`

        // Count lines in manual entry or default 0
        const onuLines = onuSerials.split('\n').filter(x => x.trim().length > 0)
        t += `*ONUS:* ${String(onuLines.length).padStart(2, '0')}\n\n`
        if (onuSerials) t += `${onuSerials}\n\n`
        else t += `(Sin seriales reportados)\n\n`

        const routerLines = routerSerials.split('\n').filter(x => x.trim().length > 0)
        t += `*ROUTER:* ${String(routerLines.length).padStart(2, '0')}\n\n`
        if (routerSerials) t += `${routerSerials}\n\n`
        else t += `(Sin seriales reportados)\n\n`

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

                    {/* SECTION: STATUS */}
                    <section className="space-y-3">
                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider ml-1">
                            <SlidersHorizontal size={14} /> Estado General
                        </div>
                        <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100">
                            <div className="p-4 border-b border-slate-50 last:border-0">
                                <Label className="text-xs text-slate-500 mb-1.5 block">Estatus ONUs</Label>
                                <Input
                                    className="border-0 bg-slate-50 rounded-xl h-10 font-medium"
                                    value={statusOnus}
                                    onChange={e => setStatusOnus(e.target.value)}
                                />
                            </div>
                        </div>
                    </section>

                    {/* SECTION: SERIALS */}
                    <section className="space-y-3">
                        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider ml-1">Seriales Restantes</div>
                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                                <Label className="text-xs font-bold text-slate-900 mb-2 block flex justify-between">
                                    ONUs
                                    <span className="text-slate-400 font-normal">{onuSerials.split('\n').filter(x => x.trim()).length}</span>
                                </Label>
                                <Textarea
                                    placeholder="Pegar seriales ONU aquí..."
                                    value={onuSerials}
                                    onChange={e => setOnuSerials(e.target.value)}
                                    className="bg-slate-50 border-0 rounded-xl min-h-[120px] font-mono text-sm resize-none focus-visible:ring-1"
                                />
                            </div>
                            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                                <Label className="text-xs font-bold text-slate-900 mb-2 block flex justify-between">
                                    Routers
                                    <span className="text-slate-400 font-normal">{routerSerials.split('\n').filter(x => x.trim()).length}</span>
                                </Label>
                                <Textarea
                                    placeholder="Pegar seriales Router aquí..."
                                    value={routerSerials}
                                    onChange={e => setRouterSerials(e.target.value)}
                                    className="bg-slate-50 border-0 rounded-xl min-h-[120px] font-mono text-sm resize-none focus-visible:ring-1"
                                />
                            </div>
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
