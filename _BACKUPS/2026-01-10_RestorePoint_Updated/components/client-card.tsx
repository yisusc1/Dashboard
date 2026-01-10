"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle, Clock, AlertCircle, Trash2, Pencil } from "lucide-react"

type ClientCardProps = {
  client: {
    id: string
    nombre: string
    cedula: string
    direccion: string
    plan: string
    equipo?: string
  }
  onSelectPhase: (phase: "assignment" | "review" | "closure") => void
  onFinalize?: () => void
  onEdit?: () => void
  onDelete?: () => void
  isClosureCompleted?: boolean
  // New props for status
  isAssignmentCompleted?: boolean
  isReviewCompleted?: boolean
}

export function ClientCard({ client, onSelectPhase, onFinalize, onEdit, onDelete, isClosureCompleted, isAssignmentCompleted, isReviewCompleted }: ClientCardProps) {
  return (
    <Card className="rounded-[24px] border border-zinc-200 shadow-none hover:border-zinc-300 transition-all bg-white overflow-hidden group">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <CardTitle className="text-xl font-bold text-zinc-900 tracking-tight">{client.nombre}</CardTitle>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onEdit}
              className="w-8 h-8 rounded-full flex items-center justify-center bg-zinc-50 text-zinc-400 hover:text-black hover:bg-zinc-200 transition-colors"
              title="Editar"
            >
              <Pencil size={18} />
            </button>
            {onDelete && (
              <button
                onClick={onDelete}
                className="w-8 h-8 rounded-full flex items-center justify-center bg-red-50 text-red-500 hover:text-red-700 hover:bg-red-100 transition-colors"
                title="Eliminar Cliente"
              >
                <Trash2 size={18} />
              </button>
            )}
          </div>
        </div>
        <p className="text-zinc-500 font-medium font-mono text-sm">{client.cedula}</p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <div className="flex items-start justify-between border-b border-zinc-100 pb-2">
            <span className="text-zinc-400 text-sm font-medium">Dirección</span>
            <span className="text-zinc-900 text-sm font-medium text-right max-w-[60%]">{client.direccion}</span>
          </div>
          <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
            <span className="text-zinc-400 text-sm font-medium">Plan</span>
            <span className="text-zinc-900 text-sm font-bold">{client.plan}</span>
          </div>
          {client.equipo && (
            <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
              <span className="text-zinc-400 text-sm font-medium">Equipo</span>
              <span className="text-zinc-900 text-sm font-medium bg-zinc-100 px-2 py-1 rounded-lg">{client.equipo}</span>
            </div>
          )}
        </div>

        <div className="pt-2 space-y-3">
          <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest pl-1">Acciones</p>
          <div className="space-y-2">
            <Button
              onClick={() => onSelectPhase("assignment")}
              variant="outline"
              className="w-full h-12 justify-start gap-3 rounded-2xl border-zinc-200 hover:bg-zinc-50 hover:border-zinc-300 text-zinc-900 font-medium transition-all"
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isAssignmentCompleted ? 'bg-emerald-100 text-emerald-600' : 'bg-zinc-100'}`}>
                {isAssignmentCompleted ? <CheckCircle size={16} /> : <Clock size={16} className="text-zinc-900" />}
              </div>
              Asignación
            </Button>
            <Button
              onClick={() => onSelectPhase("review")}
              variant="outline"
              className="w-full h-12 justify-start gap-3 rounded-2xl border-zinc-200 hover:bg-zinc-50 hover:border-zinc-300 text-zinc-900 font-medium transition-all"
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isReviewCompleted ? 'bg-emerald-100 text-emerald-600' : 'bg-zinc-100'}`}>
                {isReviewCompleted ? <CheckCircle size={16} /> : <AlertCircle size={16} className="text-zinc-900" />}
              </div>
              Revisión
            </Button>
            <Button
              onClick={() => onSelectPhase("closure")}
              variant="outline"
              className="w-full h-12 justify-start gap-3 rounded-2xl border-zinc-200 hover:bg-zinc-50 hover:border-zinc-300 text-zinc-900 font-medium transition-all"
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isClosureCompleted ? 'bg-emerald-100 text-emerald-600' : 'bg-zinc-100'}`}>
                <CheckCircle size={16} className={isClosureCompleted ? 'text-emerald-600' : 'text-zinc-900'} />
              </div>
              Cierre
            </Button>

            {isClosureCompleted && onFinalize && (
              <Button
                onClick={onFinalize}
                variant="ghost"
                className="w-full h-12 justify-start gap-3 rounded-2xl text-red-600 hover:bg-red-50 hover:text-red-700 font-medium mt-2 transition-all"
              >
                <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                  <Trash2 size={16} className="text-red-600" />
                </div>
                Finalizar
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
