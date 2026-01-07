"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { createSupportReport, getMySpools } from "@/app/tecnicos/actions"
import { toast } from "sonner"
import { Loader2, MapPin, Wrench, RefreshCw, Box } from "lucide-react"

// Define Props
interface SupportReportDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    clients: any[] // Pass clients for selection
}

export function SupportReportDialog({ open, onOpenChange, clients }: SupportReportDialogProps) {
    const [loading, setLoading] = useState(false)
    const [spools, setSpools] = useState<{ serial: string, label: string, remaining: number }[]>([])
    const [isSwap, setIsSwap] = useState(false)
    const [gpsLoading, setGpsLoading] = useState(false)

    // Form State
    const [formData, setFormData] = useState({
        cliente_id: "",
        causa: "",
        precinto: "",
        caja_nap: "",
        potencia: "",
        coordenadas: "",
        cantidad_puertos: "",
        puerto: "",
        zona: "",

        // Materials
        codigo_carrete: "",
        metraje_usado: "",
        metraje_desechado: "",
        conectores: "",
        tensores: "",
        patchcord: "",
        rosetas: "",

        // Swaps
        onu_anterior: "",
        onu_nueva: "",

        observacion: ""
    })

    useEffect(() => {
        if (open) {
            loadSpools()
        }
    }, [open])

    async function loadSpools() {
        const data = await getMySpools()
        setSpools(data)
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value })
    }

    const handleSelectChange = (name: string, value: string) => {
        setFormData({ ...formData, [name]: value })
    }

    const handleGps = () => {
        if (!navigator.geolocation) {
            toast.error("Geolocalización no soportada")
            return
        }
        setGpsLoading(true)
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const coords = `${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)}`
                setFormData(prev => ({ ...prev, coordenadas: coords }))
                setGpsLoading(false)
                toast.success("Coordenadas actualizadas")
            },
            (err) => {
                toast.error("Error obteniendo ubicación")
                setGpsLoading(false)
            },
            { enableHighAccuracy: true }
        )
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)

        // Validation for critical fields
        if (!formData.cliente_id || !formData.causa) {
            toast.error("Cliente y Causa son obligatorios")
            setLoading(false)
            return
        }

        const res = await createSupportReport({
            ...formData,
            fecha: new Date().toLocaleDateString('es-VE'),
            hora: new Date().toLocaleTimeString('es-VE')
        })

        if (res.success) {
            toast.success("Reporte de Soporte Guardado")
            onOpenChange(false)
            // Reset form
            setFormData({
                cliente_id: "", causa: "", precinto: "", caja_nap: "", potencia: "", coordenadas: "",
                cantidad_puertos: "", puerto: "", zona: "", codigo_carrete: "", metraje_usado: "",
                metraje_desechado: "", conectores: "", tensores: "", patchcord: "", rosetas: "",
                onu_anterior: "", onu_nueva: "", observacion: ""
            })
            setIsSwap(false)
        } else {
            toast.error(res.error)
        }
        setLoading(false)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto rounded-[24px] p-0 gap-0 border-none shadow-2xl bg-[#F2F2F7]">

                {/* Header iOS Style */}
                <div className="bg-white/90 backdrop-blur-md px-5 py-3 sticky top-0 z-10 border-b border-slate-200/60 flex items-center justify-between">
                    <div>
                        <DialogTitle className="text-lg font-bold text-slate-900 tracking-tight">Nuevo Soporte</DialogTitle>
                        <p className="text-[11px] text-slate-500 font-medium">Reporte de incidente técnico</p>
                    </div>
                    <div className="h-8 w-8 bg-orange-50 rounded-full flex items-center justify-center text-orange-500">
                        <Wrench size={16} />
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="p-4 space-y-4">

                    {/* SECTION 1: CLIENT & CAUSE */}
                    <div className="bg-white p-3.5 rounded-2xl shadow-sm border border-slate-100 space-y-3">
                        <div className="space-y-1">
                            <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Cliente</Label>
                            <Select onValueChange={(val) => handleSelectChange("cliente_id", val)} value={formData.cliente_id}>
                                <SelectTrigger className="h-10 rounded-xl bg-slate-50 border-slate-200 text-sm font-medium focus:ring-1 focus:ring-orange-200">
                                    <SelectValue placeholder="Buscar Cliente..." />
                                </SelectTrigger>
                                <SelectContent className="max-h-[250px]">
                                    {clients.map(c => (
                                        <SelectItem key={c.id} value={c.id} className="py-2.5">
                                            <div className="flex flex-col text-left">
                                                <span className="font-bold text-slate-900 text-sm">{c.cedula}</span>
                                                <span className="text-[11px] text-slate-500">{c.nombre}</span>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1">
                            <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Causa del Reporte</Label>
                            <Select onValueChange={(val) => handleSelectChange("causa", val)} value={formData.causa}>
                                <SelectTrigger className="h-10 rounded-xl bg-slate-50 border-slate-200 text-sm font-medium focus:ring-1 focus:ring-orange-200">
                                    <SelectValue placeholder="Seleccionar Motivo" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Tendido Fracturado">Tendido Fracturado</SelectItem>
                                    <SelectItem value="Cambio de Equipo (ONU/Router)">Cambio de Equipo</SelectItem>
                                    <SelectItem value="Atenuación Alta">Atenuación Alta</SelectItem>
                                    <SelectItem value="Conectores Dañados">Conectores Dañados</SelectItem>
                                    <SelectItem value="Reubicación">Reubicación</SelectItem>
                                    <SelectItem value="Otro">Otro</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* SECTION 2: TECHNICAL DETAILS */}
                    <div className="space-y-1.5">
                        <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-3">Detalles Técnicos</Label>
                        <div className="bg-white p-3.5 rounded-2xl shadow-sm border border-slate-100 grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label className="text-[10px] text-slate-400 font-bold uppercase">Precinto</Label>
                                <Input className="h-9 rounded-lg bg-slate-50 border-slate-200 font-mono text-xs" name="precinto" value={formData.precinto} onChange={handleChange} />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[10px] text-slate-400 font-bold uppercase">Caja NAP</Label>
                                <Input className="h-9 rounded-lg bg-slate-50 border-slate-200 text-xs" name="caja_nap" value={formData.caja_nap} onChange={handleChange} />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[10px] text-slate-400 font-bold uppercase">Potencia (dBm)</Label>
                                <Input className="h-9 rounded-lg bg-slate-50 border-slate-200 font-mono text-xs" name="potencia" value={formData.potencia} onChange={handleChange} />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[10px] text-slate-400 font-bold uppercase">Puerto</Label>
                                <Input className="h-9 rounded-lg bg-slate-50 border-slate-200 text-xs" name="puerto" value={formData.puerto} onChange={handleChange} />
                            </div>
                            <div className="col-span-2 space-y-1 relative">
                                <Label className="text-[10px] text-slate-400 font-bold uppercase">Coordenadas GPS</Label>
                                <div className="flex gap-2">
                                    <Input
                                        className="h-9 rounded-lg bg-slate-50 border-slate-200 font-mono text-[10px]"
                                        name="coordenadas"
                                        value={formData.coordenadas}
                                        onChange={handleChange}
                                        placeholder="Lat, Long"
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        className="h-9 w-9 rounded-lg shrink-0 border-slate-200 text-blue-600 hover:bg-blue-50"
                                        onClick={handleGps}
                                        disabled={gpsLoading}
                                    >
                                        {gpsLoading ? <Loader2 className="animate-spin h-3 w-3" /> : <MapPin size={16} />}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* SECTION 3: MATERIALS */}
                    <div className="space-y-1.5">
                        <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-3">Materiales</Label>
                        <div className="bg-white p-3.5 rounded-2xl shadow-sm border border-slate-100 space-y-3">
                            {/* Spool */}
                            <div className="p-2.5 bg-blue-50/50 rounded-xl border border-blue-100 flex items-start gap-3">
                                <div className="mt-1 text-blue-500"><Box size={16} /></div>
                                <div className="flex-1 space-y-2">
                                    <div className="space-y-1">
                                        <Label className="text-[10px] font-bold text-blue-600">Bobina</Label>
                                        <Select onValueChange={(val) => handleSelectChange("codigo_carrete", val)}>
                                            <SelectTrigger className="h-8 border-blue-200 bg-white text-[11px]">
                                                <SelectValue placeholder="Seleccionar..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {spools.map(s => (
                                                    <SelectItem key={s.serial} value={s.serial} className="text-xs">{s.label}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <Label className="text-[9px] uppercase text-blue-400 font-bold">Usado</Label>
                                            <Input type="number" name="metraje_usado" value={formData.metraje_usado} onChange={handleChange} className="h-8 bg-white border-blue-200 text-xs" />
                                        </div>
                                        <div>
                                            <Label className="text-[9px] uppercase text-red-400 font-bold">Merma</Label>
                                            <Input type="number" name="metraje_desechado" value={formData.metraje_desechado} onChange={handleChange} className="h-8 bg-white border-red-200 text-red-600 text-xs" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Small Parts Grid */}
                            <div className="grid grid-cols-4 gap-2">
                                <div className="space-y-1 text-center">
                                    <Label className="text-[9px] uppercase font-bold text-slate-400">Conect.</Label>
                                    <Input type="number" name="conectores" value={formData.conectores} onChange={handleChange} className="text-center h-9 rounded-lg bg-slate-50 text-xs" />
                                </div>
                                <div className="space-y-1 text-center">
                                    <Label className="text-[9px] uppercase font-bold text-slate-400">Tensores</Label>
                                    <Input type="number" name="tensores" value={formData.tensores} onChange={handleChange} className="text-center h-9 rounded-lg bg-slate-50 text-xs" />
                                </div>
                                <div className="space-y-1 text-center">
                                    <Label className="text-[9px] uppercase font-bold text-slate-400">Patch</Label>
                                    <Input type="number" name="patchcord" value={formData.patchcord} onChange={handleChange} className="text-center h-9 rounded-lg bg-slate-50 text-xs" />
                                </div>
                                <div className="space-y-1 text-center">
                                    <Label className="text-[9px] uppercase font-bold text-slate-400">Rosetas</Label>
                                    <Input type="number" name="rosetas" value={formData.rosetas} onChange={handleChange} className="text-center h-9 rounded-lg bg-slate-50 text-xs" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* SECTION 4: EQUIPMENT SWAP (TOGGLE) */}
                    <div className="bg-white p-3.5 rounded-2xl shadow-sm border border-slate-100 space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <div className="h-7 w-7 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">
                                    <RefreshCw size={14} />
                                </div>
                                <div>
                                    <Label className="text-sm font-bold text-slate-900 cursor-pointer" htmlFor="swap-mode">Cambio de Equipo</Label>
                                </div>
                            </div>
                            <Switch
                                id="swap-mode"
                                checked={isSwap}
                                onCheckedChange={setIsSwap}
                                className="scale-90 data-[state=checked]:bg-indigo-600"
                            />
                        </div>

                        {/* Animated Expand */}
                        {isSwap && (
                            <div className="pt-1 grid grid-cols-2 gap-3 animate-in slide-in-from-top-2 fade-in duration-300">
                                <div className="space-y-1">
                                    <Label className="text-[10px] text-slate-500 font-bold uppercase">ONU Anterior</Label>
                                    <Input
                                        name="onu_anterior"
                                        value={formData.onu_anterior}
                                        onChange={handleChange}
                                        className="h-9 bg-slate-50 border-slate-200 rounded-lg text-xs"
                                        placeholder="Serial Retirado"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-[10px] text-indigo-600 font-bold uppercase">ONU Nueva</Label>
                                    <Input
                                        name="onu_nueva"
                                        value={formData.onu_nueva}
                                        onChange={handleChange}
                                        className="h-9 bg-indigo-50 border-indigo-200 text-indigo-900 rounded-lg text-xs"
                                        placeholder="Serial Instalado"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* OBSERVATIONS */}
                    <div className="space-y-1">
                        <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-3">Notas</Label>
                        <Textarea
                            name="observacion"
                            value={formData.observacion}
                            onChange={handleChange}
                            placeholder="Detalles adicionales..."
                            className="bg-white border-slate-200 rounded-2xl min-h-[60px] shadow-sm resize-none focus:ring-0 focus:border-slate-300 text-sm py-3"
                        />
                    </div>

                    <div className="pt-2">
                        <Button type="submit" disabled={loading} className="w-full h-12 text-base font-bold rounded-2xl bg-black hover:bg-zinc-800 text-white shadow-xl shadow-black/5 active:scale-[0.98]">
                            {loading ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : null}
                            Guardar Reporte
                        </Button>
                    </div>

                </form>
            </DialogContent>
        </Dialog>
    )
}
