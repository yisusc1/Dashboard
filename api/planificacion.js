const express = require("express")
const router = express.Router()
const supabase = require("../config/supabase")

// GET /api/planificacion/:fecha - Obtener datos para una fecha específica
router.get("/:fecha", async (req, res) => {
  try {
    const { fecha } = req.params

    // Validar que la fecha tenga el formato YYYY-MM-DD
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      return res.status(400).json({ error: "Formato de fecha inválido. Use YYYY-MM-DD." })
    }
    // Opcional: Validar si es una fecha real (ej. no "2024-02-30")
    const dateObj = new Date(fecha)
    if (isNaN(dateObj.getTime())) {
      return res.status(400).json({ error: "Fecha inválida. Asegúrese de que sea una fecha real." })
    }

    // Obtener solicitudes
    const { data: solicitudes, error: solicitudesError } = await supabase
      .from("solicitudes")
      .select("*") // Seleccionar todas las columnas, incluyendo tecnico_1_id, tecnico_2_id
      .or(`fecha_disponibilidad.eq.${fecha},fecha_asignada.eq.${fecha}`)
      .order("fecha_creacion", { ascending: false })

    if (solicitudesError) {
      console.error("Error al obtener solicitudes:", solicitudesError)
      return res.status(400).json({ error: solicitudesError.message })
    }

    // Obtener técnicos (id y nombre)
    const { data: technicians, error: techniciansError } = await supabase
      .from("technicians")
      .select("id, nombre") // Asegurarse de seleccionar el ID
      .eq("activo", true)
      .order("nombre")

    if (techniciansError) {
      console.error("Error al obtener técnicos:", techniciansError)
      return res.status(400).json({ error: techniciansError.message })
    }

    // Obtener asignaciones de equipos desde la tabla 'equipos'
    const { data: equipos, error: equiposError } = await supabase
      .from("equipos")
      .select("letra, tecnico_1_id, tecnico_2_id, fecha_actualizacion") // Asegurarse de seleccionar fecha_actualizacion
      .order("letra")

    if (equiposError) {
      console.error("Error al obtener equipos:", equiposError)
      return res.status(400).json({ error: equiposError.message })
    }

    // Mapear técnicos de equipo para una búsqueda fácil
    const teamTechsMap = new Map()
    equipos.forEach((eq) => {
      teamTechsMap.set(eq.letra, { tecnico_1_id: eq.tecnico_1_id, tecnico_2_id: eq.tecnico_2_id })
    })

    // Mejorar solicitudes con nombres de técnicos y IDs de técnicos del equipo
    const enhancedSolicitudes = solicitudes.map((sol) => {
      const teamInfo = teamTechsMap.get(sol.equipo) // sol.equipo es la letra del equipo (ej. "A")
      return {
        ...sol,
        tecnico_1_nombre: technicians.find((t) => t.id === sol.tecnico_1_id)?.nombre || null,
        tecnico_2_nombre: technicians.find((t) => t.id === sol.tecnico_2_id)?.nombre || null,
        // Añadir los IDs de los técnicos asignados al equipo para la selección inicial del dropdown
        team_tecnico_1_id: teamInfo ? teamInfo.tecnico_1_id : null,
        team_tecnico_2_id: teamInfo ? teamInfo.tecnico_2_id : null,
      }
    })

    res.json({
      solicitudes: enhancedSolicitudes || [],
      technicians: technicians || [], // Ahora son objetos con {id, nombre}
      equipos: equipos || [], // Pasar también los datos del equipo
    })
  } catch (error) {
    console.error("Error en GET /api/planificacion/:fecha:", error)
    res.status(500).json({ error: "Error interno del servidor" })
  }
})

// POST /api/planificacion/assign - Asignar solicitud a equipo
router.post("/assign", async (req, res) => {
  try {
    const { solicitud_id, equipo, tecnico1, tecnico2, fecha_asignada } = req.body

    const updateData = {
      estado_solicitud: "Planificada",
      equipo: equipo,
      tecnico_1_id: tecnico1, // Estos son los IDs de los técnicos
      tecnico_2_id: tecnico2 || null, // Estos son los IDs de los técnicos
      fecha_asignada: fecha_asignada,
      fecha_actualizacion: new Date().toISOString(),
    }

    const { data, error } = await supabase.from("solicitudes").update(updateData).eq("id", solicitud_id).select()

    if (error) {
      console.error("Error al asignar solicitud:", error)
      return res.status(400).json({ error: error.message })
    }

    res.json({
      message: "Solicitud asignada exitosamente",
      data: data[0],
    })
  } catch (error) {
    console.error("Error en POST /api/planificacion/assign:", error)
    res.status(500).json({ error: "Error interno del servidor" })
  }
})

