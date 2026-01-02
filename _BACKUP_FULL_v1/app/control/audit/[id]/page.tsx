"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { getAuditData, saveAudit } from "../../actions"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { CheckCircle2, AlertOctagon, ArrowLeft, Save, AlertTriangle, Box } from "lucide-react"

export default function AuditPage() {
    const params = useParams()
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [data, setData] = useState<any>(null)
    const [counts, setCounts] = useState<Record<string, number>>({})
    const [reconcile, setReconcile] = useState(false)

    const handleSave = async () => {
        try {
            setLoading(true)
            const auditPayload = {
                entityId: data.technician.id,
                entityType: data.technician.type,
                members: data.technician.members,
                notes,
                reconcileStock: reconcile, // Pass flag
                items: data.stock.map((item: any) => ({
                    sku: item.sku,
                    name: item.name,
                    productId: item.productId,
                    theoretical: (item.assigned - item.reported),
                    physical: counts[item.sku] || 0
                }))
            }
            const res = await saveAudit(auditPayload)

            if (res.warning) {
                toast.warning("Auditoría guardada, pero: " + res.warning)
            } else {
                toast.success(reconcile ? "Auditoría guardada y stock ajustado." : "Auditoría guardada.")
            }

            router.push("/control")
        } catch (e: any) {
            toast.error("Error guardando: " + e.message)
        } finally {
            setLoading(false)
        }
    }

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50/50 text-slate-400">Cargando datos de auditoría...</div>

    return (
        <div className="min-h-screen bg-slate-50/50 p-6 md:p-10 pb-32">
            {/* HEADER */}
            <div className="max-w-5xl mx-auto mb-8">
                {/* ... existing header ... */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <Button onClick={() => router.push("/control")} variant="ghost" size="icon" className="rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200/50">
                                <ArrowLeft size={24} />
                            </Button>
                            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Auditoría de Stock</h1>
                        </div>
                        <div className="flex flex-col ml-2">
                            <p className="text-slate-500">
                                Verificando a <span className="font-bold text-slate-800">{data?.technician?.first_name}</span>
                            </p>
                            {data?.technician?.type === 'TEAM' && data?.technician?.members && (
                                <p className="text-xs text-slate-400 mt-1">
                                    Miembros: {data.technician.members.map((m: any) => `${m.first_name} ${m.last_name}`).join(", ")}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-5xl mx-auto space-y-6">
                {/* MATERIALS LIST */}
                <div className="grid gap-4">
                    {data?.stock.map((item: any) => {
                        const theoretical = item.assigned - item.reported
                        const physical = counts[item.sku] === undefined || counts[item.sku] === "" ? 0 : counts[item.sku]
                        const diff = calculateDiff(theoretical, physical)
                        const hasInput = counts[item.sku] !== undefined && counts[item.sku] !== ""

                        return (
                            <div key={item.sku} className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col md:flex-row items-center gap-6">
                                {/* ICON & INFO */}
                                <div className="flex items-center gap-4 flex-1 w-full">
                                    <div className="h-12 w-12 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center">
                                        <Box size={24} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg text-slate-900">{item.name}</h3>
                                        <p className="text-xs text-slate-400 font-mono">{item.sku}</p>

                                        {item.serials && item.serials.length > 0 && (
                                            <div className="mt-2 flex flex-wrap gap-1">
                                                {item.serials.map((s: string) => (
                                                    <span key={s} className="px-1.5 py-0.5 rounded text-[10px] uppercase font-bold bg-blue-50 text-blue-600 border border-blue-100">
                                                        {s}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* STATS GRID */}
                                <div className="flex items-center gap-8 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
                                    <div className="text-center min-w-[80px]">
                                        <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">Asignado</p>
                                        <p className="font-medium text-slate-600">{item.assigned}</p>
                                    </div>
                                    <div className="text-center min-w-[80px]">
                                        <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">Reportado</p>
                                        <p className="font-medium text-slate-600">{item.reported}</p>
                                    </div>
                                    <div className="text-center min-w-[80px] bg-blue-50/50 p-2 rounded-xl border border-blue-100/50">
                                        <p className="text-[10px] uppercase tracking-wider text-blue-400 font-bold mb-1">Teórico</p>
                                        <p className={`font-bold text-xl ${theoretical < 0 ? 'text-red-500' : 'text-blue-700'}`}>{theoretical}</p>
                                    </div>
                                </div>

                                {/* INPUT ACTION */}
                                <div className="flex items-center gap-4 w-full md:w-auto border-t md:border-t-0 pt-4 md:pt-0 mt-2 md:mt-0 md:pl-6 md:border-l border-slate-100">
                                    <div className="text-right">
                                        <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">Físico</p>
                                        <div className="relative">
                                            <Input
                                                type="number"
                                                className="w-24 text-center font-bold text-lg h-12 rounded-xl bg-slate-50 border-slate-200 focus:ring-blue-500/20"
                                                placeholder="0"
                                                value={counts[item.sku] === undefined ? "" : counts[item.sku]}
                                                onChange={(e) => handleCountChange(item.sku, e.target.value)}
                                            />
                                            {item.sku === 'CARRETE' && <span className="absolute -bottom-4 right-0 text-[9px] text-slate-400">metros</span>}
                                        </div>
                                    </div>

                                    {/* STATUS BADGE */}
                                    <div className="w-[100px] flex justify-center">
                                        {hasInput && diff === 0 && (
                                            <div className="flex flex-col items-center text-emerald-500 animate-in fade-in zoom-in duration-300">
                                                <CheckCircle2 size={28} />
                                                <span className="text-[10px] font-bold mt-1">Correcto</span>
                                            </div>
                                        )}
                                        {hasInput && diff !== 0 && (
                                            <div className={`flex flex-col items-center animate-in fade-in zoom-in duration-300 ${diff < 0 ? "text-red-500" : "text-amber-500"}`}>
                                                <AlertOctagon size={28} />
                                                <span className="text-[10px] font-bold mt-1">
                                                    {diff > 0 ? `Sobra ${diff}` : `Falta ${Math.abs(diff)}`}
                                                </span>
                                            </div>
                                        )}
                                        {!hasInput && (
                                            <div className="h-2 w-2 rounded-full bg-slate-200" />
                                        )}
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>

                {/* NOTES CARD */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200">
                    <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <AlertTriangle size={18} className="text-slate-400" />
                        Observaciones
                    </h3>
                    <textarea
                        className="w-full min-h-[100px] p-4 rounded-xl bg-slate-50 border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none"
                        placeholder="Escribe aquí si hubo material dañado, carretes vacíos, o justificaciones..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                    />
                </div>
            </div>

            {/* FLOATING FOOTER ACTION */}
            <div className="fixed bottom-0 left-0 right-0 p-6 bg-white/80 backdrop-blur-xl border-t border-slate-200 z-50">
                <div className="max-w-5xl mx-auto flex items-center justify-between">
                    <div>
                        <p className="text-sm font-semibold text-slate-900">Resumen de Auditoría</p>
                        <div className="flex items-center gap-2 mt-1">
                            <input
                                type="checkbox"
                                id="reconcile"
                                checked={reconcile}
                                onChange={(e) => setReconcile(e.target.checked)}
                                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                            />
                            <label htmlFor="reconcile" className="text-xs text-slate-600 cursor-pointer select-none">
                                Ajustar inventario a valores físicos (Reconciliación)
                            </label>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <Button variant="outline" className="rounded-xl h-12 px-6 border-slate-200 text-slate-600 hover:bg-slate-100" onClick={() => router.push("/control")}>
                            Cancelar
                        </Button>
                        <Button onClick={handleSave} disabled={loading} className="rounded-xl h-12 px-8 bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/20 text-white font-semibold">
                            {loading ? "Guardando..." : <><Save className="mr-2 h-4 w-4" /> Finalizar Auditoría</>}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}
