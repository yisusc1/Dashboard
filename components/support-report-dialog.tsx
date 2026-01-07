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
import { Loader2, MapPin, Wrench, RefreshCw, Box, User, Hash } from "lucide-react"

interface SupportReportDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    // clients prop removed
}

export function SupportReportDialog({ open, onOpenChange }: SupportReportDialogProps) {
    const [loading, setLoading] = useState(false)
    const [spools, setSpools] = useState<{ serial: string, label: string, remaining: number }[]>([])
    const [isSwap, setIsSwap] = useState(false)
    const [gpsLoading, setGpsLoading] = useState(false)

    // Form State
    const [formData, setFormData] = useState({
        cedula: "", // Replaces client_id
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

        if (!formData.cedula || !formData.causa) {
            toast.error("Cédula y Causa son obligatorios")
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

            // BUILD WHATSAPP MESSAGE
            let message = `*REPORTE DE SOPORTE*\n`
            message += `*Fecha:* ${new Date().toLocaleDateString('es-VE')}\n`
            message += `*Hora:* ${new Date().toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })}\n\n`

            message += `*Cliente Cédula:* ${formData.cedula}\n`
            message += `*Motivo:* ${formData.causa}\n\n`

            message += `*DATOS TÉCNICOS*\n`
            message += `Precinto: ${formData.precinto || 'N/A'}\n`
            message += `Caja NAP: ${formData.caja_nap || 'N/A'}\n`
            message += `Potencia: ${formData.potencia || 'N/A'} dBm\n`
            message += `Puerto: ${formData.puerto || 'N/A'}\n`
            message += `Coordenadas: ${formData.coordenadas || 'N/A'}\n\n`

            if (formData.codigo_carrete || parseInt(formData.conectores) > 0 || parseInt(formData.patchcord) > 0) {
                message += `*MATERIALES*\n`
                if (formData.codigo_carrete) {
                    const spoolLabel = spools.find(s => s.serial === formData.codigo_carrete)?.label || formData.codigo_carrete
                    message += `- Bobina: ${spoolLabel} (Usado: ${formData.metraje_usado}m, Merma: ${formData.metraje_desechado}m)\n`
                }
                if (parseInt(formData.conectores) > 0) message += `- Conectores: ${formData.conectores}\n`
                if (parseInt(formData.tensores) > 0) message += `- Tensores: ${formData.tensores}\n`
                if (parseInt(formData.patchcord) > 0) message += `- Patchcords: ${formData.patchcord}\n`
                if (parseInt(formData.rosetas) > 0) message += `- Rosetas: ${formData.rosetas}\n`
                message += `\n`
            }

            if (isSwap && formData.onu_anterior) {
                message += `*CAMBIO DE EQUIPO*\n`
                message += `Retirado: ${formData.onu_anterior}\n`
                message += `Instalado: ${formData.onu_nueva || 'N/A'}\n\n`
            }

            if (formData.observacion) {
                message += `*Observaciones:* ${formData.observacion}\n`
            }

            // ENCODE AND OPEN
            const encodedMessage = encodeURIComponent(message)
            const whatsappUrl = `https://wa.me/?text=${encodedMessage}`
            window.open(whatsappUrl, '_blank')

            onOpenChange(false)
            // Reset form
            setFormData({
                cedula: "", causa: "", precinto: "", caja_nap: "", potencia: "", coordenadas: "",
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
            <DialogContent className="max-w-[95vw] md:max-w-md w-full max-h-[90vh] overflow-y-auto rounded-[32px] p-0 border-0 outline-none bg-[#F2F2F7]">

                {/* Header iOS Style */}
                <div className="bg-white/80 backdrop-blur-xl sticky top-0 z-50 border-b border-slate-200/50 px-6 py-4 flex items-center justify-between">
                    <div>
                        <DialogTitle className="text-lg font-bold text-slate-900 tracking-tight">Nuevo Soporte</DialogTitle>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="px-6 py-6 space-y-6">

                    {/* SECTION 1: CLIENT & CAUSE */}
                    <div className="space-y-2">
                        <Label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider pl-1">Información Básica</Label>
                        <div className="bg-white rounded-[20px] shadow-sm border border-slate-100 overflow-hidden divide-y divide-slate-50">

                            {/* CEDULA INPUT */}
                            <div className="p-4 flex items-center gap-3">
                                <div className="h-8 w-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 shrink-0">
                                    <Hash size={16} />
                                </div>
                                <div className="flex-1 space-y-1">
                                    <Label className="text-[11px] font-bold text-slate-900">Cédula del Cliente</Label>
                                    <Input
                                        name="cedula"
                                        value={formData.cedula}
                                        onChange={handleChange}
                                        className="h-8 border-none p-0 text-base font-medium placeholder:text-slate-300 focus-visible:ring-0"
                                        placeholder="Ej: 12345678"
                                    />
                                </div>
                            </div>

                            {/* CAUSE SELECT */}
                            <div className="p-4 flex items-center gap-3">
                                <div className="h-8 w-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 shrink-0">
                                    <Wrench size={16} />
                                </div>
                                <div className="flex-1 space-y-1">
                                    <Label className="text-[11px] font-bold text-slate-900">Motivo</Label>
                                    <Select onValueChange={(val) => handleSelectChange("causa", val)} value={formData.causa}>
                                        <SelectTrigger className="h-8 border-none p-0 text-base font-medium focus:ring-0 shadow-none">
                                            <SelectValue placeholder="Seleccionar..." />
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
                        </div>
                    </div>

                    {/* SECTION 2: TECHNICAL DETAILS */}
                    <div className="space-y-2">
                        <Label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider pl-1">Datos Técnicos</Label>
                        <div className="bg-white p-4 rounded-[20px] shadow-sm border border-slate-100 grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <Label className="text-[10px] text-slate-400 font-bold uppercase">Precinto</Label>
                                <Input className="h-10 rounded-xl bg-slate-50 border-slate-100 font-mono text-xs" name="precinto" value={formData.precinto} onChange={handleChange} />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[10px] text-slate-400 font-bold uppercase">Caja NAP</Label>
                                <Input className="h-10 rounded-xl bg-slate-50 border-slate-100 text-xs" name="caja_nap" value={formData.caja_nap} onChange={handleChange} />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[10px] text-slate-400 font-bold uppercase">Potencia</Label>
                                <Input className="h-10 rounded-xl bg-slate-50 border-slate-100 font-mono text-xs" name="potencia" value={formData.potencia} onChange={handleChange} />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[10px] text-slate-400 font-bold uppercase">Puerto</Label>
                                <Input className="h-10 rounded-xl bg-slate-50 border-slate-100 text-xs" name="puerto" value={formData.puerto} onChange={handleChange} />
                            </div>
                            <div className="col-span-2 space-y-1 relative">
                                <Label className="text-[10px] text-slate-400 font-bold uppercase">Coordenadas</Label>
                                <div className="flex gap-2">
                                    <Input
                                        className="h-10 rounded-xl bg-slate-50 border-slate-100 font-mono text-xs"
                                        name="coordenadas"
                                        value={formData.coordenadas}
                                        onChange={handleChange}
                                        placeholder="Lat, Long"
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        className="h-10 w-10 rounded-xl shrink-0 border-slate-200 text-blue-600 hover:bg-blue-50"
                                        onClick={handleGps}
                                        disabled={gpsLoading}
                                    >
                                        {gpsLoading ? <Loader2 className="animate-spin h-4 w-4" /> : <MapPin size={18} />}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* SECTION 3: MATERIALS */}
                    <div className="space-y-2">
                        <Label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider pl-1">Materiales Utilizados</Label>
                        <div className="bg-white p-4 rounded-[20px] shadow-sm border border-slate-100 space-y-4">
                            {/* Spool */}
                            <div className="p-3 bg-blue-50/50 rounded-2xl border border-blue-100 flex flex-col gap-3">
                                <div className="flex items-center gap-2 text-blue-600">
                                    <Box size={16} />
                                    <span className="text-xs font-bold uppercase">Bobina de Fibra</span>
                                </div>
                                <Select onValueChange={(val) => handleSelectChange("codigo_carrete", val)}>
                                    <SelectTrigger className="h-9 border-blue-200 bg-white text-xs rounded-xl">
                                        <SelectValue placeholder="Seleccionar Bobina..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {spools.map(s => (
                                            <SelectItem key={s.serial} value={s.serial} className="text-xs">{s.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <Label className="text-[9px] uppercase text-blue-400 font-bold mb-1 block">Usado (m)</Label>
                                        <Input type="number" name="metraje_usado" value={formData.metraje_usado} onChange={handleChange} className="h-9 bg-white border-blue-200 text-xs rounded-xl" />
                                    </div>
                                    <div>
                                        <Label className="text-[9px] uppercase text-red-400 font-bold mb-1 block">Merma (m)</Label>
                                        <Input type="number" name="metraje_desechado" value={formData.metraje_desechado} onChange={handleChange} className="h-9 bg-white border-red-200 text-red-600 text-xs rounded-xl" />
                                    </div>
                                </div>
                            </div>

                            {/* Small Parts Grid */}
                            <div className="grid grid-cols-4 gap-2">
                                <div className="space-y-1 text-center">
                                    <Label className="text-[9px] uppercase font-bold text-slate-400">Conect.</Label>
                                    <Input type="number" name="conectores" value={formData.conectores} onChange={handleChange} className="text-center h-10 rounded-xl bg-slate-50 text-xs" />
                                </div>
                                <div className="space-y-1 text-center">
                                    <Label className="text-[9px] uppercase font-bold text-slate-400">Tensores</Label>
                                    <Input type="number" name="tensores" value={formData.tensores} onChange={handleChange} className="text-center h-10 rounded-xl bg-slate-50 text-xs" />
                                </div>
                                <div className="space-y-1 text-center">
                                    <Label className="text-[9px] uppercase font-bold text-slate-400">Patch</Label>
                                    <Input type="number" name="patchcord" value={formData.patchcord} onChange={handleChange} className="text-center h-10 rounded-xl bg-slate-50 text-xs" />
                                </div>
                                <div className="space-y-1 text-center">
                                    <Label className="text-[9px] uppercase font-bold text-slate-400">Rosetas</Label>
                                    <Input type="number" name="rosetas" value={formData.rosetas} onChange={handleChange} className="text-center h-10 rounded-xl bg-slate-50 text-xs" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* SECTION 4: EQUIPMENT SWAP (TOGGLE) */}
                    <div className="bg-white p-4 rounded-[20px] shadow-sm border border-slate-100 space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                    <RefreshCw size={16} />
                                </div>
                                <div>
                                    <Label className="text-sm font-bold text-slate-900 cursor-pointer block" htmlFor="swap-mode">Cambio de Equipo</Label>
                                    <span className="text-[10px] text-slate-400 font-medium">Si se reemplazó ONU/Router</span>
                                </div>
                            </div>
                            <Switch
                                id="swap-mode"
                                checked={isSwap}
                                onCheckedChange={setIsSwap}
                                className="data-[state=checked]:bg-indigo-600"
                            />
                        </div>

                        {/* Animated Expand */}
                        {isSwap && (
                            <div className="pt-2 grid grid-cols-2 gap-3 animate-in slide-in-from-top-2 fade-in duration-300">
                                <div className="space-y-1">
                                    <Label className="text-[10px] text-slate-500 font-bold uppercase">ONU Anterior</Label>
                                    <Input
                                        name="onu_anterior"
                                        value={formData.onu_anterior}
                                        onChange={handleChange}
                                        className="h-10 bg-slate-50 border-slate-200 rounded-xl text-xs"
                                        placeholder="Serial Retirado"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-[10px] text-indigo-600 font-bold uppercase">ONU Nueva</Label>
                                    <Input
                                        name="onu_nueva"
                                        value={formData.onu_nueva}
                                        onChange={handleChange}
                                        className="h-10 bg-indigo-50 border-indigo-200 text-indigo-900 rounded-xl text-xs"
                                        placeholder="Serial Instalado"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* OBSERVATIONS */}
                    <div className="pb-4">
                        <Label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider pl-1 mb-2 block">Notas Adicionales</Label>
                        <Textarea
                            name="observacion"
                            value={formData.observacion}
                            onChange={handleChange}
                            placeholder="Detalles sobre la reparación..."
                            className="bg-white border-slate-200 rounded-2xl min-h-[80px] shadow-sm resize-none focus:ring-0 focus:border-slate-300 text-sm py-3"
                        />
                    </div>

                    <div className="pt-2 sticky bottom-0 pb-6 bg-[#F2F2F7]">
                        <Button type="submit" disabled={loading} className="w-full h-14 text-base font-bold rounded-2xl bg-black hover:bg-zinc-800 text-white shadow-xl shadow-black/10 active:scale-[0.98] transition-all">
                            {loading ? <Loader2 className="animate-spin mr-2 h-5 w-5" /> : null}
                            Guardar Soporte
                        </Button>
                    </div>

                </form>
            </DialogContent>
        </Dialog>
    )
}
