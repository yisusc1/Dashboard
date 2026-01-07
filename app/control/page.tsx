import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { getPendingAudits } from "./actions"

import { Users, User, ShieldCheck, ChevronRight, ArrowLeft, AlertCircle, Disc, Fuel } from "lucide-react"
import { DesktopModeToggle } from "@/components/desktop-mode-toggle"
import { DailyReportDialog } from "@/components/daily-report-dialog"

export default async function ControlPage() {
    const cookieStore = await cookies()

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() { return cookieStore.getAll() },
                setAll() { }
            },
        }
    )

    // 1. Fetch Teams
    const { data: teams } = await supabase
        .from("teams")
        .select("id, name, profiles(id, first_name, last_name)")
        .order("name")

    // 2. Fetch Technicians
    const { data: technicians } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, email, team_id")
        .contains("roles", ["tecnico"])

    // 3. Fetch Pending Audits
    const pendingAudits = await getPendingAudits()
    const pendingSet = new Set(pendingAudits.map((a: any) => a.team_id || a.technician_id))

    // Filter techs without team
    const soloTechs = technicians?.filter(t => !t.team_id) || []

    return (
        <div className="min-h-screen bg-slate-50/50 p-4 md:p-10">
            {/* HEADER */}
            <div className="max-w-6xl mx-auto mb-12">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <Link href="/" className="p-2 -ml-2 rounded-full hover:bg-slate-200/50 transition-colors text-slate-500">
                                <ArrowLeft size={24} />
                            </Link>
                            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Fiscalización</h1>

                        </div>
                        <p className="text-slate-500 max-w-lg">
                            Panel de control de inventario. Selecciona un equipo o técnico para auditar su stock en tiempo real.
                        </p>
                    </div>

                    <div className="flex flex-col md:flex-row items-center gap-3 w-full md:w-auto">
                        {/* Toggle here for visibility on Mobile and PC */}
                        <div className="self-end md:self-auto mb-2 md:mb-0">
                            <DesktopModeToggle />
                        </div>
                        <Link href="/admin/equipos" className="w-full md:w-auto">
                            <Button variant="outline" className="w-full md:w-auto rounded-xl h-12 border-slate-200 bg-white hover:bg-slate-50 shadow-sm text-slate-700">
                                <Users className="mr-2 h-4 w-4" />
                                Gestión de Equipos
                            </Button>
                        </Link>
                        <Link href="/control/spools" className="w-full md:w-auto">
                            <Button className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20 font-bold rounded-xl h-12 px-6">
                                <Disc className="mr-2 h-5 w-5" />
                                Gestión de Bobinas
                            </Button>
                        </Link>

                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto space-y-12">
                {/* SECCION EQUIPOS */}
                <section>
                    <div className="flex items-center gap-3 mb-6">
                        <div className="h-10 w-10 rounded-xl bg-blue-100/50 text-blue-600 flex items-center justify-center">
                            <Users size={20} />
                        </div>
                        <h2 className="text-xl font-bold text-slate-800">Equipos (Parejas)</h2>
                    </div>

                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {teams?.map((team) => (
                            <Link key={team.id} href={`/control/history/${team.id}`}>
                                <div className="group relative bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer h-full flex flex-col justify-between">
                                    <div>
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="h-12 w-12 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center text-lg font-bold">
                                                    {team.name.replace("Equipo ", "")}
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-lg text-slate-900 group-hover:text-blue-600 transition-colors">{team.name}</h3>
                                                    <span className="text-xs text-slate-500 font-medium bg-slate-100 px-2 py-0.5 rounded-md">
                                                        Activo
                                                    </span>
                                                    {pendingSet.has(team.id) && (
                                                        <span className="flex items-center gap-1 text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200 animate-pulse">
                                                            <AlertCircle size={10} />
                                                            AUDITORÍA PENDIENTE
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="h-8 w-8 rounded-full bg-slate-50 text-slate-300 group-hover:bg-blue-600 group-hover:text-white flex items-center justify-center transition-colors">
                                                <ChevronRight size={18} />
                                            </div>
                                        </div>

                                        {/* Members Preview List */}
                                        <div className="space-y-2 border-t pt-4 border-slate-50">
                                            {team.profiles && team.profiles.length > 0 ? (
                                                <div className="flex flex-col gap-2">
                                                    {/* @ts-ignore */}
                                                    {team.profiles.map((p: any) => (
                                                        <div key={p.id} className="flex items-center gap-3">
                                                            <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                                                                <User size={14} />
                                                            </div>
                                                            <span className="text-sm font-semibold text-slate-700">
                                                                {p.first_name} {p.last_name}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <span className="italic text-xs text-muted-foreground">Sin asignar</span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="mt-6 flex items-center gap-2 text-xs font-semibold text-blue-600 opacity-60 group-hover:opacity-100 transition-opacity">
                                        <ShieldCheck size={14} />
                                        <span>Ver Historial / Auditar</span>
                                    </div>
                                </div>
                            </Link>
                        ))}
                        {teams?.length === 0 && (
                            <div className="col-span-full py-12 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                                <p className="text-muted-foreground">No hay equipos creados.</p>
                                <Link href="/admin/equipos">
                                    <Button variant="link" className="text-blue-600 mt-2">Crear Equipo</Button>
                                </Link>
                            </div>
                        )}
                    </div>
                </section>

                {/* SECCION TECNICOS INDIVIDUALES */}
                <section>
                    <div className="flex items-center gap-3 mb-6">
                        <div className="h-10 w-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
                            <User size={20} />
                        </div>
                        <h2 className="text-xl font-bold text-slate-800">Técnicos Individuales <span className="text-sm font-normal text-slate-400 ml-2">(Sin Grupo)</span></h2>
                    </div>

                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {soloTechs.map((tech) => (
                            <Link key={tech.id} href={`/control/history/${tech.id}`}>
                                <div className="group relative bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer">
                                    <div className="flex items-center gap-4">
                                        <div className="h-12 w-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-sm font-bold uppercase">
                                            {(tech.first_name || "T")[0]}{(tech.last_name || "")[0]}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{tech.first_name} {tech.last_name}</h3>
                                            <p className="text-xs text-slate-400">{tech.email}</p>
                                            {pendingSet.has(tech.id) && (
                                                <div className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200 animate-pulse">
                                                    <AlertCircle size={10} />
                                                    PENDIENTE
                                                </div>
                                            )}
                                        </div>
                                        <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity text-blue-600">
                                            <ChevronRight size={18} />
                                        </div>
                                    </div>
                                    <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-slate-400 group-hover:text-blue-600 transition-colors">
                                        <ShieldCheck size={14} />
                                        <span>Ver Historial / Auditar</span>
                                    </div>
                                </div>
                            </Link>
                        ))}
                        {soloTechs.length === 0 && (
                            <div className="col-span-full py-8 text-center bg-white rounded-2xl border border-slate-100">
                                <p className="text-slate-400 text-sm">Todos los técnicos están asignados a un equipo.</p>
                            </div>
                        )}
                    </div>
                </section>
            </div>
        </div>
    )
}
