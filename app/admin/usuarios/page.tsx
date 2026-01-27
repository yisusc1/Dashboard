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
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { UserCog, Mail, Calendar, Settings2, Building2, Briefcase, User as UserIcon, ArrowLeft, Pencil, Shield, LogIn, LayoutDashboard, Truck, Wrench, Package, ClipboardCheck, Lock } from "lucide-react"
import Link from "next/link"
import { updateProfileDetails, impersonateUserAction, createUserAction } from "./user-actions"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { DEPARTMENTS, JOB_TITLES_BY_DEPARTMENT } from "@/lib/constants"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

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

// DEFINING MODULE ACCESS GROUPS
const MODULE_ACCESS = [
    {
        title: "Módulos de Sistema",
        items: [
            {
                role: 'gerencia',
                label: 'Centro de Control',
                description: 'Dashboard ejecutivo, estadísticas y métricas en vivo.',
                icon: LayoutDashboard,
                color: 'text-indigo-600 bg-indigo-50 border-indigo-200'
            },
            {
                role: 'transporte',
                label: 'Gestión de Transporte',
                description: 'Control de flota, asignación de choferes y salidas.',
                icon: Truck,
                color: 'text-blue-600 bg-blue-50 border-blue-200'
            },
            {
                role: 'taller',
                label: 'Taller Mecánico',
                description: 'Registro de mantenimientos, reparaciones y fallas.',
                icon: Wrench,
                color: 'text-amber-600 bg-amber-50 border-amber-200'
            },
            {
                role: 'almacen',
                label: 'Almacén e Inventario',
                description: 'Gestión de stock, auditorías, entradas y salidas.',
                icon: Package,
                color: 'text-emerald-600 bg-emerald-50 border-emerald-200'
            }
        ]
    },
    {
        title: "Supervisión y Seguridad",
        items: [
            {
                role: 'supervisor',
                label: 'Control y Auditoría',
                description: 'Supervisión de operaciones, combustible y auditorías.',
                icon: ClipboardCheck,
                color: 'text-rose-600 bg-rose-50 border-rose-200'
            },
            {
                role: 'admin',
                label: 'Administrador Total',
                description: 'Acceso irrestricto a configuración y usuarios.',
                icon: Lock,
                color: 'text-purple-600 bg-purple-50 border-purple-200'
            }
        ]
    },
    {
        title: "Roles Operativos Básicos",
        items: [
            { role: 'tecnico', label: 'Técnico de Campo', description: 'Acceso a App Móvil de Técnicos.' },
            { role: 'chofer', label: 'Conductor', description: 'Puede ser asignado a vehículos.' },
            { role: 'mecanico', label: 'Mecánico', description: 'Visualización de reparaciones asignadas.' },
        ]
    }
]

