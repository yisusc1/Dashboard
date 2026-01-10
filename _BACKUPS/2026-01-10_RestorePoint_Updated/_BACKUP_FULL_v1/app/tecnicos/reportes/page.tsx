"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { ClientCard } from "@/components/client-card"
import { ClientForm } from "@/components/client-form"
import { CreateClientDialog } from "@/components/create-client-dialog"
import { EditClientDialog } from "@/components/edit-client-dialog"
import { Plus, Search, AlertCircle, Home as HomeIcon } from "lucide-react"
import { LogoutButton } from "@/components/ui/logout-button"
import { toast } from "sonner"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

type Client = {
  id: string
  nombre: string
  cedula: string
  direccion: string
  plan: string
  equipo?: string
  onu?: string
  estatus?: string
  cierres?: { id: string }[]
}

export default function Home() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [currentPhase, setCurrentPhase] = useState<"assignment" | "review" | "closure" | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showInitInstructions, setShowInitInstructions] = useState(false)
  const [clientToFinalize, setClientToFinalize] = useState<string | null>(null)
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null)
  const [clientToEdit, setClientToEdit] = useState<Client | null>(null)
  const [teamData, setTeamData] = useState<{ name: string, partner: string, members: string[] } | null>(null)

  const [availableOnus, setAvailableOnus] = useState<string[]>([])
  const [restrictionsEnabled, setRestrictionsEnabled] = useState(true)


  useEffect(() => {
    loadClients()
    loadTeamData()
    loadInventory()
    loadSettings()

    // Check for direct action param
    if (typeof window !== "undefined") {
      const p = new URLSearchParams(window.location.search)
      if (p.get("action") === "new") {
        setDialogOpen(true)
        // clean url
        window.history.replaceState({}, "", "/tecnicos/reportes")
      }
    }
  }, [])

  async function loadSettings() {
    const { getSystemSettings } = await import("@/app/admin/settings-actions")
    const maxRetries = 3;
    let retries = 0;
    while (retries < maxRetries) {
      try {
        const settings = await getSystemSettings()
        // Default to true if undefined, for safety
        setRestrictionsEnabled(settings["INSTALLATION_RESTRICTIONS_ENABLED"] !== false)
        break;
      } catch (e) {
        console.error("Failed to load settings", e);
        retries++;
        await new Promise(r => setTimeout(r, 1000));
      }
    }
  }

  async function loadInventory() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // 1. Get Profile & Team (Same logic as Dashboard)
    const { data: profile } = await supabase
      .from("profiles")
      .select(`
            *,
            team:teams(id, name, profiles(id, first_name, last_name))
        `)
      .eq("id", user.id)
      .single()

    if (!profile) return

    const teamMembersIDs = profile.team?.profiles?.map((p: any) => p.id) || [user.id]

    // 2. Fetch Assigned ONUs (Transactions)
    // We filter by SKU containing "ONU" client-side or if possible in query
    // The previous dashboard logic fetched ALL transactions. Here we just want ONUs for the dropdown.
    const { data: assignments } = await supabase
      .from("inventory_transactions")
      .select(`quantity, product:inventory_products(sku, name), type, serials`)
      .in("assigned_to", teamMembersIDs)
      .eq("type", "OUT")

    // Collect all assigned ONU serials
    const assignedSerials: string[] = []
    assignments?.forEach((tx: any) => {
      if (tx.product?.sku?.includes("ONU") && Array.isArray(tx.serials)) {
        assignedSerials.push(...tx.serials)
      }
    })

    // 3. Fetch Used Serials (Closures)
    const { data: usedClients } = await supabase
      .from("clientes")
      .select("onu")
      .not("onu", "is", null) // Filter where ONU is not null

    const usedSerials = new Set(usedClients?.map((c: any) => c.onu) || [])

    // 4. Fetch Returned Serials (WAREHOUSE RETURNS)
    // We must exclude serials that have been returned to warehouse
    const { data: returns } = await supabase
      .from("inventory_returns")
      .select(`
            inventory_return_items (
                serials
            ),
            assignment:inventory_assignments!inner(assigned_to)
        `)
      .in("assignment.assigned_to", teamMembersIDs)

    const returnedSerials = new Set<string>()
    returns?.forEach((ret: any) => {
      ret.inventory_return_items.forEach((item: any) => {
        if (Array.isArray(item.serials)) {
          item.serials.forEach((s: string) => returnedSerials.add(s))
        }
      })
    })

    // 5. Filter Available
    // Available = Assigned - Used - Returned
    const available = assignedSerials.filter(s => !usedSerials.has(s) && !returnedSerials.has(s))

    setAvailableOnus(available)
  }

  async function loadTeamData() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profile } = await supabase
      .from("profiles")
      .select(`
            *,
            team:teams(id, name, profiles(id, first_name, last_name))
        `)
      .eq("id", user.id)
      .single()

    if (profile && profile.team) {
      const partner = profile.team.profiles.find((p: any) => p.id !== user.id)
      const members = profile.team.profiles.map((p: any) => `${p.first_name} ${p.last_name}`)
      setTeamData({
        name: profile.team.name,
        partner: partner ? `${partner.first_name} ${partner.last_name}` : "",
        members
      })
    }
  }

  async function loadClients() {
    try {
      setError(null)
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setLoading(false)
        return
      }

      // 1. Get User's Team
      const { data: profile } = await supabase
        .from("profiles")
        .select(`*, team:teams(id, name, profiles(id))`)
        .eq("id", user.id)
        .single()

      let query = supabase
        .from("clientes")
        .select("*, cierres(id)")
        .neq('estatus', 'finalizado')
        .order("created_at", { ascending: false })

      // 2. Filter by Team OR User
      if (profile?.team) {
        // If in a team, show clients created by ANY team member OR assigned to this team name
        // We get all member IDs
        const memberIds = profile.team.profiles.map((p: any) => p.id)
        // We can use the 'in' filter for user_id to cover all members
        // And also check 'equipo' name just in case
        // Syntax: .or(`user_id.in.(${memberIds.join(',')}),equipo.eq.${profile.team.name}`)
        // Actually, mixing AND conditions with OR in Supabase/PostgREST can be tricky with the JS client if not careful with parenthesis.
        // Let's rely on user_id IN (...) list of members.
        // Assuming all team members are in the profile.team.profiles list.
        query = query.in('user_id', memberIds)
      } else {
        // Individual
        query = query.eq('user_id', user.id)
      }

      const { data, error } = await query

      if (error) {
        console.log("[v0] Error details:", error)
        if (error.message.includes("Could not find the table")) {
          setError("Base de datos no inicializada")
          setShowInitInstructions(true)
        } else {
          setError(error.message)
        }
        throw error
      }
      setClients(data || [])
    } catch (error) {
      console.error("Error loading clients:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleFinalize = (clientId: string) => {
    setClientToFinalize(clientId)
  }

  const executeFinalize = async () => {
    if (!clientToFinalize) return

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from("clientes")
        .update({ estatus: "finalizado" })
        .eq("id", clientToFinalize)

      if (error) throw error

      toast.success("Cliente finalizado correctamente")
      loadClients()
    } catch (error) {
      console.error("Error finalizing client:", error)
      toast.error("Error al finalizar el cliente")
    } finally {
      setClientToFinalize(null)
    }
  }

  const executeDelete = async () => {
    if (!clientToDelete) return

    try {
      const supabase = createClient()

      // Delete related records first to satisfy foreign key constraints
      await supabase.from("cierres").delete().eq("cliente_id", clientToDelete.id)
      await supabase.from("revisiones").delete().eq("cliente_id", clientToDelete.id)
      await supabase.from("asignaciones").delete().eq("cliente_id", clientToDelete.id)

      // Now delete the client
      const { error } = await supabase
        .from("clientes")
        .delete()
        .eq("id", clientToDelete.id)

      if (error) throw error

      toast.success("Cliente eliminado correctamente")
      loadClients()
    } catch (error) {
      console.error("Error deleting client:", error)
      toast.error("Error al eliminar el cliente")
    } finally {
      setClientToDelete(null)
    }
  }

  const filteredClients = clients.filter(
    (client) =>
      client.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.cedula.includes(searchTerm) ||
      client.direccion.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  if (selectedClient && currentPhase) {
    return (
      <ClientForm
        client={selectedClient}
        phase={currentPhase}
        onBack={() => {
          setSelectedClient(null)
          setCurrentPhase(null)
          loadClients()
        }}
        onPhaseComplete={(nextPhase) => {
          if (nextPhase) {
            setCurrentPhase(nextPhase)
          } else {
            setSelectedClient(null)
            setCurrentPhase(null)
            loadClients()
          }
        }}
        teamData={teamData}
      />
    )
  }

  return (
    <main className="min-h-screen bg-zinc-50 pb-20">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-12">
        {/* HEADER */}
        <div className="flex justify-between items-end mb-8">
          <div>
            <h1 className="text-3xl font-bold text-zinc-900 tracking-tight">Instalaciones</h1>
            <p className="text-zinc-500 font-medium mt-1">Gestión de fibra óptica</p>
          </div>
          <div className="flex gap-2">
            <a
              href="/"
              className="p-2 text-zinc-400 hover:text-zinc-900 transition-colors rounded-full hover:bg-zinc-100 flex items-center justify-center"
              title="Ir al inicio"
            >
              <HomeIcon size={24} />
            </a>
            <LogoutButton />
          </div>
        </div>

        {/* SEARCH & ACTIONS */}
        <div className="mb-8 space-y-4">
          <div className="relative">
            <Search className="absolute left-4 top-4 text-zinc-400" size={20} />
            <input
              type="text"
              placeholder="Buscar cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-14 pl-12 pr-4 bg-white border border-zinc-200 rounded-2xl text-lg text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all shadow-sm"
            />
          </div>
          <button
            onClick={() => setDialogOpen(true)}
            className="w-full h-14 bg-black text-white font-semibold rounded-2xl flex items-center justify-center gap-2 hover:bg-zinc-800 transition-all active:scale-[0.98]"
          >
            <Plus size={24} />
            Nuevo Cliente
          </button>
        </div>

        {/* SQL INIT WARNING */}
        {showInitInstructions && (
          <div className="mb-6 p-6 bg-white border border-red-200 rounded-3xl shadow-sm">
            <div className="flex gap-4 items-start">
              <AlertCircle className="text-red-600 flex-shrink-0" size={24} />
              <div className="flex-1">
                <h3 className="font-bold text-lg text-zinc-900 mb-2">Configuración Necesaria</h3>
                <p className="text-zinc-600 mb-4 text-base">
                  La base de datos necesita ser inicializada.
                </p>
                <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-200 text-xs font-mono overflow-auto max-h-48 mb-4">
                  <pre>{`-- SQL Script...`}</pre>
                </div>
                <button
                  onClick={() => setShowInitInstructions(false)}
                  className="text-zinc-900 font-semibold underline decoration-zinc-300 underline-offset-4"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* CLIENTS LIST (Inset Grouped) */}
        {loading ? (
          <div className="text-center py-20">
            <div className="animate-spin w-8 h-8 border-4 border-zinc-200 border-t-black rounded-full mx-auto mb-4"></div>
            <p className="text-zinc-400">Cargando...</p>
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="text-center py-20 px-6 bg-white rounded-3xl border border-zinc-200 shadow-sm">
            <p className="text-zinc-400 text-lg mb-6">No hay clientes visibles</p>
            <button
              onClick={() => setDialogOpen(true)}
              className="text-black font-semibold hover:underline"
            >
              Crear el primero
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredClients.map((client) => {
              const isClosureCompleted = client.cierres && client.cierres.length > 0;
              return (
                <ClientCard
                  key={client.id}
                  client={client}
                  onSelectPhase={(phase) => {
                    setSelectedClient(client)
                    setCurrentPhase(phase)
                  }}
                  onFinalize={() => handleFinalize(client.id)}
                  onDelete={() => setClientToDelete(client)}
                  onEdit={() => {
                    setClientToEdit(client)
                    setEditDialogOpen(true)
                  }}
                  isClosureCompleted={!!isClosureCompleted}
                />
              )
            })}
          </div>
        )}
      </div>
      <CreateClientDialog
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onClientCreated={() => {
          loadClients();
          loadInventory(); // Reload inventory to update available list
        }}
        teamName={teamData?.name}
        availableOnus={availableOnus}
        restrictionsEnabled={restrictionsEnabled}
      />

      <EditClientDialog
        isOpen={editDialogOpen}
        onClose={() => {
          setEditDialogOpen(false)
          setClientToEdit(null)
        }}
        onClientUpdated={loadClients}
        client={clientToEdit}
      />

      <AlertDialog open={!!clientToFinalize} onOpenChange={(open) => !open && setClientToFinalize(null)}>
        <AlertDialogContent className="rounded-3xl border-none shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold text-zinc-900">¿Finalizar Cliente?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-500 text-base">
              El cliente pasará al archivo histórico.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl h-12 border-zinc-200 text-zinc-900 font-medium">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={executeFinalize} className="rounded-xl h-12 bg-black hover:bg-zinc-800 text-white font-medium">
              Finalizar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!clientToDelete} onOpenChange={(open) => !open && setClientToDelete(null)}>
        <AlertDialogContent className="rounded-3xl border-none shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold text-zinc-900">¿Eliminar Cliente?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-500 text-base">
              Esta acción no se puede deshacer. El cliente será eliminado permanentemente de la base de datos junto con su historial.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl h-12 border-zinc-200 text-zinc-900 font-medium">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={executeDelete} className="rounded-xl h-12 bg-red-600 hover:bg-red-700 text-white font-medium">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main >
  )
}
