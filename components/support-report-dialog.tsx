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
import { Loader2, MapPin, Wrench, RefreshCw, Box, User, Hash, CheckCircle, Send, ArrowRight, ArrowLeft } from "lucide-react"

interface SupportReportDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

type Step = 'form' | 'preview' | 'success'

export function SupportReportDialog({ open, onOpenChange }: SupportReportDialogProps) {
    const [step, setStep] = useState<Step>('form')
    const [loading, setLoading] = useState(false)
    const [spools, setSpools] = useState<{ serial: string, label: string, remaining: number }[]>([])
    const [isSwap, setIsSwap] = useState(false)
    const [gpsLoading, setGpsLoading] = useState(false)

    // Form State
    const [formData, setFormData] = useState({
        cedula: "",
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
            setStep('form')
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

    function getWhatsAppText() {
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
        return message
    }

    const openWhatsApp = () => {
        const text = getWhatsAppText()
        // Use encoded text and open blank
        const url = `https://wa.me/?text=${encodeURIComponent(text)}`
        window.open(url, '_blank')
    }

    const handleNext = (e: React.FormEvent) => {
        e.preventDefault()
        if (!formData.cedula || !formData.causa) {
            toast.error("Cédula y Causa son obligatorios")
            return
        }
        setStep('preview')
    }

    async function handleSave() {
        setLoading(true)
        const res = await createSupportReport({
            ...formData,
            fecha: new Date().toLocaleDateString('es-VE'),
            hora: new Date().toLocaleTimeString('es-VE')
        })

        if (res.success) {
            // Move to success step instead of closing
            setStep('success')
        } else {
            toast.error(res.error)
        }
        setLoading(false)
    }

    const resetAndClose = () => {
        setFormData({
            cedula: "", causa: "", precinto: "", caja_nap: "", potencia: "", coordenadas: "",
            cantidad_puertos: "", puerto: "", zona: "", codigo_carrete: "", metraje_usado: "",
            metraje_desechado: "", conectores: "", tensores: "", patchcord: "", rosetas: "",
            onu_anterior: "", onu_nueva: "", observacion: ""
        })
        setIsSwap(false)
        setStep('form')
        onOpenChange(false)
    }

    // --- VIEWS ---

    // 1. SUCCESS VIEW
    if (step === 'success') {
        return (
            <Dialog open={open} onOpenChange={(v) => !v && resetAndClose()}>
                <DialogContent className="max-w-md w-full rounded-[32px] p-0 border-0 bg-white">
                    <div className="p-8 flex flex-col items-center justify-center text-center space-y-6">
                        <div className="h-20 w-20 bg-green-100 rounded-full flex items-center justify-center text-green-600 animate-in zoom-in spin-in-3">
                            <CheckCircle size={40} />
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-2xl font-bold text-slate-900">¡Reporte Guardado!</h2>
                            <p className="text-slate-500 text-sm">El soporte se ha registrado correctamente en el sistema.</p>
                        </div>

                        <div className="w-full space-y-3 pt-4">
                            <Button onClick={openWhatsApp} className="w-full h-14 bg-[#25D366] hover:bg-[#128C7E] text-white rounded-2xl font-bold text-lg shadow-lg shadow-green-500/20 active:scale-95 transition-all">
                                <Send size={24} className="mr-2" />
                                Abrir WhatsApp
                            </Button>
                            <Button onClick={resetAndClose} variant="ghost" className="w-full text-slate-400">
                                Cerrar
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        )
    }

    // 2. PREVIEW VIEW
    if (step === 'preview') {
        return (
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="max-w-md w-full max-h-[90vh] flex flex-col rounded-[32px] p-0 border-0 bg-[#F2F2F7]">
                    <div className="bg-white/80 backdrop-blur-md px-6 py-4 border-b border-slate-200 sticky top-0 flex justify-between items-center">
                        <Button onClick={() => setStep('form')} variant="ghost" size="icon" className="-ml-2"><ArrowLeft /></Button>
                        <DialogTitle className="text-base font-bold text-slate-900">Previsualización</DialogTitle>
                        <div className="w-8" />
                    </div>

                    <div className="flex-1 overflow-y-auto p-6">
                        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 text-sm font-mono text-slate-600 whitespace-pre-wrap leading-relaxed">
                            {getWhatsAppText().replace(/\*/g, '')}
                        </div>
                    </div>

                    <div className="p-6 bg-white border-t border-slate-100">
                        <Button onClick={handleSave} disabled={loading} className="w-full h-14 bg-black text-white rounded-2xl font-bold text-lg shadow-xl shadow-black/10">
                            {loading ? <Loader2 className="animate-spin mr-2" /> : <CheckCircle className="mr-2" />}
                            Confirmar y Guardar
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        )
    }

    // 3. FORM VIEW
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[95vw] md:max-w-xl w-full max-h-[92vh] flex flex-col rounded-[32px] p-0 border-0 bg-[#F2F2F7]">

                {/* Header iOS Style */}
                <div className="bg-white/80 backdrop-blur-xl sticky top-0 z-50 border-b border-slate-200/50 px-6 py-4 flex items-center justify-between shrink-0">
                    <div>
                        <DialogTitle className="text-xl font-bold text-slate-900 tracking-tight">Nuevo Soporte</DialogTitle>
                        <p className="text-xs text-slate-500 font-medium">Complete los datos requeridos</p>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto px-4 md:px-6 py-6 space-y-6">

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
                                        className="h-9 border-none p-0 text-base font-medium placeholder:text-slate-300 focus-visible:ring-0"
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
                                        <SelectTrigger className="h-9 border-none p-0 text-base font-medium focus:ring-0 shadow-none">
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
                        <div className="bg-white p-4 rounded-[20px] shadow-sm border border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <Label className="text-[10px] text-slate-400 font-bold uppercase">Precinto</Label>
                                <Input className="h-11 rounded-xl bg-slate-50 border-slate-100 font-mono text-base" name="precinto" value={formData.precinto} onChange={handleChange} />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[10px] text-slate-400 font-bold uppercase">Caja NAP</Label>
                                <Input className="h-11 rounded-xl bg-slate-50 border-slate-100 text-base" name="caja_nap" value={formData.caja_nap} onChange={handleChange} />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[10px] text-slate-400 font-bold uppercase">Potencia</Label>
                                <Input className="h-11 rounded-xl bg-slate-50 border-slate-100 font-mono text-base" name="potencia" value={formData.potencia} onChange={handleChange} />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[10px] text-slate-400 font-bold uppercase">Puerto</Label>
                                <Input className="h-11 rounded-xl bg-slate-50 border-slate-100 text-base" name="puerto" value={formData.puerto} onChange={handleChange} />
                            </div>
                            <div className="col-span-1 md:col-span-2 space-y-1 relative">
                                <Label className="text-[10px] text-slate-400 font-bold uppercase">Coordenadas</Label>
                                <div className="flex gap-2">
                                    <Input
                                        className="h-11 rounded-xl bg-slate-50 border-slate-100 font-mono text-base"
                                        name="coordenadas"
                                        value={formData.coordenadas}
                                        onChange={handleChange}
                                        placeholder="Lat, Long"
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        className="h-11 w-11 rounded-xl shrink-0 border-slate-200 text-blue-600 hover:bg-blue-50"
                                        onClick={handleGps}
                                        disabled={gpsLoading}
                                    >
                                        {gpsLoading ? <Loader2 className="animate-spin h-5 w-5" /> : <MapPin size={20} />}
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
                                    <Box size={18} />
                                    <span className="text-xs font-bold uppercase">Bobina de Fibra</span>
                                </div>
                                <Select onValueChange={(val) => handleSelectChange("codigo_carrete", val)}>
                                    <SelectTrigger className="h-10 border-blue-200 bg-white text-base rounded-xl">
                                        <SelectValue placeholder="Seleccionar Bobina..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {spools.map(s => (
                                            <SelectItem key={s.serial} value={s.serial} className="text-base">{s.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <Label className="text-[9px] uppercase text-blue-400 font-bold mb-1 block">Usado (m)</Label>
                                        <Input type="number" name="metraje_usado" value={formData.metraje_usado} onChange={handleChange} className="h-10 bg-white border-blue-200 text-base rounded-xl" />
                                    </div>
                                    <div>
                                        <Label className="text-[9px] uppercase text-red-400 font-bold mb-1 block">Merma (m)</Label>
                                        <Input type="number" name="metraje_desechado" value={formData.metraje_desechado} onChange={handleChange} className="h-10 bg-white border-red-200 text-red-600 text-base rounded-xl" />
                                    </div>
                                </div>
                            </div>

                            {/* Small Parts Grid */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <div className="space-y-1 text-center">
                                    <Label className="text-[9px] uppercase font-bold text-slate-400">Conect.</Label>
                                    <Input type="number" name="conectores" value={formData.conectores} onChange={handleChange} className="text-center h-11 rounded-xl bg-slate-50 text-base" />
                                </div>
                                <div className="space-y-1 text-center">
                                    <Label className="text-[9px] uppercase font-bold text-slate-400">Tensores</Label>
                                    <Input type="number" name="tensores" value={formData.tensores} onChange={handleChange} className="text-center h-11 rounded-xl bg-slate-50 text-base" />
                                </div>
                                <div className="space-y-1 text-center">
                                    <Label className="text-[9px] uppercase font-bold text-slate-400">Patch</Label>
                                    <Input type="number" name="patchcord" value={formData.patchcord} onChange={handleChange} className="text-center h-11 rounded-xl bg-slate-50 text-base" />
                                </div>
                                <div className="space-y-1 text-center">
                                    <Label className="text-[9px] uppercase font-bold text-slate-400">Rosetas</Label>
                                    <Input type="number" name="rosetas" value={formData.rosetas} onChange={handleChange} className="text-center h-11 rounded-xl bg-slate-50 text-base" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* SECTION 4: EQUIPMENT SWAP (TOGGLE) */}
                    <div className="bg-white p-4 rounded-[20px] shadow-sm border border-slate-100 space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                    <RefreshCw size={20} />
                                </div>
                                <div>
                                    <Label className="text-sm font-bold text-slate-900 cursor-pointer block" htmlFor="swap-mode">Cambio de Equipo</Label>
                                    <span className="text-[11px] text-slate-400 font-medium">Si reemplazó ONU/Router</span>
                                </div>
                            </div>
                            <Switch
                                id="swap-mode"
                                checked={isSwap}
                                onCheckedChange={setIsSwap}
                                className="data-[state=checked]:bg-indigo-600 scale-110"
                            />
                        </div>

                        {/* Animated Expand */}
                        {isSwap && (
                            <div className="pt-2 grid grid-cols-1 md:grid-cols-2 gap-3 animate-in slide-in-from-top-2 fade-in duration-300">
                                <div className="space-y-1">
                                    <Label className="text-[10px] text-slate-500 font-bold uppercase">ONU Anterior</Label>
                                    <Input
                                        name="onu_anterior"
                                        value={formData.onu_anterior}
                                        onChange={handleChange}
                                        className="h-11 bg-slate-50 border-slate-200 rounded-xl text-base"
                                        placeholder="Serial Retirado"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-[10px] text-indigo-600 font-bold uppercase">ONU Nueva</Label>
                                    <Input
                                        name="onu_nueva"
                                        value={formData.onu_nueva}
                                        onChange={handleChange}
                                        className="h-11 bg-indigo-50 border-indigo-200 text-indigo-900 rounded-xl text-base"
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
                            className="bg-white border-slate-200 rounded-2xl min-h-[100px] shadow-sm resize-none focus:ring-0 focus:border-slate-300 text-base py-3"
                        />
                    </div>

                </div>

                <div className="p-4 bg-white border-t border-slate-200 shrink-0">
                    <Button onClick={handleNext} className="w-full h-14 text-lg font-bold rounded-2xl bg-black hover:bg-zinc-800 text-white shadow-xl shadow-black/10 active:scale-[0.98] transition-all">
                        Continuar <ArrowRight className="ml-2" />
                    </Button>
                </div>

            </DialogContent>
        </Dialog>
    )
}
