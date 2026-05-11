"use client"

import { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { format, setHours, setMinutes, setSeconds } from "date-fns"
import { CalendarIcon, Loader2, Save, ArrowLeft, Fuel, Car, AlertTriangle, Camera } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { VehicleSelector } from "@/components/vehicle-selector"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"
import Link from "next/link"

import { createFuelLog, getVehicles, getVehicleDetailsAction, getActiveDriverAction } from "../actions"

const formSchema = z.object({
    ticket_number: z.string().min(1, "Número de ticket requerido"),
    fuel_date: z.date({
        required_error: "Fecha requerida",
    }),
    vehicle_id: z.string().min(1, "Seleccione un vehículo"),
    driver_name: z.string().min(1, "Nombre del conductor requerido"),
    liters: z.coerce.number().min(0.01, "Litros deben ser mayor a 0"),
    mileage: z.coerce.number().min(0, "Kilometraje requerido"),
    ticket_url: z.string().optional(),
    notes: z.string().optional(),
    is_skipped: z.boolean().default(false)
})

function NewFuelLogContent() {
    const router = useRouter()
    const searchParams = useSearchParams()

    const [vehicles, setVehicles] = useState<any[]>([])
    const [uploading, setUploading] = useState(false)
    const [loading, setLoading] = useState(false)
    const [vehiclesLoaded, setVehiclesLoaded] = useState(false)
    const [scannedVehicle, setScannedVehicle] = useState<any>(null)

    // Sequence Alert State
    const [sequenceAlertOpen, setSequenceAlertOpen] = useState(false)
    const [lastTicketNum, setLastTicketNum] = useState<number | null>(null)

    // Correction Alert State
    const [correctionAlertOpen, setCorrectionAlertOpen] = useState(false)
    const [correctionData, setCorrectionData] = useState<{
        newMileage: number,
        currentSystemKm: number,
        vehicleId: string
    } | null>(null)

    const supabase = createClient()

    useEffect(() => {
        const loadInitialData = async () => {
            const data = await getVehicles()
            setVehicles(data)
            setVehiclesLoaded(true)
        }
        loadInitialData()
    }, [])

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            ticket_number: "",
            driver_name: "",
            liters: 0,
            mileage: 0,
            ticket_url: "",
            notes: "",
            fuel_date: new Date(),
            is_skipped: false
        },
    })

    // Handle URL Params (SCAN MODE)
    useEffect(() => {
        const pVehicleId = searchParams.get('vehicleId')

        async function loadScannedDetails(id: string) {
            try {
                const details = await getVehicleDetailsAction(id)
                if (details) {
                    setScannedVehicle(details)
                    form.setValue("vehicle_id", details.id)
                    
                    // Attempt to auto-fill driver from active trip
                    const activeDriver = await getActiveDriverAction(id)
                    if (activeDriver) {
                        form.setValue("driver_name", activeDriver)
                    } else if (details.driver) {
                        const dName = `${details.driver.first_name} ${details.driver.last_name}`
                        form.setValue("driver_name", dName)
                    }
                }
            } catch (err) {
                console.error("Error loading scanned details", err)
            }
        }

        if (pVehicleId) {
            loadScannedDetails(pVehicleId)
        }
    }, [searchParams, form])

    const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setUploading(true)
        try {
            const fileExt = file.name.split('.').pop()
            const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`
            const filePath = `${fileName}`

            const { error: uploadError } = await supabase.storage
                .from('fuel-receipts')
                .upload(filePath, file)

            if (uploadError) throw uploadError

            const { data: { publicUrl } } = supabase.storage
                .from('fuel-receipts')
                .getPublicUrl(filePath)

            form.setValue("ticket_url", publicUrl)
            toast.success("Imagen cargada correctamente")
        } catch (error: any) {
            console.error(error)
            toast.error("Error subiendo imagen")
        } finally {
            setUploading(false)
        }
    }

    const onSubmit = async (values: z.infer<typeof formSchema>, bypass: boolean = false, forceKm: boolean = false) => {
        setLoading(true)
        try {
            // Adjust fuel_date to have current time
            const now = new Date()
            const adjustedDate = setSeconds(setMinutes(setHours(values.fuel_date, now.getHours()), now.getMinutes()), now.getSeconds())
            
            const payload = { 
                ...values, 
                fuel_date: adjustedDate,
                is_skipped: bypass || values.is_skipped,
                forceCorrection: forceKm 
            }

            const res = await createFuelLog(payload)

            if (res.success) {
                toast.success("Registro guardado correctamente")
                router.push("/control/combustible")
                setSequenceAlertOpen(false)
                setCorrectionAlertOpen(false)
            } else {
                if (res.requiresSequenceBypass) {
                    setLastTicketNum(res.lastTicket)
                    setSequenceAlertOpen(true)
                } else if (res.requiresCorrection) {
                    setCorrectionData({
                        newMileage: values.mileage,
                        currentSystemKm: res.currentSystemKm,
                        vehicleId: values.vehicle_id
                    })
                    setCorrectionAlertOpen(true)
                } else {
                    toast.error("Error: " + res.error)
                }
            }
        } catch (error) {
            toast.error("Error inesperado")
        } finally {
            setLoading(false)
        }
    }

    return (
        <main className="min-h-screen bg-zinc-50 pb-20 font-sans text-zinc-900">
            {/* Header */}
            <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-zinc-200 px-4 py-4">
                <div className="max-w-3xl mx-auto flex items-center gap-4">
                    <Link href="/control/combustible">
                        <Button variant="ghost" size="icon" className="rounded-xl hover:bg-zinc-100 shrink-0">
                            <ArrowLeft size={20} />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-xl font-bold text-zinc-900 leading-none">Nuevo Ticket</h1>
                        <p className="text-xs text-zinc-500 font-medium mt-1">Registro de combustible</p>
                    </div>
                </div>
            </header>

            <div className="max-w-3xl mx-auto px-4 mt-6 space-y-6">
                
                {/* Vehicle Summary Card (if scanned) */}
                {scannedVehicle && (
                    <div className="bg-indigo-600 rounded-[32px] p-6 text-white shadow-xl shadow-indigo-200 overflow-hidden relative">
                        <div className="absolute -right-10 -bottom-10 opacity-10">
                            <Fuel size={200} />
                        </div>
                        <div className="relative z-10 flex gap-4 items-center mb-4">
                            <div className="h-14 w-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center">
                                <Car size={28} />
                            </div>
                            <div>
                                <h2 className="text-2xl font-black tracking-tight leading-none">{scannedVehicle.modelo}</h2>
                                <p className="text-indigo-100 font-mono text-sm mt-1">{scannedVehicle.placa} • {scannedVehicle.codigo}</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3 relative z-10">
                            <div className="bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/10">
                                <p className="text-[10px] font-bold uppercase text-indigo-200 mb-1">Km Actual</p>
                                <p className="text-lg font-bold">{scannedVehicle.kilometraje?.toLocaleString() || 0} <span className="text-xs font-normal">km</span></p>
                            </div>
                            <div className="bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/10">
                                <p className="text-[10px] font-bold uppercase text-indigo-200 mb-1">Último Ticket</p>
                                <p className="text-lg font-bold">#{scannedVehicle.last_fuel?.ticket_number || '-'}</p>
                            </div>
                        </div>
                    </div>
                )}

                <Card className="border-zinc-200 shadow-sm bg-white rounded-[32px] overflow-hidden">
                    <CardContent className="p-6">
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit((v) => onSubmit(v))} className="space-y-6">

                                {/* Ticket Number & Date */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <FormField
                                        control={form.control}
                                        name="ticket_number"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-zinc-500 font-bold uppercase text-[10px] tracking-wider ml-1">N# de Ticket (Solo números)</FormLabel>
                                                <FormControl>
                                                    <Input 
                                                        placeholder="000123" 
                                                        className="h-14 rounded-2xl border-zinc-200 text-lg font-bold focus:ring-indigo-500 bg-zinc-50/50" 
                                                        {...field}
                                                        onChange={(e) => {
                                                            const val = e.target.value.replace(/\D/g, '');
                                                            field.onChange(val);
                                                        }}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="fuel_date"
                                        render={({ field }) => (
                                            <FormItem className="flex flex-col">
                                                <FormLabel className="text-zinc-500 font-bold uppercase text-[10px] tracking-wider ml-1 mb-2">Fecha de Carga</FormLabel>
                                                <Popover>
                                                    <PopoverTrigger asChild>
                                                        <FormControl>
                                                            <Button
                                                                variant={"outline"}
                                                                className={cn(
                                                                    "w-full h-14 pl-4 text-left font-bold text-lg rounded-2xl border-zinc-200 bg-zinc-50/50",
                                                                    !field.value && "text-muted-foreground"
                                                                )}
                                                            >
                                                                <CalendarIcon className="mr-2 h-5 w-5 text-indigo-500" />
                                                                {field.value ? format(field.value, "PPP") : <span>Seleccionar fecha</span>}
                                                            </Button>
                                                        </FormControl>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-auto p-0 rounded-3xl overflow-hidden" align="start">
                                                        <Calendar
                                                            mode="single"
                                                            selected={field.value}
                                                            onSelect={field.onChange}
                                                            disabled={(date) => date > new Date()}
                                                            initialFocus
                                                        />
                                                    </PopoverContent>
                                                </Popover>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                {/* Vehicle & Driver */}
                                {!scannedVehicle && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <FormField
                                            control={form.control}
                                            name="vehicle_id"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <VehicleSelector
                                                        vehicles={vehicles}
                                                        selectedVehicleId={field.value}
                                                        onSelect={async (v) => {
                                                            if (!v) {
                                                                field.onChange("")
                                                                return
                                                            }
                                                            field.onChange(v.id)
                                                            
                                                            // Auto-detect driver
                                                            const activeDriver = await getActiveDriverAction(v.id)
                                                            if (activeDriver) {
                                                                form.setValue("driver_name", activeDriver)
                                                                toast.info(`Chofer detectado: ${activeDriver}`)
                                                            }
                                                        }}
                                                        className="h-14 rounded-2xl"
                                                    />
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            control={form.control}
                                            name="driver_name"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-zinc-500 font-bold uppercase text-[10px] tracking-wider ml-1">Conductor Responsable</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="Nombre completo" className="h-14 rounded-2xl border-zinc-200 bg-zinc-50/50 font-medium" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                )}

                                {scannedVehicle && !form.watch("driver_name") && (
                                     <FormField
                                        control={form.control}
                                        name="driver_name"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-zinc-500 font-bold uppercase text-[10px] tracking-wider ml-1">Conductor Responsable</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="Nombre completo" className="h-14 rounded-2xl border-zinc-200 bg-zinc-50/50 font-medium" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                )}

                                {/* Data Input */}
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="liters"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-zinc-500 font-bold uppercase text-[10px] tracking-wider ml-1">Litros Cargados</FormLabel>
                                                <FormControl>
                                                    <div className="relative">
                                                        <Fuel className="absolute left-4 top-[18px] h-5 w-5 text-emerald-500" />
                                                        <Input type="number" step="0.01" min="0" className="pl-12 h-14 rounded-2xl border-zinc-200 bg-zinc-50/50 font-black text-xl" {...field} />
                                                    </div>
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="mileage"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-zinc-500 font-bold uppercase text-[10px] tracking-wider ml-1">Nuevo Kilometraje</FormLabel>
                                                <FormControl>
                                                    <div className="relative">
                                                        <div className="absolute left-4 top-[18px] h-5 w-5 flex items-center justify-center text-indigo-500 font-black text-xs">KM</div>
                                                        <Input type="number" min="0" className="pl-12 h-14 rounded-2xl border-zinc-200 bg-zinc-50/50 font-black text-xl" {...field} />
                                                    </div>
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                {/* Image Upload */}
                                <div className="space-y-3">
                                    <FormLabel className="text-zinc-500 font-bold uppercase text-[10px] tracking-wider ml-1">Evidencia (Foto del Ticket)</FormLabel>
                                    <div className="relative group">
                                        {form.watch("ticket_url") ? (
                                            <div className="relative w-full aspect-video rounded-[24px] overflow-hidden border border-zinc-200 shadow-md">
                                                <img src={form.getValues("ticket_url")} alt="Ticket" className="object-cover w-full h-full" />
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                     <Button
                                                        type="button"
                                                        variant="destructive"
                                                        className="rounded-xl font-bold"
                                                        onClick={() => form.setValue("ticket_url", "")}
                                                    >
                                                        Eliminar y Repetir
                                                    </Button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="relative border-2 border-dashed border-zinc-200 rounded-[24px] p-10 flex flex-col items-center gap-4 hover:border-indigo-300 hover:bg-indigo-50/30 transition-all cursor-pointer bg-zinc-50/50">
                                                <div className="h-16 w-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-sm">
                                                    <Camera size={32} />
                                                </div>
                                                <div className="text-center">
                                                    <p className="text-lg font-bold text-zinc-900">Tomar Foto del Ticket</p>
                                                    <p className="text-xs text-zinc-500 font-medium">Usa la cámara o sube desde la galería</p>
                                                </div>
                                                <Input
                                                    type="file"
                                                    accept="image/*"
                                                    capture="environment"
                                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                    onChange={onUpload}
                                                    disabled={uploading}
                                                />
                                            </div>
                                        )}
                                        {uploading && (
                                            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm rounded-[24px] flex flex-col items-center justify-center z-10">
                                                <Loader2 className="animate-spin text-indigo-600 w-10 h-10" />
                                                <p className="text-sm font-bold text-indigo-600 mt-2">Subiendo...</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <Button type="submit" size="lg" className="w-full h-16 rounded-2xl text-lg font-black shadow-xl shadow-indigo-200 bg-indigo-600 hover:bg-indigo-700 transition-all active:scale-[0.98]" disabled={loading || uploading}>
                                    {loading ? <><Loader2 className="mr-2 h-6 w-6 animate-spin" /> Guardando...</> : <><Save className="mr-2 h-6 w-6" /> Guardar Registro</>}
                                </Button>

                            </form>
                        </Form>
                    </CardContent>
                </Card>
            </div>

            {/* SEQUENCE ALERT */}
            <AlertDialog open={sequenceAlertOpen} onOpenChange={setSequenceAlertOpen}>
                <AlertDialogContent className="rounded-[32px] border-none shadow-2xl bg-white p-8">
                    <AlertDialogHeader>
                        <div className="mx-auto bg-amber-50 w-20 h-20 rounded-full flex items-center justify-center mb-6 text-amber-600">
                            <AlertTriangle size={40} />
                        </div>
                        <AlertDialogTitle className="text-center text-2xl font-black text-zinc-900">Salto de Secuencia</AlertDialogTitle>
                        <AlertDialogDescription className="text-center text-zinc-500 text-lg">
                            El último ticket registrado es el <strong>#{lastTicketNum}</strong>. 
                            Estás intentando registrar el <strong>#{form.getValues("ticket_number")}</strong>.
                            <br /><br />
                            ¿Deseas registrar este salto con una nota explicativa?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    
                    <div className="mt-4">
                        <Input 
                            placeholder="Motivo del salto (ej. Hoja dañada)" 
                            className="h-14 rounded-2xl border-zinc-200 bg-zinc-50"
                            onChange={(e) => form.setValue("notes", e.target.value)}
                        />
                    </div>

                    <AlertDialogFooter className="flex-col sm:flex-row gap-3 mt-8">
                        <AlertDialogCancel
                            onClick={() => setSequenceAlertOpen(false)}
                            className="rounded-2xl h-14 border-zinc-200 text-zinc-600 font-bold hover:bg-zinc-50"
                        >
                            Corregir Número
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                if (!form.getValues("notes")) {
                                    toast.error("Debes indicar el motivo del salto")
                                    return
                                }
                                onSubmit(form.getValues(), true)
                            }}
                            className="rounded-2xl h-14 bg-amber-600 text-white font-black hover:bg-amber-700 shadow-lg shadow-amber-200"
                        >
                            Saltar y Guardar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* MILEAGE CORRECTION ALERT */}
            <AlertDialog open={correctionAlertOpen} onOpenChange={setCorrectionAlertOpen}>
                <AlertDialogContent className="rounded-[32px] border-none shadow-2xl bg-white p-8">
                    <AlertDialogHeader>
                        <div className="mx-auto bg-red-50 w-20 h-20 rounded-full flex items-center justify-center mb-6 text-red-600">
                            <AlertTriangle size={40} />
                        </div>
                        <AlertDialogTitle className="text-center text-2xl font-black text-zinc-900">Kilometraje Incongruente</AlertDialogTitle>
                        <AlertDialogDescription className="text-center text-zinc-500 text-lg">
                            Registramos <strong>{correctionData?.currentSystemKm?.toLocaleString()} km</strong> en sistema, pero indicas <strong>{correctionData?.newMileage?.toLocaleString()} km</strong>.
                            <br /><br />
                            <span className="text-red-600 font-bold block p-4 bg-red-50 rounded-2xl border border-red-100">
                                ¿Deseas corregir el sistema con tu valor actual?
                            </span>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex-col sm:flex-row gap-3 mt-8">
                        <AlertDialogCancel
                            onClick={() => setCorrectionAlertOpen(false)}
                            className="rounded-2xl h-14 border-zinc-200 text-zinc-600 font-bold hover:bg-zinc-50"
                        >
                            Cancelar
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                onSubmit(form.getValues(), false, true)
                            }}
                            className="rounded-2xl h-14 bg-red-600 text-white font-black hover:bg-red-700 shadow-lg shadow-red-200"
                        >
                            Sí, Corregir y Guardar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </main>
    )
}

export default function NewFuelLogPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-zinc-400">Cargando...</div>}>
            <NewFuelLogContent />
        </Suspense>
    )
}
