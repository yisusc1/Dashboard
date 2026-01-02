"use client"

import { useState, useEffect } from "react"
import { getActiveSpools, getTeams, assignSpoolToTeam, returnSpool } from "./actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Disc, Plus, ArrowRight, History, Package, ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
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

export default function SpoolManagementPage() {
    const router = useRouter()
    const [spools, setSpools] = useState<any[]>([])
    const [teams, setTeams] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [isAssignOpen, setIsAssignOpen] = useState(false)

    // Alert Dialog State
    const [spoolReleaseId, setSpoolReleaseId] = useState<string | null>(null)
    const [actionLoading, setActionLoading] = useState(false)

    // Form
    const [selectedTeam, setSelectedTeam] = useState("")
    const [serial, setSerial] = useState("")
    const [meters, setMeters] = useState("1000")

    useEffect(() => {
        loadData()
    }, [])

    async function loadData() {
        setLoading(true)
        const [s, t] = await Promise.all([getActiveSpools(), getTeams()])
        setSpools(s)
        setTeams(t)
        setLoading(false)
    }

    async function handleAssign() {
        if (!selectedTeam || !serial || !meters) return toast.error("Complete todos los campos")

        const res = await assignSpoolToTeam(selectedTeam, serial, Number(meters))
        if (res.success) {
            toast.success("Bobina asignada correctamente")
            setIsAssignOpen(false)
            setSerial("")
            loadData()
        } else {
            toast.error("Error: " + res.error)
        }
    }

    function handleReturn(id: string) {
        setSpoolReleaseId(id)
    }

    async function executeReturn() {
        if (!spoolReleaseId) return
        setActionLoading(true)
        const res = await returnSpool(spoolReleaseId, 0)
        setActionLoading(false)

        if (res.success) {
            toast.success("Bobina liberada correctamente")
            setSpoolReleaseId(null)
            loadData()
        } else {
            toast.error("Error: " + res.error)
        }
    }

    return (
        <div className="min-h-screen bg-slate-50/50 p-6 md:p-10">
            <div className="max-w-6xl mx-auto">
                <Button
                    onClick={() => router.push("/control")}
                    variant="ghost"
                    className="mb-6 pl-0 hover:bg-transparent hover:text-blue-600"
                >
                    <ArrowLeft className="mr-2 h-4 w-4" /> Volver al Panel
                </Button>

                <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Gestión de Bobinas</h1>
                        <p className="text-slate-500 mt-1">Asigne y monitoree el consumo de fibra por equipo.</p>
                    </div>

                    <Dialog open={isAssignOpen} onOpenChange={setIsAssignOpen}>
                        <DialogTrigger asChild>
                            <Button className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-lg shadow-blue-500/20 rounded-xl px-6 h-12">
                                <Plus className="mr-2 h-4 w-4" />
                                Nueva Asignación
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md rounded-2xl w-[95vw]">
                            <DialogHeader>
                                <DialogTitle>Asignar Bobina a Grupo</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-700">Seleccionar Grupo</label>
                                    <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                                        <SelectTrigger className="rounded-xl border-slate-200 h-11">
                                            <SelectValue placeholder="Seleccione un equipo..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {teams.map(t => (
                                                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-700">Serial de Bobina</label>
                                    <Input
                                        placeholder="Ej. BOB-2023-001"
                                        value={serial}
                                        onChange={e => setSerial(e.target.value)}
                                        className="rounded-xl border-slate-200 h-11"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-700">Metraje Inicial (m)</label>
                                    <Input
                                        type="number"
                                        placeholder="1000"
                                        value={meters}
                                        onChange={e => setMeters(e.target.value)}
                                        className="rounded-xl border-slate-200 h-11"
                                    />
                                </div>
                                <Button className="w-full bg-blue-600 text-white font-bold rounded-xl h-12 mt-4" onClick={handleAssign}>
                                    Confirmar Asignación
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {spools.map((spool) => (
                        <Card key={spool.id} className="relative overflow-hidden border-slate-200 shadow-sm rounded-2xl group hover:shadow-md transition-all">
                            <div className="absolute top-0 right-0 p-4 opacity-50">
                                <Disc size={100} className="text-slate-100 -mr-6 -mt-6" />
                            </div>
                            <CardHeader>
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                                        <Package size={20} />
                                    </div>
                                    <div>
                                        <CardTitle className="text-lg font-bold text-slate-900">{spool.team?.name}</CardTitle>
                                        <p className="text-xs text-slate-500 font-mono">{spool.serial_number}</p>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-slate-500">Inicial</span>
                                        <span className="font-bold text-slate-900">{spool.initial_quantity}m</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-slate-500">Actual (Est.)</span>
                                        <span className={`font-bold ${spool.current_quantity < 300 ? 'text-red-500' : 'text-emerald-600'}`}>
                                            {spool.current_quantity}m
                                        </span>
                                    </div>
                                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full ${spool.current_quantity < 300 ? 'bg-red-500' : 'bg-emerald-500'}`}
                                            style={{ width: `${(spool.current_quantity / spool.initial_quantity) * 100}%` }}
                                        />
                                    </div>
                                    <p className="text-[10px] text-slate-400 text-center pt-2">
                                        Asignado el {new Date(spool.created_at).toLocaleDateString()}
                                    </p>
                                    <Button
                                        variant="outline"
                                        className="w-full border-red-100 text-red-600 hover:bg-red-50 hover:text-red-700"
                                        onClick={() => handleReturn(spool.id)}
                                    >
                                        Liberar / Terminar
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}

                    {spools.length === 0 && !loading && (
                        <div className="col-span-full py-20 text-center bg-white rounded-3xl border border-dashed border-slate-300">
                            <Disc size={48} className="mx-auto text-slate-300 mb-4" />
                            <h3 className="text-lg font-medium text-slate-900">No hay bobinas asignadas</h3>
                            <p className="text-slate-500 text-sm">Asigne una nueva bobina a un grupo para comenzar.</p>
                        </div>
                    )}
                </div>

                <AlertDialog open={!!spoolReleaseId} onOpenChange={(open) => !open && setSpoolReleaseId(null)}>
                    <AlertDialogContent className="rounded-2xl">
                        <AlertDialogHeader>
                            <AlertDialogTitle>¿Liberar bobina del equipo?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Esta acción desvinculará la bobina del equipo actual. Podrá ser asignada nuevamente más tarde.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel className="rounded-xl border-slate-200" disabled={actionLoading}>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                                className="bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold font-mono"
                                onClick={(e) => {
                                    e.preventDefault()
                                    executeReturn()
                                }}
                                disabled={actionLoading}
                            >
                                {actionLoading ? "Procesando..." : "Sí, Liberar Bobina"}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </div>
    )
}
