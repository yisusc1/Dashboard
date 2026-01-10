"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { UserCog, Mail, Calendar, Settings2, Building2, Briefcase, User as UserIcon, ArrowLeft } from "lucide-react"
import Link from "next/link"

type Profile = {
    id: string
    email: string
    roles: string[]
    created_at: string
    first_name?: string
    last_name?: string
    department?: string
    job_title?: string
}

const ROLES = ["admin", "transporte", "taller", "tecnico", "invitado"]

export default function AdminUsersPage() {
    const [profiles, setProfiles] = useState<Profile[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        loadProfiles()
    }, [])

    const loadProfiles = async () => {
        try {
            const supabase = createClient()
            const { data, error } = await supabase
                .from("profiles")
                .select("*")
                .order("created_at", { ascending: false })

            if (error) throw error
            setProfiles(data || [])
        } catch (error) {
            console.error("Error loading profiles:", error)
            toast.error("Error al cargar usuarios")
        } finally {
            setLoading(false)
        }
    }

    const handleRoleToggle = async (userId: string, currentRoles: string[], roleToToggle: string) => {
        try {
            const supabase = createClient()

            // Calculate new roles
            let newRoles: string[]
            if (currentRoles.includes(roleToToggle)) {
                newRoles = currentRoles.filter(r => r !== roleToToggle)
            } else {
                newRoles = [...currentRoles, roleToToggle]
            }

            const { error } = await supabase
                .from("profiles")
                .update({ roles: newRoles })
                .eq("id", userId)

            if (error) throw error

            setProfiles(prev =>
                prev.map(p => (p.id === userId ? { ...p, roles: newRoles } : p))
            )
            toast.success("Permisos actualizados")
        } catch (error) {
            console.error("Error updating roles:", error)
            toast.error("Error al actualizar permisos")
        }
    }

    const getRoleBadgeColor = (role: string) => {
        switch (role) {
            case "admin": return "bg-purple-100 text-purple-700 hover:bg-purple-200"
            case "transporte": return "bg-blue-100 text-blue-700 hover:bg-blue-200"
            case "taller": return "bg-orange-100 text-orange-700 hover:bg-orange-200"
            case "tecnico": return "bg-green-100 text-green-700 hover:bg-green-200"
            default: return "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
        }
    }

    return (
        <div className="p-8 space-y-6 max-w-7xl mx-auto">
            <div className="flex items-center gap-3 mb-8">
                <Link href="/">
                    <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl mr-2 bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50">
                        <ArrowLeft size={20} />
                    </Button>
                </Link>
                <div className="p-3 bg-zinc-900 rounded-xl shadow-lg shadow-zinc-900/10">
                    <UserCog className="text-white" size={24} />
                </div>
                <div>
                    <h1 className="text-3xl font-bold text-zinc-900 tracking-tight">Gestión de Usuarios</h1>
                    <p className="text-zinc-500">Administra los permisos y roles del personal</p>
                </div>
            </div>

            <Card className="border-zinc-200 shadow-sm overflow-hidden rounded-[24px]">
                <CardHeader className="bg-zinc-50/50 border-b border-zinc-100">
                    <CardTitle>Usuarios Registrados</CardTitle>
                    <CardDescription>Lista completa de empleados registrados en el sistema</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-zinc-50">
                            <TableRow>
                                <TableHead className="pl-6">Empleado</TableHead>
                                <TableHead>Datos Laborales</TableHead>
                                <TableHead>Roles Asignados</TableHead>
                                <TableHead>Fecha Registro</TableHead>
                                <TableHead className="text-right pr-6">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center h-32 text-zinc-500">
                                        Cargando usuarios...
                                    </TableCell>
                                </TableRow>
                            ) : profiles.map((profile) => {
                                const fullName = [profile.first_name, profile.last_name].filter(Boolean).join(" ");
                                return (
                                    <TableRow key={profile.id} className="hover:bg-zinc-50/50 transition-colors">
                                        <TableCell className="pl-6">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-full bg-zinc-100 flex items-center justify-center border border-zinc-200 shrink-0">
                                                    <UserIcon size={18} className="text-zinc-500" />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-zinc-900">
                                                        {fullName || "Sin nombre"}
                                                    </span>
                                                    <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                                                        <Mail size={12} />
                                                        {profile.email}
                                                    </div>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-2 text-sm text-zinc-700">
                                                    <Briefcase size={14} className="text-zinc-400" />
                                                    <span>{profile.job_title || "Sin Cargo"}</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-xs text-zinc-500">
                                                    <Building2 size={12} />
                                                    {profile.department || "Sin Dpto."}
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-wrap gap-2">
                                                {(profile.roles || []).map((role) => (
                                                    <Badge key={role} variant="secondary" className={`capitalize px-2 py-0.5 text-xs ${getRoleBadgeColor(role)}`}>
                                                        {role}
                                                    </Badge>
                                                ))}
                                                {(!profile.roles || profile.roles.length === 0) && (
                                                    <span className="text-zinc-400 text-xs italic">Sin roles</span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2 text-zinc-500 text-sm">
                                                <Calendar size={14} />
                                                {new Date(profile.created_at).toLocaleDateString()}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right pr-6">
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <Button variant="outline" size="sm" className="gap-2 h-8">
                                                        <Settings2 size={14} />
                                                        <span className="hidden sm:inline">Gestionar</span>
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-56 p-3" align="end">
                                                    <div className="space-y-2">
                                                        <h4 className="font-medium leading-none mb-3 text-zinc-900">Asignar Roles</h4>
                                                        {ROLES.map((role) => {
                                                            const isChecked = (profile.roles || []).includes(role)
                                                            return (
                                                                <div key={role} className="flex items-center space-x-2 p-2 hover:bg-zinc-50 rounded-lg transition-colors">
                                                                    <Checkbox
                                                                        id={`${profile.id}-${role}`}
                                                                        checked={isChecked}
                                                                        onCheckedChange={() => handleRoleToggle(profile.id, profile.roles || [], role)}
                                                                    />
                                                                    <Label
                                                                        htmlFor={`${profile.id}-${role}`}
                                                                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                                                                    >
                                                                        {role.charAt(0).toUpperCase() + role.slice(1)}
                                                                    </Label>
                                                                </div>
                                                            )
                                                        })}
                                                    </div>
                                                </PopoverContent>
                                            </Popover>
                                        </TableCell>
                                    </TableRow>
                                )
                            })}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}

