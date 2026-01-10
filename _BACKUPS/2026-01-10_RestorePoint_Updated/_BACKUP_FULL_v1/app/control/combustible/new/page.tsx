"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { format } from "date-fns"
import { CalendarIcon, Upload, Loader2, Save, ArrowLeft, Fuel } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
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
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"

import { createFuelLog, getVehicles } from "../actions"
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

export default function NewFuelLogPage() {
    const router = useRouter()
    const [vehicles, setVehicles] = useState<any[]>([])
    const [uploading, setUploading] = useState(false)
    const [loading, setLoading] = useState(false)
    const supabase = createClient()

    useEffect(() => {
        getVehicles().then(setVehicles)
    }, [])

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            ticket_number: "",
            driver_name: "",
            liters: 0,
            mileage: 0,
            ticket_url: "",
            notes: ""
        },
    })

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

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        setLoading(true)
        try {
            const res = await createFuelLog(values)
            if (res.success) {
                toast.success("Registro guardado correctamente")
                router.push("/control/combustible")
            } else {
                toast.error("Error: " + res.error)
            }
        } catch (error) {
            toast.error("Error inesperado")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="p-6 max-w-3xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/control/combustible">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft size={20} />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Nuevo Registro de Combustible</h1>
                    <p className="text-muted-foreground">Carga los datos del ticket de la estación de servicio.</p>
                </div>
            </div>

            <Card className="border-slate-200 shadow-sm">
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
                                                <Input placeholder="Ej. A-123456" {...field} />
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
                                            <FormLabel>Fecha y Hora</FormLabel>
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <FormControl>
                                                        <Button
                                                            variant={"outline"}
                                                            className={cn(
                                                                "w-full pl-3 text-left font-normal",
                                                                !field.value && "text-muted-foreground"
                                                            )}
                                                        >
                                                            {field.value ? (
                                                                format(field.value, "dd/MM/yyyy HH:mm")
                                                            ) : (
                                                                <span>Seleccione fecha</span>
                                                            )}
                                                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                        </Button>
                                                    </FormControl>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0" align="start">
                                                    <Calendar
                                                        mode="single"
                                                        selected={field.value}
                                                        onSelect={field.onChange}
                                                        initialFocus
                                                    />
                                                    <div className="p-3 border-t">
                                                        <Input
                                                            type="time"
                                                            className="w-full"
                                                            onChange={(e) => {
                                                                const date = field.value || new Date()
                                                                const [hours, minutes] = e.target.value.split(':')
                                                                date.setHours(parseInt(hours))
                                                                date.setMinutes(parseInt(minutes))
                                                                field.onChange(date)
                                                            }}
                                                        />
                                                    </div>
                                                </PopoverContent>
                                            </Popover>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            {/* Vehicle & Driver */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <FormField
                                    control={form.control}
                                    name="vehicle_id"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Vehículo</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Seleccione vehículo" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {vehicles.map((v) => (
                                                        <SelectItem key={v.id} value={v.id}>
                                                            {v.codigo} - {v.modelo} ({v.placa})
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
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
                                                <Input placeholder="Nombre del chofer" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            {/* Consumption Data */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <FormField
                                    control={form.control}
                                    name="liters"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Cantidad de Litros</FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <Fuel className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                                    <Input type="number" step="0.01" className="pl-9" {...field} />
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
                                            <FormLabel>Kilometraje (Odométro)</FormLabel>
                                            <FormControl>
                                                <Input type="number" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            {/* Upload Receipt */}
                            <div className="space-y-2">
                                <FormLabel>Foto del Ticket / Recibo</FormLabel>
                                <div className="border-2 border-dashed border-slate-200 rounded-lg p-6 flex flex-col items-center gap-4 hover:bg-slate-50 transition-colors">
                                    {form.watch("ticket_url") ? (
                                        <div className="relative w-full max-w-xs aspect-[3/4] rounded-lg overflow-hidden border">
                                            <img src={form.getValues("ticket_url")} alt="Ticket" className="object-cover w-full h-full" />
                                            <Button
                                                type="button"
                                                variant="destructive"
                                                size="sm"
                                                className="absolute top-2 right-2"
                                                onClick={() => form.setValue("ticket_url", "")}
                                            >
                                                Remover
                                            </Button>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="h-12 w-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                                                <Upload size={24} />
                                            </div>
                                            <div className="text-center">
                                                <p className="text-sm font-medium">Subir imagen del ticket</p>
                                                <p className="text-xs text-slate-400">JPG, PNG (Max 5MB)</p>
                                            </div>
                                            <Input
                                                type="file"
                                                accept="image/*"
                                                capture="environment"
                                                className="max-w-xs"
                                                onChange={onUpload}
                                                disabled={uploading}
                                            />
                                        </>
                                    )}
                                    {uploading && <Loader2 className="animate-spin text-blue-600" />}
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4">
                                <Link href="/control/combustible">
                                    <Button variant="outline" type="button">Cancelar</Button>
                                </Link>
                                <Button type="submit" disabled={loading || uploading}>
                                    {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Guardando...</> : <><Save className="mr-2 h-4 w-4" /> Guardar Registro</>}
                                </Button>
                            </div>

                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    )
}
