"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { getAuditHistory } from "../../actions"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Calendar, FileText, ChevronRight, User, AlertCircle } from "lucide-react"

export default function AuditHistoryPage() {
    const params = useParams()
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [audits, setAudits] = useState<any[]>([])

    useEffect(() => {
        async function load() {
            try {
                const res = await getAuditHistory(params.id as string)
                setAudits(res)
            } catch (e) {
                console.error(e)
            } finally {
                setLoading(false)
            }
        }
        if (params.id) load()
    }, [params.id])

    return (
        <div className="min-h-screen bg-slate-50/50 p-6 md:p-10">
            <div className="max-w-4xl mx-auto mb-8">
                <Button onClick={() => router.push("/control")} variant="ghost" className="mb-4 pl-0 hover:bg-transparent hover:text-blue-600">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Volver al Tablero
                </Button>
                <div className="flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-slate-900">Historial de Auditorías</h1>
                </div>
            </div>

            <div className="max-w-4xl mx-auto space-y-4">
                {loading ? (
                    <div className="text-center py-10 text-slate-400">Cargando historial...</div>
                ) : audits.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-200">
                        <FileText className="mx-auto h-12 w-12 text-slate-200 mb-3" />
                        <h3 className="text-slate-900 font-medium">Sin historial</h3>
                        <p className="text-slate-500 text-sm">No se han realizado auditorías a esta entidad.</p>
                    </div>
                ) : (
                    audits.map((audit) => (
                        <div
                            key={audit.id}
                            onClick={() => router.push(`/control/history/view/${audit.id}`)}
                            className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all cursor-pointer flex items-center justify-between group"
                        >
                            <div className="flex items-center gap-4">
                                <div className={`h-12 w-12 rounded-full flex items-center justify-center ${audit.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                                    {audit.status === 'COMPLETED' ? <FileText size={20} /> : <AlertCircle size={20} />}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-bold text-slate-900 text-sm">Ref: {audit.id.slice(0, 8)}</h3>
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${audit.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-amber-100 text-amber-700 border-amber-200'}`}>
                                            {audit.status === 'COMPLETED' ? 'FINALIZADO' : 'PENDIENTE'}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3 mt-1">
                                        <div className="flex items-center gap-1 text-xs text-slate-500">
                                            <Calendar size={12} />
                                            <span className="capitalize">
                                                {new Date(audit.created_at).toLocaleDateString('es-VE', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                        {audit.notes && (
                                            <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md line-clamp-1 max-w-[200px]">
                                                {audit.notes}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <ChevronRight className="text-slate-300 group-hover:text-blue-600 transition-colors" />
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}
