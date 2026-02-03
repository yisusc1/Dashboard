"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { format } from "date-fns"
import { CalendarIcon, Upload, Loader2, Save, ArrowLeft, Fuel, Car, AlertTriangle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { VehicleSelector, Vehicle } from "@/components/vehicle-selector"
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
} from "@/components/ui/alert-dialog" // [NEW] Link components
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"

import { createFuelLog, getVehicles, getVehicleDetailsAction } from "../actions"
import Link from "next/link"

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
    notes: z.string().optional()
})

import { Suspense } from "react"

// ... imports ...


function NewFuelLogContent() {
    const router = useRouter()
    const searchParams = useSearchParams()

    const [vehicles, setVehicles] = useState<any[]>([])
    const [uploading, setUploading] = useState(false)
    const [loading, setLoading] = useState(false)
    const [vehiclesLoaded, setVehiclesLoaded] = useState(false)
    const [currentUserId, setCurrentUserId] = useState<string | null>(null) // [NEW]

    // [NEW] State for detailed scanned info
    const [scannedVehicle, setScannedVehicle] = useState<any>(null)

    // Alert State
    const [conflictAlertOpen, setConflictAlertOpen] = useState(false)
    const [pendingVehicleId, setPendingVehicleId] = useState<string | null>(null)
    const [pendingVehicleModel, setPendingVehicleModel] = useState("")
    const [pendingDriverName, setPendingDriverName] = useState("")

    // [NEW] Correction Alert State
    const [correctionAlertOpen, setCorrectionAlertOpen] = useState(false)
    const [correctionData, setCorrectionData] = useState<{
        newMileage: number,
        currentSystemKm: number,
        vehicleId: string
    } | null>(null)

    const supabase = createClient()

    // [NEW] Get Current User
    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => {
            if (data.user) setCurrentUserId(data.user.id)
        })
    }, [])

    // 1. Load list of vehicles for manual selection fallback
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
            fuel_date: new Date() // [NEW] Default to current date/time
        },
    })

    // 2. Handle URL Params (SCAN MODE)
    useEffect(() => {
        const pVehicleId = searchParams.get('vehicleId')

        async function loadScannedDetails(id: string) {
            try {
                const details = await getVehicleDetailsAction(id)
                if (details) {
                    setScannedVehicle(details)
                    // Auto-fill form
                    form.setValue("vehicle_id", details.id)
                    form.setValue("mileage", 0) // Reset or propose? Better 0 as user must input NEW mileage.

                    if (details.driver) {
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
        } else {
            // Optional: Handle pre-fill driver name if manual
            const pDriverName = searchParams.get('driverName')
            if (pDriverName) {
                form.setValue("driver_name", pDriverName)
            }
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

    const onSubmit = async (values: z.infer<typeof formSchema>, force: boolean = false) => {
        setLoading(true)
        try {
            // @ts-ignore - Extending the type dynamically
            const payload = { ...values, forceCorrection: force }

            const res = await createFuelLog(payload)

            if (res.success) {
                toast.success(force ? "Corrección aplicada y registro guardado" : "Registro guardado correctamente")
                router.push("/control/combustible")
                setCorrectionAlertOpen(false) // Close if open
            } else {
                if (res.requiresCorrection && res.currentSystemKm) {
                    // Trigger Correction Flow
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
        <div className="p-4 max-w-3xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/control/combustible">
                    <Button variant="ghost" size="icon" className="rounded-full">
                        <ArrowLeft size={24} />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Nuevo Registro</h1>
                    <p className="text-gray-500 text-sm">Carga de combustible</p>
                </div>
            </div>

            {/* SCAN SUMMARY CARD */}
            {scannedVehicle && (
                <div className="bg-blue-50/50 border border-blue-100 rounded-3xl p-6 shadow-sm">
                    <div className="flex gap-4 items-start mb-4">
                        <div className="h-12 w-12 bg-white rounded-2xl flex items-center justify-center text-blue-600 shadow-sm shrink-0">
                            <Car size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 leading-tight">{scannedVehicle.modelo}</h2>
                            <p className="text-gray-500 font-mono text-sm">{scannedVehicle.placa} • {scannedVehicle.codigo}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-2">
                        <div className="bg-white p-3 rounded-2xl shadow-sm">
                            <p className="text-xs font-bold text-gray-400 uppercase mb-1">Conductor</p>
                            <p className="font-semibold text-gray-900 text-sm truncate">
                                {scannedVehicle.driver ? `${scannedVehicle.driver.first_name} ${scannedVehicle.driver.last_name}` : 'Sin Asignar'}
                            </p>
                        </div>
                        <div className="bg-white p-3 rounded-2xl shadow-sm">
                            <p className="text-xs font-bold text-gray-400 uppercase mb-1">Km Actual</p>
                            <p className="font-semibold text-gray-900 text-sm">
                                {scannedVehicle.kilometraje?.toLocaleString() || 0}
                            </p>
                        </div>
                    </div>

                    {scannedVehicle.last_fuel && (
                        <div className="bg-white p-3 rounded-2xl shadow-sm">
                            <p className="text-xs font-bold text-gray-400 uppercase mb-1">Última Carga</p>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-900 font-semibold">{format(new Date(scannedVehicle.last_fuel.fuel_date), "dd/MM/yy HH:mm")}</span>
                                <span className="text-gray-500">{scannedVehicle.last_fuel.liters}L</span>
                            </div>
                        </div>
                    )}
                </div>
            )}

            <Card className="border-none shadow-sm bg-white rounded-3xl overflow-hidden">
                <CardContent className="p-6">
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

                            {/* Ticket Info Row */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <FormField
                                    control={form.control}
                                    name="ticket_number"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>N# Ticket</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Ej. A-123456" className="h-12 rounded-xl" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="fuel_date"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Fecha y Hora</FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <CalendarIcon className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                                                    <Input
                                                        readOnly
                                                        disabled
                                                        value={field.value ? format(field.value, "dd/MM/yyyy HH:mm") : format(new Date(), "dd/MM/yyyy HH:mm")}
                                                        className="pl-10 h-12 rounded-xl bg-gray-50 text-gray-600 font-medium"
                                                    />
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            {/* CONDITIONAL RENDERING: Manual Select only if NOT scanned */}
                            {!scannedVehicle && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <FormField
                                        control={form.control}
                                        name="vehicle_id"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormItem>
                                                    <VehicleSelector
                                                        vehicles={vehicles} // [RESTORED]
                                                        selectedVehicleId={field.value}
                                                        onSelect={(v) => {
                                                            if (!v) {
                                                                field.onChange("")
                                                                return
                                                            }

                                                            // [NEW] Assignment Check Logic
                                                            // @ts-ignore
                                                            const assignedTo = v.assigned_driver_id
                                                            // @ts-ignore
                                                            const driverInfo = v.driver

                                                            if (assignedTo && currentUserId && assignedTo !== currentUserId) {
                                                                const driverName = driverInfo ? `${driverInfo.first_name} ${driverInfo.last_name}` : "Otro Conductor"

                                                                // Set pending state and open dialog
                                                                setPendingVehicleId(v.id)
                                                                setPendingVehicleModel(v.modelo)
                                                                setPendingDriverName(driverName)
                                                                setConflictAlertOpen(true)
                                                                return // Stop 
                                                            }

                                                            field.onChange(v.id)
                                                        }}
                                                        label="Vehículo"
                                                    />
                                                    <FormMessage />
                                                </FormItem>
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="driver_name"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Conductor</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="Nombre del chofer" className="h-12 rounded-xl" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            )}

                            {/* Consumption Data */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <FormField
                                    control={form.control}
                                    name="liters"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Litros</FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <Fuel className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                                                    <Input type="number" step="0.01" className="pl-10 h-12 rounded-xl font-bold text-lg" {...field} />
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
                                            <FormLabel>Nuevo Kilometraje</FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <div className="absolute left-3 top-3.5 h-5 w-5 flex items-center justify-center text-gray-400 font-bold text-xs">KM</div>
                                                    <Input type="number" className="pl-10 h-12 rounded-xl font-bold text-lg" {...field} />
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            {/* Upload Receipt */}
                            <div className="space-y-2">
                                <FormLabel>Foto del Ticket / Recibo</FormLabel>
                                <div className="relative border-2 border-dashed border-gray-200 rounded-2xl p-6 flex flex-col items-center gap-4 hover:bg-gray-50 transition-colors bg-gray-50/50">
                                    {form.watch("ticket_url") ? (
                                        <div className="relative w-full max-w-xs aspect-[3/4] rounded-xl overflow-hidden border shadow-sm">
                                            <img src={form.getValues("ticket_url")} alt="Ticket" className="object-cover w-full h-full" />
                                            <Button
                                                type="button"
                                                variant="destructive"
                                                size="sm"
                                                className="absolute top-2 right-2 rounded-full"
                                                onClick={() => form.setValue("ticket_url", "")}
                                            >
                                                Remover
                                            </Button>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="h-16 w-16 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                                                <Upload size={28} />
                                            </div>
                                            <div className="text-center">
                                                <p className="text-base font-semibold text-gray-900">Tomar Foto</p>
                                                <p className="text-sm text-gray-500">Ticket o Recibo</p>
                                            </div>
                                            <Input
                                                type="file"
                                                accept="image/*"
                                                capture="environment"
                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                onChange={onUpload}
                                                disabled={uploading}
                                            />
                                        </>
                                    )}
                                    {uploading && <Loader2 className="animate-spin text-blue-600" />}
                                </div>
                            </div>

                            <div className="pt-4">
                                <Button type="submit" size="lg" className="w-full h-14 rounded-2xl text-lg font-bold shadow-lg shadow-blue-200" disabled={loading || uploading}>
                                    {loading ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Guardando...</> : <><Save className="mr-2 h-5 w-5" /> Guardar Registro</>}
                                </Button>
                            </div>

                        </form>
                    </Form>
                </CardContent>
            </Card>

            {/* Warn Dialog */}
            <AlertDialog open={conflictAlertOpen} onOpenChange={setConflictAlertOpen}>
                <AlertDialogContent className="rounded-3xl border-none shadow-2xl bg-zinc-900 text-white">
                    <AlertDialogHeader>
                        <div className="mx-auto bg-yellow-500/20 w-16 h-16 rounded-full flex items-center justify-center mb-4">
                            <Fuel size={32} className="text-yellow-500" />
                        </div>
                        <AlertDialogTitle className="text-center text-xl font-bold">Advertencia de Responsabilidad</AlertDialogTitle>
                        <AlertDialogDescription className="text-center text-zinc-400 text-base">
                            El vehículo <strong>{pendingVehicleModel}</strong> está asignado a <strong>{pendingDriverName}</strong>.
                            <br /><br />
                            ¿Confirmas que estás realizando esta carga de combustible?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex-col sm:flex-row gap-2 mt-4">
                        <AlertDialogCancel
                            onClick={() => {
                                setPendingVehicleId(null)
                                form.setValue("vehicle_id", "")
                            }}
                            className="rounded-xl h-12 border-zinc-700 bg-transparent text-white hover:bg-zinc-800 hover:text-white"
                        >
                            Cancelar
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                if (pendingVehicleId) {
                                    form.setValue("vehicle_id", pendingVehicleId)
                                    // Add note
                                    const currentNote = form.getValues("notes") || ""
                                    if (!currentNote.includes("ADVERTENCIA")) {
                                        form.setValue("notes", currentNote + ` [SISTEMA: Carga realizada en vehículo de ${pendingDriverName}]`)
                                    }
                                }
                            }}
                            className="rounded-xl h-12 bg-yellow-500 text-black font-bold hover:bg-yellow-400"
                        >
                            Confirmar Carga
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            {/* MILEAGE CORRECTION ALERT */}
            <AlertDialog open={correctionAlertOpen} onOpenChange={setCorrectionAlertOpen}>
                <AlertDialogContent className="rounded-3xl border-none shadow-2xl bg-white text-zinc-900">
                    <AlertDialogHeader>
                        <div className="mx-auto bg-red-100 w-16 h-16 rounded-full flex items-center justify-center mb-4 text-red-600">
                            <AlertTriangle size={32} />
                        </div>
                        <AlertDialogTitle className="text-center text-xl font-bold">Incongruencia de Kilometraje</AlertDialogTitle>
                        <AlertDialogDescription className="text-center text-zinc-500 text-base space-y-2">
                            <p>
                                El sistema registra <strong>{correctionData?.currentSystemKm?.toLocaleString()} km</strong>, pero estás intentando ingresar <strong>{correctionData?.newMileage?.toLocaleString()} km</strong>.
                            </p>
                            <div className="bg-red-50 p-3 rounded-xl border border-red-100 text-red-800 text-sm font-medium">
                                Esto suele pasar si un registro anterior fue ingresado incorrectamente (ej. un cero de más).
                            </div>
                            <p className="pt-2">¿Deseas corregir el sistema usando tu dato como el verdadero?</p>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex-col sm:flex-row gap-2 mt-4">
                        <AlertDialogCancel
                            onClick={() => setCorrectionAlertOpen(false)}
                            className="rounded-xl h-12 border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50"
                        >
                            Cancelar
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                // Execute with FORCE flag
                                form.handleSubmit((v) => onSubmit(v, true))()
                            }}
                            className="rounded-xl h-12 bg-red-600 text-white font-bold hover:bg-red-700"
                        >
                            Sí, Corregir y Guardar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}


export default function NewFuelLogPage() {
    return (
        <Suspense fallback={<div className="p-6 text-center text-gray-500">Cargando formulario...</div>}>
            <NewFuelLogContent />
        </Suspense>
    )
}
