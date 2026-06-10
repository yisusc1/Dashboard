"use client"

import { useState, useEffect, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { Loader2, Search, Filter, AlertCircle, ChevronDown, ChevronUp, Calendar, User, Users } from "lucide-react"

type Report = {
  id: string
  date: string
  equipo_nombre: string
  tecnico_lider: string
  tecnico_auxiliar: string | null
  supervisor_id: string
  report_data: any
}

const getSupervisorName = async (supabase: any, id: string) => {
    const { data } = await supabase.from('profiles').select('first_name, last_name').eq('id', id).single()
    if (!data) return "Desconocido"
    return `${data.first_name || ''} ${data.last_name || ''}`.trim() || "Desconocido"
}

export default function EquipmentHistoryViewer() {
  const supabase = createClient()
  const [reports, setReports] = useState<Report[]>([])
  const [supervisors, setSupervisors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)

  // Filters
  const [dateFilter, setDateFilter] = useState("")
  const [equipoFilter, setEquipoFilter] = useState("")
  const [tecnicoFilter, setTecnicoFilter] = useState("")
  const [criticalFilter, setCriticalFilter] = useState(false)

  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    fetchHistory()
  }, [])

  const fetchHistory = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('equipment_control_reports')
      .select('*')
      .neq('equipo_nombre', 'DRAFT')
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })

    if (data) {
        setReports(data)
        
        // Fetch unique supervisors
        const supIds = Array.from(new Set(data.map(r => r.supervisor_id)))
        const supMap: Record<string, string> = {}
        for (const id of supIds) {
            supMap[id] = await getSupervisorName(supabase, id)
        }
        setSupervisors(supMap)
    }
    setLoading(false)
  }

  // Check if a report contains any critical issue
  const hasCriticalIssue = (reportData: any) => {
      let hasCritical = false
      const checkGroup = (group: any) => {
          if (!group) return
          Object.values(group).forEach((v: any) => {
              const estado = typeof v === 'object' ? v.estado : v
              if (estado === 'Extraviado' || estado === 'Dañado') hasCritical = true
          })
      }
      checkGroup(reportData.kit_lider)
      checkGroup(reportData.epp_lider)
      checkGroup(reportData.kit_auxiliar)
      checkGroup(reportData.epp_auxiliar)
      checkGroup(reportData.herramientas)
      return hasCritical
  }

  const filteredReports = useMemo(() => {
      return reports.filter(r => {
          if (dateFilter && r.date !== dateFilter) return false
          if (equipoFilter && !r.equipo_nombre.toLowerCase().includes(equipoFilter.toLowerCase())) return false
          if (tecnicoFilter) {
              const term = tecnicoFilter.toLowerCase()
              const lider = (r.tecnico_lider || "").toLowerCase()
              const aux = (r.tecnico_auxiliar || "").toLowerCase()
              if (!lider.includes(term) && !aux.includes(term)) return false
          }
          if (criticalFilter && !hasCriticalIssue(r.report_data)) return false
          return true
      })
  }, [reports, dateFilter, equipoFilter, tecnicoFilter, criticalFilter])

  const uniqueEquipos = Array.from(new Set(reports.map(r => r.equipo_nombre)))

  const toggleExpand = (id: string) => {
      setExpandedId(prev => prev === id ? null : id)
  }

  const renderGroup = (group: any, title: string) => {
      if (!group || Object.keys(group).length === 0) return null
      
      const items = Object.entries(group).filter(([_, v]: any) => {
          const e = typeof v === 'object' ? v.estado : v
          return e && e !== "No Aplica"
      })

      if (items.length === 0) return null

      return (
          <div className="mb-4">
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 border-b pb-1">{title}</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {items.map(([item, v]: any) => {
                      const estado = typeof v === 'object' ? v.estado : v
                      const isCritical = estado === 'Extraviado' || estado === 'Dañado'
                      return (
                          <div key={item} className={`flex justify-between items-center p-2 rounded-lg text-sm ${isCritical ? 'bg-red-50 border border-red-100' : 'bg-gray-50'}`}>
                              <span className="font-medium text-gray-700">{item}</span>
                              <span className={`font-bold ${
                                  estado === 'Extraviado' ? 'text-red-600' : 
                                  estado === 'Dañado' ? 'text-orange-600' : 
                                  estado === 'Operativo' ? 'text-green-600' : 'text-gray-600'
                              }`}>
                                  {estado}
                              </span>
                          </div>
                      )
                  })}
              </div>
          </div>
      )
  }

  if (loading) {
      return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-gray-400" /></div>
  }

  return (
    <div className="w-full max-w-6xl mx-auto">
        <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Historial de Auditorías</h1>
            <p className="text-gray-500">Revisa el estado histórico de los equipos y herramientas.</p>
        </div>

        {/* FILTERS */}
        <div className="bg-white p-4 sm:p-6 rounded-[24px] shadow-sm border border-gray-100 mb-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Fecha</label>
                    <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input 
                            type="date" 
                            value={dateFilter}
                            onChange={e => setDateFilter(e.target.value)}
                            className="w-full pl-9 h-10 rounded-xl border-gray-200 bg-gray-50 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        />
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Equipo</label>
                    <div className="relative">
                        <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <select 
                            value={equipoFilter}
                            onChange={e => setEquipoFilter(e.target.value)}
                            className="w-full pl-9 pr-8 h-10 rounded-xl border-gray-200 bg-gray-50 text-sm focus:ring-2 focus:ring-blue-500 outline-none appearance-none"
                        >
                            <option value="">Todos los Equipos</option>
                            {uniqueEquipos.map(eq => <option key={eq} value={eq}>{eq}</option>)}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Técnico</label>
                    <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input 
                            type="text" 
                            placeholder="Buscar nombre..."
                            value={tecnicoFilter}
                            onChange={e => setTecnicoFilter(e.target.value)}
                            className="w-full pl-9 h-10 rounded-xl border-gray-200 bg-gray-50 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>
                </div>
                <div className="flex items-end">
                    <button 
                        onClick={() => setCriticalFilter(!criticalFilter)}
                        className={`w-full h-10 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold transition-colors ${criticalFilter ? 'bg-red-100 text-red-700 border-red-200' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
                    >
                        <AlertCircle className="w-4 h-4" />
                        {criticalFilter ? "Solo Críticos" : "Mostrar Críticos"}
                    </button>
                </div>
            </div>
            
            {(dateFilter || equipoFilter || tecnicoFilter || criticalFilter) && (
                <div className="mt-4 flex justify-end">
                    <button 
                        onClick={() => {
                            setDateFilter("")
                            setEquipoFilter("")
                            setTecnicoFilter("")
                            setCriticalFilter(false)
                        }}
                        className="text-xs font-semibold text-gray-500 hover:text-gray-900"
                    >
                        Limpiar Filtros
                    </button>
                </div>
            )}
        </div>

        {/* RESULTS LIST */}
        <div className="space-y-4">
            {filteredReports.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-[24px] border border-dashed border-gray-300">
                    <Filter className="w-8 h-8 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No se encontraron auditorías con estos filtros.</p>
                </div>
            ) : (
                filteredReports.map(report => {
                    const isExpanded = expandedId === report.id
                    const isCritical = hasCriticalIssue(report.report_data)
                    const rd = report.report_data

                    return (
                        <div key={report.id} className={`bg-white rounded-[20px] shadow-sm border transition-all duration-200 overflow-hidden ${isCritical ? 'border-red-200' : 'border-gray-200 hover:border-gray-300'}`}>
                            {/* CARD HEADER (Clickable) */}
                            <div 
                                onClick={() => toggleExpand(report.id)}
                                className="p-5 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-gray-500">
                                        <Calendar className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500 mb-0.5">{report.date.split('-').reverse().join('/')}</p>
                                        <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                                            {report.equipo_nombre}
                                            {isCritical && <span className="bg-red-100 text-red-700 text-[10px] uppercase px-2 py-0.5 rounded-full font-bold">Fallas</span>}
                                        </h3>
                                    </div>
                                </div>
                                
                                <div className="flex-1 md:px-8 grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <p className="text-xs text-gray-400 font-semibold uppercase">Técnicos</p>
                                        <p className="text-gray-700 truncate">{report.tecnico_lider} <span className="text-gray-400">/</span> {report.tecnico_auxiliar}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-400 font-semibold uppercase">Auditor</p>
                                        <p className="text-gray-700 truncate">{supervisors[report.supervisor_id]}</p>
                                    </div>
                                </div>

                                <div className="text-gray-400 flex items-center justify-end">
                                    {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                                </div>
                            </div>

                            {/* CARD BODY (Expanded) */}
                            {isExpanded && (
                                <div className="p-6 bg-gray-50 border-t border-gray-100">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                                        <div>
                                            <h3 className="text-sm font-bold text-gray-900 bg-gray-200 px-3 py-1.5 rounded-lg inline-block mb-3">Líder: {report.tecnico_lider}</h3>
                                            {renderGroup(rd.kit_lider, "Kit FTTH Lider")}
                                            {renderGroup(rd.epp_lider, "EPP Lider")}
                                        </div>
                                        
                                        {report.tecnico_auxiliar && (
                                            <div>
                                                <h3 className="text-sm font-bold text-gray-900 bg-gray-200 px-3 py-1.5 rounded-lg inline-block mb-3">Auxiliar: {report.tecnico_auxiliar}</h3>
                                                {renderGroup(rd.kit_auxiliar, "Kit FTTH Auxiliar")}
                                                {renderGroup(rd.epp_auxiliar, "EPP Auxiliar")}
                                            </div>
                                        )}

                                        <div className="md:col-span-2 mt-4">
                                            <h3 className="text-sm font-bold text-gray-900 bg-gray-200 px-3 py-1.5 rounded-lg inline-block mb-3">Herramientas del Equipo</h3>
                                            {renderGroup(rd.herramientas, "Inventario Compartido")}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )
                })
            )}
        </div>
    </div>
  )
}
