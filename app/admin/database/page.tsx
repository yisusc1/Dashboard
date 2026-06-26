"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Fuel, Loader2, Trash2, Stethoscope, CheckCircle2 } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { toast } from "sonner"
import { resetFuelLogsAction } from "./actions"
import { runIntegrityCheck, type IntegrityIssue } from "./integrity/actions"
import { cleanMonthData } from "@/app/control/combustible/cleanAction"
import { useRouter } from "next/navigation"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { AlertTriangle } from "lucide-react"

export default function DatabaseManagementPage() {
    const [fuelLoading, setFuelLoading] = useState(false)
    const [integrityLoading, setIntegrityLoading] = useState(false)
    const [cleanupDialogOpen, setCleanupDialogOpen] = useState(false)
    const [cleaning, setCleaning] = useState(false)
    const [integrityIssues, setIntegrityIssues] = useState<IntegrityIssue[]>([])

    const router = useRouter()

    const handleResetFuel = async () => {
        if (!confirm("⚠️ ¿ESTÁS SEGURO?\n\nEsto borrará:\n- Todo el historial de carga de combustible.\n\nNO borrará los vehículos.")) return

        setFuelLoading(true)
        try {
            const result = await resetFuelLogsAction()
            if (result.success) {
                toast.success("Logs de combustible eliminados")
                router.refresh()
            } else {
                toast.error("Error: " + result.error)
            }
        } catch (error) {
            toast.error("Error de conexión")
        } finally {
            setFuelLoading(false)
        }
    }

    const handleCleanup = async () => {
        setCleaning(true)
        try {
            const res = await cleanMonthData()
            if (res.success) {
                toast.success(res.message || "Limpieza completada")
                setCleanupDialogOpen(false)
                router.refresh()
            } else {
                toast.error("Error: " + res.error)
            }
        } catch (error: any) {
            toast.error("Error inesperado al limpiar")
        } finally {
            setCleaning(false)
        }
    }

    const handleIntegrityCheck = async () => {
        setIntegrityLoading(true)
        setIntegrityIssues([])
        try {
            const issues = await runIntegrityCheck()
            setIntegrityIssues(issues)
            if (issues.length === 0) {
                toast.success("Base de Datos Saludable")
            } else {
                toast.warning(`Se detectaron ${issues.length} problemas`)
            }
        } catch (error) {
            toast.error("Error al ejecutar diagnóstico")
        } finally {
            setIntegrityLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-slate-50/50 p-6 md:p-10">
            <div className="max-w-4xl mx-auto mb-10">
                <div className="flex items-center gap-2 mb-2">
                    <Link href="/admin" className="p-2 -ml-2 rounded-full hover:bg-slate-200/50 transition-colors text-slate-500">
                        <ArrowLeft size={24} />
                    </Link>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">Gestión de Base de Datos</h1>
                </div>
                <p className="text-slate-500">Herramientas de limpieza y reinicio para pruebas (Testing).</p>
            </div>

            <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* MONTH END CLEANUP */}
                <Card className="border-red-200 bg-red-50/30">
                    <CardHeader>
                        <div className="w-12 h-12 rounded-lg bg-red-100 flex items-center justify-center text-red-600 mb-4">
                            <Trash2 size={24} />
                        </div>
                        <CardTitle className="text-xl text-red-700">Limpieza de Fin de Mes</CardTitle>
                        <CardDescription>Vacía el historial antiguo y las imágenes de combustible.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="text-sm text-red-800 bg-red-100/50 p-3 rounded-lg border border-red-100">
                            <strong>Conserva:</strong> El último ticket de cada vehículo para no descontrolar secuencias.
                        </div>
                        <Button
                            className="w-full font-bold bg-red-600 hover:bg-red-700 text-white"
                            onClick={() => setCleanupDialogOpen(true)}
                            disabled={cleaning}
                        >
                            {cleaning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                            Vaciar Datos del Mes
                        </Button>
                    </CardContent>
                </Card>

                {/* FUEL RESET */}
                <Card className="border-blue-200 bg-blue-50/30">
                    <CardHeader>
                        <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 mb-4">
                            <Fuel size={24} />
                        </div>
                        <CardTitle className="text-xl text-blue-700">Reiniciar Combustible</CardTitle>
                        <CardDescription>Borra el historial de carga de combustible.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="text-sm text-blue-800 bg-blue-100/50 p-3 rounded-lg border border-blue-100">
                            <strong>Conserva:</strong> Vehículos, Conductores.
                        </div>
                        <Button
                            className="w-full font-bold bg-blue-600 hover:bg-blue-700 text-white"
                            onClick={handleResetFuel}
                            disabled={fuelLoading}
                        >
                            {fuelLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                            Borrar Logs Fuel
                        </Button>
                    </CardContent>
                </Card>

                {/* INTEGRITY */}
                <Card className="border-zinc-200 bg-white">
                    <CardHeader>
                        <div className="w-12 h-12 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-600 mb-4">
                            <Stethoscope size={24} />
                        </div>
                        <CardTitle className="text-xl text-zinc-900">Verificador de Salud</CardTitle>
                        <CardDescription>Detecta inconsistencias en la base de datos.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Button
                            variant="outline"
                            className="w-full text-zinc-700 hover:bg-zinc-50"
                            onClick={handleIntegrityCheck}
                            disabled={integrityLoading}
                        >
                            {integrityLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                            Escanear Base de Datos
                        </Button>

                        {integrityIssues.length > 0 && (
                            <div className="space-y-2 mt-4 max-h-40 overflow-y-auto">
                                {integrityIssues.map((issue, idx) => (
                                    <div key={idx} className={`p-2 rounded text-xs border ${issue.type === 'CRITICAL' ? 'bg-red-50 border-red-100 text-red-700' : 'bg-yellow-50 border-yellow-100 text-yellow-700'}`}>
                                        <strong>{issue.title}:</strong> {issue.description}
                                    </div>
                                ))}
                            </div>
                        )}
                        {integrityIssues.length === 0 && !integrityLoading && (
                            <div className="text-xs text-center text-zinc-400 italic mt-2">
                                Sistema estable. No se detectaron problemas.
                            </div>
                        )}
                    </CardContent>
                </Card>

            </div>

            {/* CLEANUP DIALOG */}
            <AlertDialog open={cleanupDialogOpen} onOpenChange={setCleanupDialogOpen}>
                <AlertDialogContent className="rounded-[32px] max-w-md p-6">
                    <AlertDialogHeader>
                        <div className="h-16 w-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4 mx-auto">
                            <AlertTriangle size={32} />
                        </div>
                        <AlertDialogTitle className="text-center text-2xl font-black text-slate-900">¿Vaciar Base de Datos?</AlertDialogTitle>
                        <AlertDialogDescription className="text-center text-sm font-medium text-slate-500">
                            Esta acción <strong className="text-red-600">eliminará todas las fotos</strong> de los tickets del servidor de producción, y borrará el historial antiguo.
                            <br/><br/>
                            El sistema mantendrá automáticamente el <strong>último registro</strong> de cada vehículo.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex-col sm:flex-row gap-3 mt-6">
                        <AlertDialogCancel className="rounded-2xl h-12 border-slate-200 text-slate-600 font-bold w-full m-0">Cancelar</AlertDialogCancel>
                        <Button 
                            variant="destructive"
                            onClick={handleCleanup}
                            disabled={cleaning}
                            className="rounded-2xl h-12 font-black w-full shadow-lg shadow-red-200 m-0"
                        >
                            {cleaning ? "Vaciando..." : "Sí, vaciar datos"}
                        </Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