// POST /api/planificacion/unassign - Desasignar solicitud
router.post("/unassign", async (req, res) => {
  try {
    const { solicitud_id } = req.body

    const updateData = {
      estado_solicitud: "Pendiente",
      equipo: null,
      tecnico_1_id: null,
      tecnico_2_id: null,
      fecha_asignada: null,
      fecha_actualizacion: new Date().toISOString(),
    }

    const { data, error } = await supabase.from("solicitudes").update(updateData).eq("id", solicitud_id).select()

    if (error) {
      console.error("Error al desasignar solicitud:", error)
      return res.status(400).json({ error: error.message })
    }

    res.json({
      message: "Solicitud desasignada exitosamente",
      data: data[0],
    })
  } catch (error) {
    console.error("Error en POST /api/planificacion/unassign:", error)
    res.status(500).json({ error: "Error interno del servidor" })
  }
})

// PUT /api/planificacion/team/:equipo_letra - Actualizar técnicos de un equipo
router.put("/team/:equipo_letra", async (req, res) => {
  try {
    const { equipo_letra } = req.params
    const { tecnico_1_id, tecnico_2_id } = req.body

    const updateData = {
      fecha_actualizacion: new Date().toISOString(),
    }

    // Solo actualizar si se proporciona, permitiendo null para limpiar
    if (tecnico_1_id !== undefined) {
      updateData.tecnico_1_id = tecnico_1_id === "" ? null : Number.parseInt(tecnico_1_id)
    }
    if (tecnico_2_id !== undefined) {
      updateData.tecnico_2_id = tecnico_2_id === "" ? null : Number.parseInt(tecnico_2_id)
    }

    const { data, error } = await supabase
      .from("equipos") // Actualizar la tabla 'equipos'
      .update(updateData)
      .eq("letra", equipo_letra) // Coincidir por la columna 'letra'
      .select()

    if (error) {
      console.error(`Error al actualizar equipo ${equipo_letra}:`, error)
      return res.status(400).json({ error: error.message })
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ message: "Equipo no encontrado para actualizar" })
    }

    res.json({
      message: "Equipo actualizado exitosamente",
      data: data[0],
    })
  } catch (error) {
    console.error("Error en PUT /api/planificacion/team/:equipo_letra:", error)
    res.status(500).json({ error: "Error interno del servidor" })
  }
})

// POST /api/planificacion/team - Crear un nuevo equipo
router.post("/team", async (req, res) => {
  try {
    const { letra, tecnico_1_id, tecnico_2_id } = req.body

    const { data, error } = await supabase
      .from("equipos")
      .insert([
        {
          letra: letra,
          tecnico_1_id: tecnico_1_id ? Number.parseInt(tecnico_1_id) : null,
          tecnico_2_id: tecnico_2_id ? Number.parseInt(tecnico_2_id) : null,
        },
      ])
      .select()

    if (error) {
      console.error("Error al crear equipo:", error)
      return res.status(400).json({ error: error.message })
    }

    res.status(201).json({
      message: "Equipo creado exitosamente",
      data: data[0],
    })
  } catch (error) {
    console.error("Error en POST /api/planificacion/team:", error)
    res.status(500).json({ error: "Error interno del servidor" })
  }
})

// DELETE /api/planificacion/team/:equipo_letra - Eliminar un equipo y desasignar sus solicitudes
router.delete("/team/:equipo_letra", async (req, res) => {
  try {
    const { equipo_letra } = req.params

    // Paso 1: Desasignar todas las solicitudes de este equipo
    const { error: unassignError } = await supabase
      .from("solicitudes")
      .update({
        estado_solicitud: "Pendiente",
        equipo: null,
        tecnico_1_id: null,
        tecnico_2_id: null,
        fecha_asignada: null,
        fecha_actualizacion: new Date().toISOString(),
      })
      .eq("equipo", equipo_letra)

    if (unassignError) {
      console.error(`Error al desasignar solicitudes del equipo ${equipo_letra}:`, unassignError)
      return res.status(500).json({ error: `Error al desasignar solicitudes: ${unassignError.message}` })
    }

    // Paso 2: Eliminar el equipo de la tabla 'equipos'
    const { error: deleteError } = await supabase.from("equipos").delete().eq("letra", equipo_letra)

    if (deleteError) {
      console.error(`Error al eliminar el equipo ${equipo_letra}:`, deleteError)
      return res.status(500).json({ error: `Error al eliminar el equipo: ${deleteError.message}` })
    }

    res.json({ message: `Equipo ${equipo_letra} y sus solicitudes desasignadas exitosamente.` })
  } catch (error) {
    console.error("Error en DELETE /api/planificacion/team/:equipo_letra:", error)
    res.status(500).json({ error: "Error interno del servidor" })
  }
})

module.exports = router
