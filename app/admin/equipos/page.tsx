"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { getTeams, saveTeam, deleteTeam, assignUserToTeam, getTechnicians } from "./actions"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Trash2, PlusCircle, Pencil, ChevronLeft, Search } from "lucide-react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("")

export default function TeamsPage() {
    const [teams, setTeams] = useState<any[]>([])
    const [techs, setTechs] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [isDialogOpen, setIsDialogOpen] = useState(false)

    // Form State
    const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null)
    const [selectedLetter, setSelectedLetter] = useState("")
    const [selectedLeader, setSelectedLeader] = useState("")
    const [selectedAux, setSelectedAux] = useState("")
    const [isSaving, setIsSaving] = useState(false)

    const loadData = async () => {
        try {
            const [t, u] = await Promise.all([getTeams(), getTechnicians()])
            setTeams(t)
            setTechs(u)
        } catch (e: any) {
            toast.error("Error: " + e.message)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadData()
    }, [])

    const openCreateModal = () => {
        setIsDialogOpen(true)
        setSelectedTeamId(null)
        setSelectedLetter("")
        setSelectedLeader("")
        setSelectedAux("")
    }

    const openEditModal = (team: any) => {
        setIsDialogOpen(true)
        setSelectedTeamId(team.id)
        setSelectedLetter(team.name.replace("Equipo ", ""))

        // Find leader and aux
        // Assuming order is somewhat arbitrary or we can detect by role if implemented?
        // Right now we stored them as just members. The action sets 'tecnico_1' logic in reports, 
        // but here we just have a list. 
        // We'll trust the user to re-select correctly or we assume Index 0 = Leader if consistent.
        // Let's autofill based on index for now (Leader=0, Aux=1)
        if (team.profiles && team.profiles.length > 0) {
            setSelectedLeader(team.profiles[0]?.id || "")
            setSelectedAux(team.profiles[1]?.id || "")
        } else {
            setSelectedLeader("")
            setSelectedAux("")
        }
    }

    const handleSaveTeam = async () => {
        if (!selectedLetter) return toast.error("Selecciona una letra para el equipo")
        if (!selectedLeader) return toast.error("Selecciona un Técnico Líder")
        // Aux is optional? User asked to select both. Let's enforce.
        if (!selectedAux) return toast.error("Selecciona un Técnico Auxiliar")
        if (selectedLeader === selectedAux) return toast.error("El líder y auxiliar deben ser diferentes")

        try {
            setIsSaving(true)
            await saveTeam(selectedLetter, selectedLeader, selectedAux, selectedTeamId)
            toast.success(selectedTeamId ? "Equipo actualizado" : "Equipo creado")
            setIsDialogOpen(false)
            loadData()
        } catch (e: any) {
            toast.error(e.message)
        } finally {
            setIsSaving(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm("¿Eliminar este equipo y liberar a sus técnicos?")) return
        try {
            await deleteTeam(id)
            toast.success("Equipo eliminado")
            loadData()
        } catch (e: any) {
            toast.error(e.message)
        }
    }

    // Filter Logic for Dropdowns
    // SHOW ALL TECHS to allow "stealing" them from other teams
    // Add visual indicator if they are in another team
    const availableOptions = techs

    // Helper to render Name + (Current Team)
    const renderTechLabel = (t: any) => {
        let label = `${t.first_name} ${t.last_name}`
        if (t.team_id && t.team_id !== selectedTeamId) {
            // Find team name
            const team = teams.find(team => team.id === t.team_id)
            if (team) label += ` (${team.name})`
        }
        return label
    }

    if (loading) return <div className="p-10 flex justify-center text-muted-foreground">Cargando equipos...</div>

    return (
        <div className="min-h-screen bg-slate-50/50 p-6 md:p-10">
            {/* HERD HEADER */}
            <div className="max-w-6xl mx-auto mb-10">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <Link href="/control" className="p-2 -ml-2 rounded-full hover:bg-slate-200/50 transition-colors text-slate-500">
                                <ChevronLeft size={24} />
                            </Link>
                            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Gestión de Equipos</h1>
                        </div>
                        <p className="text-slate-500 max-w-lg">
                            Administra las parejas de trabajo. Crea equipos, asigna responsabilidades y mantén el orden operativo.
                        </p>
                    </div>

                    <Button onClick={openCreateModal} className="rounded-full h-12 px-6 shadow-lg shadow-blue-500/20 bg-blue-600 hover:bg-blue-700 transition-all hover:scale-105 active:scale-95">
                        <PlusCircle className="mr-2 h-5 w-5" />
                        Nuevo Equipo
                    </Button>
                </div>
            </div>

            {/* TEAMS GRID */}
            <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {teams.map((team) => (
                    <div
                        key={team.id}
                        className="group relative bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="h-12 w-12 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center text-lg font-bold">
                                    {team.name.replace("Equipo ", "")}
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100">{team.name}</h3>
                                    <span className="text-xs text-slate-500 font-medium">
                                        {team.profiles?.length || 0} Integrantes
                                    </span>
                                </div>
                            </div>
                            <div className="flex gap-1">
                                <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full text-slate-400 hover:text-blue-600 hover:bg-blue-50" onClick={() => openEditModal(team)}>
                                    <Pencil size={14} />
                                </Button>
                                <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full text-slate-400 hover:text-red-600 hover:bg-red-50" onClick={() => handleDelete(team.id)}>
                                    <Trash2 size={14} />
                                </Button>
                            </div>
                        </div>

                        {/* Members List */}
                        <div className="space-y-3">
                            {/* Leader */}
                            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                                <div className="h-8 w-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold">L</div>
                                <div className="flex-1 overflow-hidden">
                                    <p className="text-sm font-medium truncate">
                                        {team.profiles?.[0]
                                            ? `${team.profiles[0].first_name} ${team.profiles[0].last_name}`
                                            : <span className="text-slate-400 italic">Sin asignar</span>
                                        }
                                    </p>
                                    <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Líder</p>
                                </div>
                            </div>

                            {/* Aux */}
                            <div className="flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                                <div className="h-8 w-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-xs font-bold">A</div>
                                <div className="flex-1 overflow-hidden">
                                    <p className="text-sm font-medium truncate">
                                        {team.profiles?.[1]
                                            ? `${team.profiles[1].first_name} ${team.profiles[1].last_name}`
                                            : <span className="text-slate-400 italic">Sin asignar</span>
                                        }
                                    </p>
                                    <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Auxiliar</p>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}

                {/* Add New Placeholder */}
                <div
                    onClick={openCreateModal}
                    className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 p-6 min-h-[300px] cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-all group"
                >
                    <div className="h-16 w-16 mb-4 rounded-full bg-slate-100 group-hover:bg-blue-100 transition-colors flex items-center justify-center text-slate-400 group-hover:text-blue-600">
                        <PlusCircle size={32} />
                    </div>
                    <h3 className="font-semibold text-slate-600 group-hover:text-blue-700">Crear Nuevo Equipo</h3>
                    <p className="text-sm text-slate-400 text-center px-4 mt-2">Agrega otra pareja de técnicos a la flota.</p>
                </div>
            </div>

            {/* MODAL */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden rounded-3xl bg-white/95 backdrop-blur-xl border-slate-200/50 shadow-2xl">
                    <div className="p-6 bg-slate-50/50 border-b">
                        <DialogHeader>
                            <DialogTitle className="text-xl">{selectedTeamId ? "Editar Equipo" : "Crear Nuevo Equipo"}</DialogTitle>
                            <DialogDescription>
                                {selectedTeamId ? "Modifica los integrantes o el nombre." : "Configura la nueva pareja de trabajo."}
                            </DialogDescription>
                        </DialogHeader>
                    </div>

                    <div className="p-6 space-y-6">
                        {/* LETRA */}
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Identificador</Label>
                            <Select onValueChange={setSelectedLetter} value={selectedLetter}>
                                <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-slate-200">
                                    <SelectValue placeholder="Selecciona Letra (A-Z)" />
                                </SelectTrigger>
                                <SelectContent>
                                    {LETTERS.map(l => {
                                        const isUsed = teams.some(t => t.name === `Equipo ${l}`)
                                        const isCurrent = selectedTeamId && selectedLetter === l

                                        if (isUsed && !isCurrent) return null

                                        return (
                                            <SelectItem key={l} value={l}>Equipo {l}</SelectItem>
                                        )
                                    })}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-indigo-500 uppercase tracking-wider">Técnico Líder</Label>
                                <Select onValueChange={setSelectedLeader} value={selectedLeader}>
                                    <SelectTrigger className="h-12 rounded-xl bg-indigo-50/50 border-indigo-100 focus:ring-indigo-500/20">
                                        <SelectValue placeholder="Seleccionar..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availableOptions.map(t => (
                                            <SelectItem key={t.id} value={t.id}>{renderTechLabel(t)}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Técnico Auxiliar</Label>
                                <Select onValueChange={setSelectedAux} value={selectedAux}>
                                    <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-slate-200">
                                        <SelectValue placeholder="Seleccionar..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availableOptions.filter(t => t.id !== selectedLeader).map(t => (
                                            <SelectItem key={t.id} value={t.id}>{renderTechLabel(t)}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {selectedTeamId && (
                            <div className="rounded-lg bg-amber-50 p-3 text-xs text-amber-700 border border-amber-100">
                                Nota: Al guardar, los miembros seleccionados serán reasignados a este equipo.
                            </div>
                        )}
                    </div>

                    <DialogFooter className="p-6 bg-slate-50/50 border-t gap-2">
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="rounded-xl h-11 border-slate-200 hover:bg-white hover:text-slate-900">
                            Cancelar
                        </Button>
                        <Button onClick={handleSaveTeam} disabled={isSaving} className="rounded-xl h-11 px-8 bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/20">
                            {isSaving ? "Guardando..." : "Guardar Cambios"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
