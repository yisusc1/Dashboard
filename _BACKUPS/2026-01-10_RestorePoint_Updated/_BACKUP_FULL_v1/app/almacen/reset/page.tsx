'use client'

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FileWarning, AlertTriangle, ArrowLeft, Loader2 } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { toast } from "sonner"
import { resetInventoryAction, resetOperationsAction } from "../actions"
import { useRouter } from "next/navigation"

export default function ResetInventoryPage() {
    const [isLoading, setIsLoading] = useState(false)
    const [isOpsLoading, setIsOpsLoading] = useState(false)
    const router = useRouter()

    const handleReset = async () => {
        if (!confirm("¿ESTÁS SEGURO? Esto borrará el STOCK y MOVIMIENTOS, pero mantendrá los clientes.")) return

        setIsLoading(true)
        try {
            const result = await resetInventoryAction()
            if (result.success) {
                toast.success("Inventario vaciado correctamente")
                router.push('/almacen')
            } else {
                toast.error("Error al vaciar inventario: " + result.error)
            }
        } catch (error) {
            toast.error("Error de conexión o permisos")
            console.error(error)
        } finally {
            setIsLoading(false)
        }
    }

    const handleResetOps = async () => {
        if (!confirm("¿ESTÁS SEGURO? Esto borrará TODOS los reportes, instalaciones y clientes.")) return

        setIsOpsLoading(true)
        try {
            const result = await resetOperationsAction()
            if (result.success) {
                toast.success("Operaciones reiniciadas correctamente")
                router.refresh()
            } else {
                toast.error("Error al reiniciar operaciones: " + result.error)
            }
        } catch (error) {
            toast.error("Error de conexión o permisos")
            console.error(error)
        } finally {
            setIsOpsLoading(false)
        }
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-4">
            <Link href="/almacen" className="self-start mb-8">
                <Button variant="ghost" className="gap-2">
                    <ArrowLeft size={16} />
                    Volver al Almacén
                </Button>
            </Link>

            <div className="grid md:grid-cols-2 gap-6 max-w-4xl w-full">

                {/* INVENTORY RESET */}
                <Card className="border-red-200 bg-red-50/30">
                    <CardHeader className="text-center">
                        <div className="mx-auto bg-red-100 p-4 rounded-full mb-4 w-fit">
                            <AlertTriangle className="text-red-600" size={32} />
                        </div>
                        <CardTitle className="text-2xl text-red-700">Vaciar Almacén</CardTitle>
                        <CardDescription>
                            Reinicia el stock a 0.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="text-sm text-zinc-600 bg-white p-4 rounded-lg border border-red-100 shadow-sm h-32 overflow-y-auto">
                            <p className="font-semibold text-red-800 mb-2">Lo que sucederá:</p>
                            <ul className="list-disc pl-5 space-y-1">
                                <li>Se borrará todo el <strong>historial de movimientos</strong> del almacén.</li>
                                <li>Se borrarán todas las <strong>asignaciones y devoluciones</strong>.</li>
                                <li>El stock de TODOS los productos será <strong>0</strong>.</li>
                                <li>Los productos y Clientes <strong>NO</strong> se borrarán.</li>
                            </ul>
                        </div>

                        <Button
                            variant="destructive"
                            size="lg"
                            className="w-full font-bold"
                            onClick={handleReset}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Vaciando Almacén...
                                </>
                            ) : (
                                "Vaciar SOLO Almacén"
                            )}
                        </Button>
                    </CardContent>
                </Card>

                {/* OPERATIONS RESET */}
                <Card className="border-orange-200 bg-orange-50/30">
                    <CardHeader className="text-center">
                        <div className="mx-auto bg-orange-100 p-4 rounded-full mb-4 w-fit">
                            <FileWarning className="text-orange-600" size={32} />
                        </div>
                        <CardTitle className="text-2xl text-orange-700">Reiniciar Operaciones</CardTitle>
                        <CardDescription>
                            Borra reportes y clientes antiguos.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="text-sm text-zinc-600 bg-white p-4 rounded-lg border border-orange-100 shadow-sm h-32 overflow-y-auto">
                            <p className="font-semibold text-orange-800 mb-2">Lo que sucederá:</p>
                            <ul className="list-disc pl-5 space-y-1">
                                <li>Se borrarán todos los <strong>Reportes de Instalación (Cierres)</strong>.</li>
                                <li>Se borrarán todas las <strong>Asignaciones Pendientes</strong>.</li>
                                <li>Se borrará la lista de <strong>Clientes</strong>.</li>
                                <li>El Inventario/Stock <strong>NO</strong> se tocará.</li>
                            </ul>
                        </div>

                        <Button
                            variant="outline"
                            size="lg"
                            className="w-full font-bold border-orange-200 text-orange-700 hover:bg-orange-100 hover:text-orange-800"
                            onClick={handleResetOps}
                            disabled={isOpsLoading}
                        >
                            {isOpsLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Borrando...
                                </>
                            ) : (
                                "Borrar Reportes y Clientes"
                            )}
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
