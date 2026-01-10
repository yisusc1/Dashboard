"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Home as HomeIcon, Truck, LogOut, ArrowRight, AlertTriangle } from "lucide-react"
import { LogoutButton } from "@/components/ui/logout-button"
import { SalidaFormDialog } from "@/components/salida-form-dialog"
import { EntradaFormDialog } from "@/components/entrada-form-dialog"
import { ReportFaultDialog } from "@/components/report-fault-dialog"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"

type Vehiculo = {
    id: string
    modelo: string
    placa: string
    codigo: string
}

export default function TransportePage() {
    const [salidaOpen, setSalidaOpen] = useState(false)
    const [entradaOpen, setEntradaOpen] = useState(false)
    const [faultOpen, setFaultOpen] = useState(false)

    // For selecting vehicle to report fault
    const [vehicleSelectOpen, setVehicleSelectOpen] = useState(false)
    const [vehicles, setVehicles] = useState<Vehiculo[]>([])
    const [selectedVehicleId, setSelectedVehicleId] = useState<string>("")

    useEffect(() => {
        loadVehicles()
    }, [])

    async function loadVehicles() {
        const supabase = createClient()
        const { data } = await supabase.from('vehiculos').select('id, modelo, placa, codigo')
        if (data) setVehicles(data)
    }

    const startFaultReporting = () => {
        setVehicleSelectOpen(true)
    }

    const confirmVehicleSelection = () => {
        if (!selectedVehicleId) return
        setVehicleSelectOpen(false)
        setFaultOpen(true)
    }

    return (
        <main className="min-h-screen bg-zinc-50 pb-20">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-12">

                {/* HEADER */}
                <div className="flex justify-between items-end mb-12">
                    <div>
                        <h1 className="text-3xl font-bold text-zinc-900 tracking-tight">Panel de Transporte</h1>
                        <p className="text-zinc-500 font-medium mt-1">Control de Flota y Operaciones</p>
                    </div>
                    <div className="flex gap-2">
                        <a
                            href="/"
                            className="p-2 text-zinc-400 hover:text-zinc-900 transition-colors rounded-full hover:bg-zinc-100 flex items-center justify-center"
                            title="Ir al inicio"
                        >
                            <HomeIcon size={24} />
                        </a>
                        <LogoutButton />
                    </div>
                </div>

                {/* ACTIONS GRID */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                    {/* REGISTRAR SALIDA */}
                    <button
                        onClick={() => setSalidaOpen(true)}
                        className="group relative overflow-hidden bg-white rounded-[32px] p-8 border border-zinc-200 shadow-sm hover:shadow-xl hover:border-zinc-300 transition-all duration-300 text-left"
                    >
                        <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110 duration-500">
                            <Truck size={100} />
                        </div>
                        <div className="relative z-10 flex flex-col h-full justify-between space-y-6">
                            <div className="w-12 h-12 rounded-2xl bg-zinc-100 flex items-center justify-center text-zinc-900 group-hover:bg-black group-hover:text-white transition-colors">
                                <Truck size={24} />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-zinc-900 mb-2">Registrar Salida</h2>
                                <p className="text-zinc-500 text-sm font-medium">Autorizar salida de vehículo para ruta o servicio.</p>
                            </div>
                            <div className="flex items-center text-zinc-900 font-bold text-sm group-hover:translate-x-1 transition-transform">
                                Iniciar <ArrowRight size={16} className="ml-2" />
                            </div>
                        </div>
                    </button>

                    {/* REGISTRAR ENTRADA */}
                    <button
                        onClick={() => setEntradaOpen(true)}
                        className="group relative overflow-hidden bg-white rounded-[32px] p-8 border border-zinc-200 shadow-sm hover:shadow-xl hover:border-zinc-300 transition-all duration-300 text-left"
                    >
                        <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110 duration-500">
                            <LogOut size={100} className="scale-x-[-1]" />
                        </div>
                        <div className="relative z-10 flex flex-col h-full justify-between space-y-6">
                            <div className="w-12 h-12 rounded-2xl bg-zinc-100 flex items-center justify-center text-zinc-900 group-hover:bg-black group-hover:text-white transition-colors">
                                <LogOut size={24} className="scale-x-[-1]" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-zinc-900 mb-2">Registrar Entrada</h2>
                                <p className="text-zinc-500 text-sm font-medium">Cerrar ruta y registrar kilometraje de llegada.</p>
                            </div>
                            <div className="flex items-center text-zinc-900 font-bold text-sm group-hover:translate-x-1 transition-transform">
                                Registrar <ArrowRight size={16} className="ml-2" />
                            </div>
                        </div>
                    </button>

                    {/* REPORTAR FALLA */}
                    <button
                        onClick={startFaultReporting}
                        className="group relative overflow-hidden bg-white rounded-[32px] p-8 border border-zinc-200 shadow-sm hover:shadow-xl hover:border-red-200 transition-all duration-300 text-left"
                    >
                        <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110 duration-500">
                            <AlertTriangle size={100} />
                        </div>
                        <div className="relative z-10 flex flex-col h-full justify-between space-y-6">
                            <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center text-red-600 group-hover:bg-red-600 group-hover:text-white transition-colors">
                                <AlertTriangle size={24} />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-zinc-900 mb-2">Reportar Falla</h2>
                                <p className="text-zinc-500 text-sm font-medium">Notificar averías o solicitar mantenimiento.</p>
                            </div>
                            <div className="flex items-center text-red-600 font-bold text-sm group-hover:translate-x-1 transition-transform">
                                Reportar <ArrowRight size={16} className="ml-2" />
                            </div>
                        </div>
                    </button>

                </div>

                {/* MODALS */}
                <SalidaFormDialog
                    isOpen={salidaOpen}
                    onClose={() => setSalidaOpen(false)}
                />

                <EntradaFormDialog
                    isOpen={entradaOpen}
                    onClose={() => setEntradaOpen(false)}
                />

                <Dialog open={vehicleSelectOpen} onOpenChange={setVehicleSelectOpen}>
                    <DialogContent className="sm:max-w-md rounded-2xl border-none shadow-2xl">
                        <DialogHeader>
                            <DialogTitle className="text-center text-xl font-bold">Seleccionar Vehículo</DialogTitle>
                        </DialogHeader>
                        <div className="py-4">
                            <label className="text-sm font-semibold text-zinc-700 mb-2 block">Vehículo con Falla</label>
                            <Select value={selectedVehicleId} onValueChange={setSelectedVehicleId}>
                                <SelectTrigger className="h-12 rounded-xl">
                                    <SelectValue placeholder="Seleccione un vehículo..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {vehicles.map(v => (
                                        <SelectItem key={v.id} value={v.id}>
                                            {v.modelo} - {v.placa} ({v.codigo})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setVehicleSelectOpen(false)} className="rounded-xl">Cancelar</Button>
                            <Button
                                onClick={confirmVehicleSelection}
                                disabled={!selectedVehicleId}
                                className="rounded-xl bg-black text-white hover:bg-zinc-800"
                            >
                                Continuar
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {selectedVehicleId && (
                    <ReportFaultDialog
                        isOpen={faultOpen}
                        onClose={() => {
                            setFaultOpen(false)
                            setSelectedVehicleId("") // Reset on close
                        }}
                        vehicleId={selectedVehicleId}
                        onFaultReported={() => { }}
                    />
                )}
            </div>
        </main>
    )
}
