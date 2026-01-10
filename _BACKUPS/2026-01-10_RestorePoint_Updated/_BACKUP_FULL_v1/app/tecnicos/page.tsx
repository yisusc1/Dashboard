import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import Link from "next/link"
import { RedirectType, redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { User, Shield, Users, Wrench, ArrowRight, Package, AlertTriangle, LogOut, Lock, Trash2 } from "lucide-react"
import { LogoutButton } from "@/components/ui/logout-button"
import { FinalizeDayButton } from "./components/finalize-day-button"

export default async function TechnicianDashboard() {
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

  // 1. Get User
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  // 2. Get Profile & Team
  const { data: profile } = await supabase
    .from("profiles")
    .select(`
            *,
            team:teams(id, name, profiles(id, first_name, last_name))
        `)
    .eq("id", user.id)
    .single()

  if (!profile) return <div>Error cargando perfil</div>

  // 3. Determine Partner (if in team)
  const partner = profile.team?.profiles?.find((p: any) => p.id !== user.id)
  const teamMembersIDs = profile.team?.profiles?.map((p: any) => p.id) || [user.id]

  // 4. Calculate Inventory (Mi Salida)
  // 4. Calculate Inventory (Mi Salida)
  // Fetch Items from ACTIVE Assignments
  // We switch from 'transactions' (history) to 'assignment_items' (state) to support closing assignments.
  const { data: assignments } = await supabase
    .from("inventory_assignments")
    .select(`
        id,
        status,
        items:inventory_assignment_items (
            quantity,
            serials,
            product:inventory_products(sku, name)
        )
    `)
    .or(`assigned_to.in.(${teamMembersIDs.join(',')}),team_id.eq.${profile.team?.id}`)
    .in("status", ["ACTIVE", "PARTIAL_RETURN"]) // Filters out RETURNED/CLOSED


  // Fetch Usage (Closures) by Team or Techs
  // Since we don't have a perfect "team_id" on closures yet, we filter by team name or tech IDs
  const { data: closures, error: closuresError } = await supabase
    .from("cierres")
    .select("metraje_usado, metraje_desechado, conectores, precinto, rosetas, tensores, patchcord, tecnico_1, equipo, created_at, id, tecnico_id, codigo_carrete")

  if (closuresError) {
    console.error("DEBUG: Error fetching closures:", closuresError)
  }

  if (closures && closures.length > 0) {
    console.log("DEBUG CLOSURE SCHEMA:", Object.keys(closures[0]))
  }

  // Fetch Returns (Devoluciones)
  const { data: returns } = await supabase
    .from("inventory_returns")
    .select(`
        created_at,
        inventory_return_items (
            product_id,
            quantity,
            serials,
            condition,
            product:inventory_products(sku)
        ),
        assignment:inventory_assignments!inner(assigned_to)
    `)
    .in("assignment.assigned_to", teamMembersIDs)

  if (returns && returns.length > 0) {
    console.log("DEBUG RETURNS:", JSON.stringify(returns, null, 2))
  } else {
    console.log("DEBUG RETURNS: No returns found for these users", teamMembersIDs)
  }

  // Filter relevant closures
  const myClosures = closures?.filter(c => {
    // 1. Match Team Name (Legacy)
    if (profile.team?.name && c.equipo === profile.team.name) return true

    // 2. Match Technician ID (New RLS compliant way)
    // Checks if the closure's technician is in my team list
    if (c.tecnico_id && teamMembersIDs.includes(c.tecnico_id)) return true

    // 3. Fallback: Match User ID (Legacy)
    if (c.user_id && teamMembersIDs.includes(c.user_id)) return true

    return false
  }) || []

  // CHECK FINALIZE BUTTON VISIBILITY
  // 1. Check if already finalized today
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const { data: todaysAudits } = await supabase
    .from("inventory_audits")
    .select("id")
    .gte("created_at", todayStart.toISOString())
    .or(`team_id.eq.${profile.team?.id || -1},technician_id.eq.${user.id}`)

  const alreadyFinalized = todaysAudits && todaysAudits.length > 0

  // 2. Check for Today's installations
  const todaysInstallations = myClosures.filter((c: any) => {
    const date = new Date(c.created_at)
    return date >= todayStart
  })

  // Show button IF: Not yet Finalized Today (Removed installation check for testing/flexibility)
  const showFinalizeButton = !alreadyFinalized

  // Fetch Assigned ONUs/Routers from Clientes table using RPC to bypass RLS
  // This ensures we see installations from ALL team members, not just the user's view
  const { data: installedSerialsData } = await supabase
    .rpc('get_installed_serials', { p_user_ids: teamMembersIDs })

  const installedOnus = new Set(installedSerialsData?.map((r: any) => r.serial).filter(Boolean) || [])
  const installedRouters = new Set() // Router logic pending if needed, focusing on ONU for now as requested

  // Fetch ACTIVE CLIENTS (Installations in Progress) for the Team
  const { data: activeClients } = await supabase
    .from("clientes")
    .select("id, nombre, direccion, estatus, user_id")
    .in("user_id", teamMembersIDs)
    .neq("estatus", "finalizado")
    .order("created_at", { ascending: false })

  // ... (Active Dispatches query remains) ...
  const { data: activeDispatches } = await supabase
    .from("inventory_assignments")
    .select("code, status, created_at")
    .in("assigned_to", teamMembersIDs)
    .in("status", ["ACTIVE", "PARTIAL_RETURN"])
    .order("created_at", { ascending: false })

  // ... (Stock Logic remains) ...

  // (Skip to Rendering Section)



  // Calculate Stock and Serials
  const KPI_MAP: Record<string, string> = {
    "CARRETE": "metraje_usado",
    "CONV": "conectores",
    "PREC": "precinto",
    "ROSETA": "rosetas",
    "TENS": "tensores",
    "PATCH1": "patchcord"
  }

  type StockItem = {
    name: string
    quantity: number
    serials: string[]
    waste?: number // Track waste for display
  }

  const stock: Record<string, StockItem> = {}

  // 1. Add ASSIGNMENTS
  assignments?.forEach((assignment: any) => {
    // Iterate over ITEMS inside the assignment
    assignment.items?.forEach((item: any) => {
      const sku = item.product.sku
      const name = item.product.name

      // LOGIC MODIFICATION: Separate Spools by Serial
      if (sku.includes("CARRETE")) {
        // Iterate over serials and create individual entries
        if (Array.isArray(item.serials) && item.serials.length > 0) {
          item.serials.forEach((s: any) => {
            const serialStr = typeof s === 'string' ? s : s.serial
            const uniqueKey = `${sku}__${serialStr}` // Unique Key for this specific spool

            if (!stock[uniqueKey]) {
              stock[uniqueKey] = {
                name: `${name} (${serialStr})`,
                quantity: 0,
                serials: [serialStr],
                waste: 0,
                isSpool: true // Flag to help rendering if needed
              }
            }

            // For spools, the item.quantity is usually the TOTAL assignments. 
            // But 'item' here is from 'inventory_assignment_items'.
            // Usually 1 item row per spool assignment.
            // If we have multiple spools in ONE assignment row, item.quantity is sum.
            // We distribute it? Or usually it's 1 spool = X meters.
            // If multiple serials in one line, we assume equal split? Or just take the value?
            // Best guess: Spools are assigned 1 by 1 or separated. 
            // If 1 row has 2 serials and 2000m, we assume 1000m each or we just add full qty to first?
            // Let's assume item.quantity is for the whole batch. If multiple serials, we divide?
            // Actually, standard practice for serialized big items is 1 row per item or specific quantities.
            // Simplification: Add item.quantity once to the unique entry.
            // But if there are multiple serials, we might double count if we add full qty to each.
            // However, for CARRETE, usually serails.length is 1.

            stock[uniqueKey].quantity += (item.quantity / item.serials.length)
          })
        }
      } else {
        // Standard aggregation for non-spool items
        if (!stock[sku]) {
          stock[sku] = { name, quantity: 0, serials: [], waste: 0 }
        }

        // Add Quantity
        stock[sku].quantity += item.quantity

        // Add Serials (if any)
        if (Array.isArray(item.serials) && item.serials.length > 0) {
          stock[sku].serials.push(...item.serials)
        }
      }
    })
  })

  // 2. Subtract USAGE
  myClosures.forEach((c: any) => {
    // A. QUANTITY SUBTRACTION
    Object.keys(KPI_MAP).forEach(skuKey => {
      const dbField = KPI_MAP[skuKey]

      // SPECIAL HANDLING FOR SPOOLS (search by key prefix)
      if (skuKey === 'CARRETE') {
        // Logic: The closure has 'codigo_carrete' which is the serial.
        // We need to find the stock entry that matches `CARRETE__${c.codigo_carrete}`
        // Or if no code, maybe fallback? (shouldn't happen with new form)

        const serialUsed = c.codigo_carrete
        if (!serialUsed) return // Cannot subtract if we don't know which spool

        // Construct the Key
        // We might not know the exact SKU prefix if we have multiple spool types.
        // But we loop over keys or construct it.
        // Let's iterate `stock` keys to find the one ending in this serial?
        // Or just construct it if we know the SKU is standard?
        // Since we used `sku.includes("CARRETE")` in aggregation, the key start might vary.
        // Safer to find the entry where `serials` includes the `serialUsed`.

        const targetKey = Object.keys(stock).find(k => k.includes("CARRETE") && k.includes(serialUsed))
        if (targetKey && stock[targetKey]) {
          const valStr = c[dbField]
          let val = 0
          if (valStr) {
            val = parseInt(valStr.toString().replace(/[^0-9]/g, ""), 10) || 0
          }

          // Subtract Usage
          stock[targetKey].quantity -= val

          // Subtract Waste
          const wasteStr = c.metraje_desechado
          let wasteVal = 0
          if (wasteStr) {
            wasteVal = parseInt(wasteStr.toString().replace(/[^0-9]/g, ""), 10) || 0
          }
          stock[targetKey].quantity -= wasteVal
          stock[targetKey].waste = (stock[targetKey].waste || 0) + wasteVal
        }

      } else {
        // STANDARD LOGIC (For non-serialized or aggregated items)
        if (stock[skuKey]) {
          const valStr = c[dbField]
          let val = 0
          if (valStr) {
            val = parseInt(valStr.toString().replace(/[^0-9]/g, ""), 10) || 0
          }
          if (dbField === 'patchcord' || dbField === 'rosetas') {
            val = (valStr === 'Si' || valStr === true) ? 1 : 0 // Boolean usage
          }

          stock[skuKey].quantity -= val
        }
      }
    })
  })

  // 3. Subtract RETURNS (returned to warehouse)
  returns?.forEach((ret: any) => {
    ret.inventory_return_items.forEach((item: any) => {
      const sku = item.product?.sku
      if (sku && stock[sku]) {
        // Logic Exception: Do NOT subtract "CONSUMED" returns for CARRETE
        // This prevents the daily "Automatic Closure" from hiding the Spool
        const isCarrete = sku.includes("CARRETE")
        const isConsumed = item.condition === 'CONSUMED'

        if (isCarrete && isConsumed) {
          // Ignore subtraction
          return
        }

        // Subtract Quantity
        stock[sku].quantity -= item.quantity

        // Subtract Serials
        if (item.serials && Array.isArray(item.serials)) {
          item.serials.forEach((s: string) => {
            stock[sku].serials = stock[sku].serials.filter(existing => existing !== s)
          })
        }
      }
    })
  })

  // 4. SERIAL SUBTRACTION (Filter based on installed/specific SKU types)
  Object.keys(stock).forEach(sku => {
    if (stock[sku].serials && stock[sku].serials.length > 0) {
      if (sku.includes("ONU")) {
        stock[sku].serials = stock[sku].serials.filter(s => !installedOnus.has(s))
        stock[sku].quantity = stock[sku].serials.length // Sync quantity with available serials
      }
      // Add Router logic if SKU pattern known, e.g. ROUTER?
      // Assuming 'router' key usage might be generic, but let's leave generic serial filter as fallback if needed
      // OR just rely on the count update above if not using serials for everything.
      // Since user specificially complained about ONUs, fixing ONUs here is key.
    }
  })

  // Check if HAS STOCK to operate (Minimum Kit)
  const MINIMUM_KIT = [
    { key: 'ONU', label: 'ONU', min: 1 },
    { key: 'CARRETE', label: 'Cable Fibra', min: 1 }, // Just Need > 0
    { key: 'CONV', label: 'Conectores', min: 2 },
    { key: 'TENS', label: 'Tensores', min: 2 },
    { key: 'PATCH1', label: 'Patchcord', min: 1 },
    { key: 'ROSETA', label: 'Roseta', min: 1 },
  ]

  const missingItems: string[] = []

  MINIMUM_KIT.forEach(req => {
    // Find matching SKU in stock
    const stockItem = Object.entries(stock).find(([sku]) => sku.includes(req.key))
    const quantity = stockItem ? stockItem[1].quantity : 0

    if (quantity < req.min) {
      missingItems.push(req.label)
    }
  })

  // Check system settings
  const { getSystemSettings } = await import("../admin/settings-actions")
  const settings = await getSystemSettings()
  const restrictionsEnabled = settings["INSTALLATION_RESTRICTIONS_ENABLED"]

  const hasStock = !restrictionsEnabled || missingItems.length === 0

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 md:p-10 pb-32">

      {/* HEADER PROFILE */}
      <div className="max-w-md mx-auto mb-8 animate-in slide-in-from-top-4 duration-500">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Mi Dashboard</h1>
          <div className="flex gap-2">
            <Link href="/">
              <Button variant="ghost" size="icon" className="rounded-full text-slate-400">
                <LogOut size={20} />
              </Button>
            </Link>
          </div>
        </div>

        <Card className="bg-white border-slate-200 shadow-sm rounded-3xl overflow-hidden mb-8">
          <div className="bg-slate-900 p-6 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 p-6 opacity-10">
              <Users size={80} />
            </div>
            <div className="relative z-10 flex items-center gap-4">
              <div className="h-16 w-16 rounded-2xl bg-white/10 backdrop-blur flex items-center justify-center text-2xl font-bold">
                {profile.first_name[0]}{profile.last_name[0]}
              </div>
              <div>
                <h2 className="text-xl font-bold">{profile.first_name} {profile.last_name}</h2>
                <p className="text-slate-400 text-sm font-medium">{profile.team ? profile.team.name : 'Técnico Individual'}</p>
              </div>
              <div className={`ml-auto px-3 py-1 rounded-full text-xs font-bold ${hasStock ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                {hasStock ? 'ACTIVO' : 'INACTIVO'}
              </div>
            </div>
          </div>
          <CardContent className="p-6 pt-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 rounded-2xl">
                <span className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Rol</span>
                <div className="flex items-center gap-2 font-semibold text-slate-700">
                  <Shield size={16} />
                  <span>Técnico</span>
                </div>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl">
                <span className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Compañero</span>
                <div className="flex items-center gap-2 font-semibold text-slate-700">
                  <User size={16} />
                  <span>{partner ? `${partner.first_name}` : 'N/A'}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ACTION SECTION */}
        <div className="space-y-6">

          {/* ACTIVE INSTALLATIONS LIST */}
          {activeClients && activeClients.length > 0 && (
            <div className="space-y-3 animate-in slide-in-from-bottom-2">
              <div className="flex items-center justify-between px-1">
                <h3 className="font-bold text-slate-900">Instalaciones en Curso</h3>
                <Link href="/tecnicos/reportes" className="text-xs font-bold text-blue-600 hover:text-blue-800">
                  Ver Detalle
                </Link>
              </div>
              {activeClients.map((client: any) => (
                <Link href="/tecnicos/reportes" key={client.id}>
                  <Card className="bg-white border-slate-200 shadow-sm rounded-2xl overflow-hidden hover:shadow-md transition-all mb-3 cursor-pointer group">
                    <CardContent className="p-5 flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{client.nombre}</h4>
                        <p className="text-xs text-slate-500 font-medium mt-0.5 line-clamp-1">{client.direccion}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${client.estatus === 'verificacion' ? 'bg-orange-100 text-orange-700' :
                            client.estatus === 'cierre' ? 'bg-green-100 text-green-700' :
                              'bg-blue-100 text-blue-700'
                            }`}>
                            {client.estatus?.toUpperCase() || 'EN PROGRESO'}
                          </span>
                        </div>
                      </div>
                      <div className="h-8 w-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600">
                        <ArrowRight size={16} />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}

          {/* MAIN ACTION BUTTON */}
          <div className="relative">
            <Link href="/tecnicos/reportes?action=new" className="block">
              <Card className="border-none shadow-lg rounded-3xl overflow-hidden group transition-all bg-blue-600 shadow-blue-500/30 hover:scale-[1.02] active:scale-[0.98] cursor-pointer">
                <CardContent className="p-8 flex items-center justify-between relative">
                  <div className="absolute right-0 bottom-0 p-6 opacity-10">
                    <Wrench size={100} className="text-white" />
                  </div>
                  <div className="relative z-10 text-white">
                    <h3 className="text-2xl font-bold mb-1">Nueva Instalación</h3>
                    <p className="text-blue-100 font-medium">Gestionar reportes y clientes</p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-white group-hover:bg-white group-hover:text-blue-600 transition-colors">
                    <ArrowRight size={24} />
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>

          {/* INVENTORY SECTION */}
          <div className="space-y-4">



            <div className="flex items-center gap-2 px-2">
              <Package size={20} className="text-slate-400" />
              <h3 className="font-bold text-slate-700">Mi Salida (Inventario Actual)</h3>
            </div>

            {Object.keys(stock).length > 0 ? (
              <div className="grid gap-3">
                {Object.entries(stock).map(([sku, item]) => (
                  item.quantity > 0 && (
                    <div key={sku} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {/* Icon Logic */}
                          {sku.includes('CARRETE') ? (
                            <div className="h-10 w-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600"><div className="w-4 h-4 rounded-full border-2 border-current" /></div>
                          ) : sku.includes('ONU') ? (
                            <div className="h-10 w-10 rounded-xl bg-purple-100 flex items-center justify-center text-purple-600"><Users size={20} /></div>
                          ) : sku.includes('ROSETA') ? (
                            <div className="h-10 w-10 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600"><Shield size={20} /></div>
                          ) : sku.includes('PREC') ? (
                            <div className="h-10 w-10 rounded-xl bg-red-100 flex items-center justify-center text-red-600"><Lock size={20} /></div>
                          ) : sku.includes('CONV') ? (
                            <div className="h-10 w-10 rounded-xl bg-green-100 flex items-center justify-center text-green-600"><Wrench size={20} /></div>
                          ) : (
                            <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500">
                              <Package size={20} />
                            </div>
                          )}


                          <div>
                            <p className="font-bold text-slate-800">{item.name}</p>
                            {/* Waste Display for CARRETE */}
                            {sku.includes('CARRETE') && (
                              <>
                                {item.waste && item.waste > 0 ? (
                                  <p className="text-xs font-bold text-red-500">
                                    Desechado: -{item.waste} m
                                  </p>
                                ) : null}
                              </>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-xl font-bold text-slate-900 block">{item.quantity}</span>
                        </div>
                      </div>

                      {/* Show Serials if any */}
                      {item.serials.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-slate-50">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Seriales Disponibles:</p>
                          <div className="flex flex-wrap gap-2"> {/* Increased gap */}
                            {item.serials.map(s => (
                              <div key={s} className="flex items-center gap-2 bg-slate-100 rounded px-2 py-1 border border-slate-200">
                                <span className="text-xs font-mono text-slate-600 font-bold">
                                  {s}
                                </span>

                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                ))}
                {!hasStock && (
                  <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                    <Package size={32} className="mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No tienes material en tu poder.</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                <p className="text-sm">Aún no se te ha asignado material.</p>
              </div>
            )}
          </div>

          {/* FINALIZAR JORNADA BUTTON */}
          {showFinalizeButton && (
            <div className="mt-8 pt-8 border-t border-slate-200 animate-in fade-in slide-in-from-bottom-4">
              <div className="bg-slate-900 rounded-3xl p-6 text-center relative overflow-hidden">
                <div className="relative z-10">
                  <h3 className="text-white text-lg font-bold mb-6">¿Terminaste por hoy?</h3>
                  <FinalizeDayButton />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