export default function AdminUsersPage() {
    const [profiles, setProfiles] = useState<Profile[]>([])
    const [loading, setLoading] = useState(true)

    // Edit Details State
    const [editingUser, setEditingUser] = useState<Profile | null>(null)
    const [editForm, setEditForm] = useState({ department: "", job_title: "" })
    const [saving, setSaving] = useState(false)

    // Permissions State
    const [permissionsUser, setPermissionsUser] = useState<Profile | null>(null)

    // Create User State
    const [isCreateOpen, setIsCreateOpen] = useState(false)
    const [createForm, setCreateForm] = useState({
        email: "",
        password: "",
        firstName: "",
        lastName: "",
        role: "tecnico"
    })
    const [creating, setCreating] = useState(false)

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

    const startEditing = (profile: Profile) => {
        setEditingUser(profile)
        setEditForm({
            department: profile.department || "",
            job_title: profile.job_title || ""
        })
    }

    const handleSaveDetails = async () => {
        if (!editingUser) return
        setSaving(true)
        const result = await updateProfileDetails(editingUser.id, editForm.department, editForm.job_title)
        setSaving(false)

        if (result.error) {
            toast.error(result.error)
        } else {
            toast.success("Datos actualizados")
            setEditingUser(null)
            loadProfiles() // Reload to show changes
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

            // Update local state and permissions user state immediately
            const updatedProfile = { ...(permissionsUser || profiles.find(p => p.id === userId)!), roles: newRoles }

            // Update Permissions Modal State if Open
            if (permissionsUser?.id === userId) {
                setPermissionsUser(updatedProfile)
            }

            // Update List
            setProfiles(prev => prev.map(p => p.id === userId ? updatedProfile : p))

            toast.success("Permiso actualizado")
        } catch (error) {
            console.error("Error updating roles:", error)
            toast.error("Error al actualizar permisos")
        }
    }



    const handleImpersonate = async (email: string) => {
        if (!confirm("⚠️ ¿Iniciar sesión como este usuario?\n\nTu sesión de Administrador actual se cerrará.\nDeberás volver a iniciar sesión para regresar al admin.")) return

        toast.loading("Generando acceso seguro...")
        const result = await impersonateUserAction(email)

        if (result.success && result.url) {
            window.location.href = result.url
        } else {
            toast.dismiss()
            toast.error(result.error || "Error desconocido")
        }
    }

    const getRoleBadgeColor = (role: string) => {
        if (role === "admin") return "bg-purple-100 text-purple-700 hover:bg-purple-200"
        if (role === "gerencia") return "bg-indigo-100 text-indigo-700 hover:bg-indigo-200"
        if (["tecnico", "chofer", "supervisor", "mecanico"].includes(role)) return "bg-green-100 text-green-700"
        if (["auditoria", "combustible"].includes(role)) return "bg-red-100 text-red-700"
        return "bg-zinc-100 text-zinc-700"
    }

    const handleCreateUser = async () => {
        if (!createForm.email || !createForm.password || !createForm.firstName) {
            toast.error("Complete los campos obligatorios")
            return
        }

        setCreating(true)
        const result = await createUserAction({
            email: createForm.email,
            password: createForm.password,
            firstName: createForm.firstName,
            lastName: createForm.lastName,
            role: createForm.role
        })
        setCreating(false)

        if (result.error) {
            toast.error(result.error)
        } else {
            toast.success("Usuario creado exitosamente")
            setIsCreateOpen(false)
            setCreateForm({ email: "", password: "", firstName: "", lastName: "", role: "tecnico" }) // Reset
            loadProfiles()
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
                <div className="ml-auto">
                    <Button onClick={() => setIsCreateOpen(true)} className="bg-zinc-900 text-white hover:bg-zinc-800 rounded-xl">
                        + Nuevo Usuario
                    </Button>
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
                                            <div className="flex flex-wrap gap-2 max-w-[200px]">
                                                {(profile.roles || []).slice(0, 3).map((role) => (
                                                    <Badge key={role} variant="secondary" className={`capitalize px-2 py-0.5 text-xs ${getRoleBadgeColor(role)}`}>
                                                        {role}
                                                    </Badge>
                                                ))}
                                                {(profile.roles || []).length > 3 && (
                                                    <Badge variant="outline" className="px-1.5 text-[10px] text-zinc-500">
                                                        +{profile.roles.length - 3}
                                                    </Badge>
                                                )}
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
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => startEditing(profile)}
                                                    className="h-8 w-8 p-0 hover:bg-zinc-100"
                                                    title="Editar Datos"
                                                >
                                                    <Pencil size={16} className="text-zinc-500" />
                                                </Button>

                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 w-8 p-0 hover:bg-zinc-100 text-zinc-400 hover:text-violet-600"
                                                    title="Iniciar Sesión como..."
                                                    onClick={() => handleImpersonate(profile.email)}
                                                >
                                                    <LogIn size={16} />
                                                </Button>

                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="gap-2 h-8"
                                                    onClick={() => setPermissionsUser(profile)}
                                                >
                                                    <Shield size={14} />
                                                    <span className="hidden sm:inline">Permisos</span>
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )
                            })}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* EDIT DETAILS DIALOG */}
            <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Editar Datos Laborales</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Departamento</Label>
                            <Select
                                value={editForm.department}
                                onValueChange={(value) => setEditForm({ department: value, job_title: "" })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar Departamento" />
                                </SelectTrigger>
                                <SelectContent>
                                    {DEPARTMENTS.map((dept) => (
                                        <SelectItem key={dept} value={dept}>
                                            {dept}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Cargo / Título</Label>
                            <Select
                                value={editForm.job_title}
                                onValueChange={(value) => setEditForm({ ...editForm, job_title: value })}
                                disabled={!editForm.department}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar Cargo" />
                                </SelectTrigger>
                                <SelectContent>
                                    {editForm.department && JOB_TITLES_BY_DEPARTMENT[editForm.department]?.map((title) => (
                                        <SelectItem key={title} value={title}>
                                            {title}
                                        </SelectItem>
                                    ))}
                                    {!editForm.department && (
                                        <SelectItem value="placeholder" disabled>Primero selecciona un dpto.</SelectItem>
                                    )}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditingUser(null)}>Cancelar</Button>
                        <Button onClick={handleSaveDetails} disabled={saving}>
                            {saving ? "Guardando..." : "Guardar Cambios"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* PERMISSIONS MANAGER DIALOG (REFACTORED) */}
            <Dialog open={!!permissionsUser} onOpenChange={(open) => !open && setPermissionsUser(null)}>
                <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Gestionar Acceso a Módulos</DialogTitle>
                        <DialogDescription>
                            Define qué partes del sistema puede ver <span className="font-semibold text-zinc-900">{permissionsUser?.email}</span>.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-6 py-4">
                        {MODULE_ACCESS.map((group) => (
                            <div key={group.title} className="space-y-4">
                                <h4 className="font-medium text-xs text-zinc-400 uppercase tracking-widest pl-1">
                                    {group.title}
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {group.items.map((item) => {
                                        const isChecked = (permissionsUser?.roles || []).includes(item.role)
                                        const Icon = item.icon || Shield

                                        return (
                                            <div
                                                key={item.role}
                                                className={`
                                                    flex items-start gap-4 p-4 rounded-xl border transition-all duration-200
                                                    ${isChecked ? 'bg-zinc-50 border-zinc-300 shadow-sm' : 'bg-white border-zinc-100 hover:border-zinc-200'}
                                                `}
                                            >
                                                <div className={`
                                                    h-10 w-10 rounded-lg flex items-center justify-center shrink-0
                                                    ${item.color ? item.color.replace('text-', 'bg-').replace('bg-', 'bg-opacity-10 text-') : 'bg-zinc-100 text-zinc-500'}
                                                    ${item.color}
                                                `}>
                                                    <Icon size={20} />
                                                </div>

                                                <div className="flex-1 space-y-1">
                                                    <div className="flex items-center justify-between">
                                                        <Label
                                                            htmlFor={`role-${item.role}`}
                                                            className="font-semibold text-base text-zinc-900 cursor-pointer"
                                                        >
                                                            {item.label}
                                                        </Label>
                                                        <Switch
                                                            id={`role-${item.role}`}
                                                            checked={isChecked}
                                                            onCheckedChange={() => permissionsUser && handleRoleToggle(permissionsUser.id, permissionsUser.roles || [], item.role)}
                                                        />
                                                    </div>
                                                    <p className="text-sm text-zinc-500 leading-snug pr-8">
                                                        {item.description}
                                                    </p>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>

                    <DialogFooter>
                        <Button onClick={() => setPermissionsUser(null)} className="w-full sm:w-auto">
                            Guardar y Cerrar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* CREATE USER DIALOG */}
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Crear Nuevo Usuario</DialogTitle>
                        <DialogDescription>
                            Crea una cuenta con contraseña definida manualmente.
                            El usuario podrá iniciar sesión inmediatamente.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Nombre</Label>
                                <Input
                                    value={createForm.firstName}
                                    onChange={e => setCreateForm({ ...createForm, firstName: e.target.value })}
                                    placeholder="Ej: Juan"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Apellido</Label>
                                <Input
                                    value={createForm.lastName}
                                    onChange={e => setCreateForm({ ...createForm, lastName: e.target.value })}
                                    placeholder="Ej: Pérez"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Correo Electrónico</Label>
                            <Input
                                type="email"
                                value={createForm.email}
                                onChange={e => setCreateForm({ ...createForm, email: e.target.value })}
                                placeholder="usuario@empresa.com"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Contraseña Inicial</Label>
                            <Input
                                type="text"
                                value={createForm.password}
                                onChange={e => setCreateForm({ ...createForm, password: e.target.value })}
                                placeholder="Clave segura..."
                            />
                            <p className="text-[10px] text-zinc-500">Mínimo 6 caracteres.</p>
                        </div>

                        <div className="space-y-2">
                            <Label>Rol Inicial</Label>
                            <Select
                                value={createForm.role}
                                onValueChange={v => setCreateForm({ ...createForm, role: v })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar Rol" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="tecnico">Técnico</SelectItem>
                                    <SelectItem value="mecanico">Mecánico</SelectItem>
                                    <SelectItem value="admin">Administrador</SelectItem>
                                    <SelectItem value="gerencia">Gerencia</SelectItem>
                                    <SelectItem value="supervisor">Supervisor</SelectItem>
                                    <SelectItem value="chofer">Chofer</SelectItem>
                                    <SelectItem value="invitado">Invitado</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancelar</Button>
                        <Button onClick={handleCreateUser} disabled={creating} className="bg-zinc-900 text-white hover:bg-zinc-800">
                            {creating ? "Creando..." : "Crear Cuenta"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
