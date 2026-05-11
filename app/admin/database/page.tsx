"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Fuel, Loader2, Trash2, Stethoscope, CheckCircle2 } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { toast } from "sonner"
import { resetFuelLogsAction } from "./actions"
import { runIntegrityCheck, type IntegrityIssue } from "./integrity/actions"
import { useRouter } from "next/navigation"

export default function DatabaseManagementPage() {
    const [fuelLoading, setFuelLoading] = useState(false)
    const [integrityLoading, setIntegrityLoading] = useState(false)
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

                {/* FUEL */}
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
        </div>
    )
}
