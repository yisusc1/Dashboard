"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { generateWhatsAppMessage } from "@/lib/whatsappFormatter";
import { Loader2, MessageCircle, Calendar, ChevronRight, FileText, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function HistorialLogic({ usuarioActual }: { usuarioActual: { id: string, nombre: string } }) {
  const [reportes, setReportes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<any | null>(null);

  const supabase = createClient();

  useEffect(() => {
    const fetchReportes = async () => {
      const { data, error } = await supabase
        .from('daily_activities_reports')
        .select('*')
        .eq('supervisor_id', usuarioActual.id)
        .order('date', { ascending: false });
        
      if (!error && data) {
        setReportes(data);
      }
      setLoading(false);
    };
    fetchReportes();
  }, [usuarioActual.id, supabase]);

  const handleWhatsApp = (report: any, e: React.MouseEvent) => {
    e.stopPropagation();
    const waUrl = `https://wa.me/?text=${generateWhatsAppMessage(report.report_data, usuarioActual.nombre, report.date)}`;
    window.open(waUrl, "_blank");
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>;

  return (
    <div className="w-full max-w-5xl mx-auto pb-12 relative">
      
      <div className="mb-8 flex items-center justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
            <Link href="/reporte-diario" className="hover:text-blue-600 transition-colors flex items-center"><ArrowLeft className="w-4 h-4 mr-1" /> Volver al formulario</Link>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Historial de Reportes</h2>
          <p className="text-gray-500">Supervisor: <span className="font-semibold text-gray-800">{usuarioActual.nombre}</span></p>
        </div>
      </div>

      {reportes.length === 0 ? (
        <div className="bg-white rounded-[24px] p-12 text-center shadow-sm border border-gray-100">
          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-700">No hay reportes enviados</h3>
          <p className="text-gray-500 mt-2">Aún no has generado ningún reporte diario.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {reportes.map((report) => {
            const isSelected = selectedReport?.id === report.id;
            const dateFormatted = format(new Date(report.date + 'T12:00:00Z'), "EEEE, d 'de' MMMM yyyy", { locale: es });
            
            return (
              <div 
                key={report.id} 
                onClick={() => setSelectedReport(isSelected ? null : report)}
                className={`bg-white rounded-[24px] p-6 shadow-sm border transition-all cursor-pointer ${isSelected ? 'border-blue-500 ring-4 ring-blue-500/10' : 'border-gray-100 hover:border-gray-300'}`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-xl ${report.status === 'COMPLETED' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>
                      <Calendar className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 capitalize">{dateFormatted}</h3>
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${report.status === 'COMPLETED' ? 'bg-green-50 text-green-700' : 'bg-orange-50 text-orange-700'}`}>
                        {report.status === 'COMPLETED' ? 'Enviado' : 'Borrador'}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className={`w-5 h-5 text-gray-400 transition-transform ${isSelected ? 'rotate-90' : ''}`} />
                </div>
                
                <div className="flex flex-wrap gap-2 mb-4">
                  {(report.selected_activities || []).map((act: string) => (
                    <span key={act} className="bg-gray-100 text-gray-700 text-xs px-3 py-1 rounded-full font-medium capitalize">
                      {act}
                    </span>
                  ))}
                </div>

                {isSelected && (
                  <div className="mt-6 pt-6 border-t border-gray-100 animate-in slide-in-from-top-2">
                    <p className="text-sm text-gray-600 mb-4"><strong>Resumen:</strong> {report.selected_activities?.length} actividades registradas.</p>
                    
                    <button 
                      onClick={(e) => handleWhatsApp(report, e)}
                      disabled={report.status !== 'COMPLETED'}
                      className="w-full flex items-center justify-center gap-2 h-12 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <MessageCircle className="w-5 h-5" />
                      {report.status === 'COMPLETED' ? 'Reenviar a WhatsApp' : 'Termina el reporte para enviarlo'}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
