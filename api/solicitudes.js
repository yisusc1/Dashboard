const express = require("express")
const router = express.Router()
const supabase = require("../config/supabase")

// POST /api/solicitudes - Crear nueva solicitud
router.post("/", async (req, res) => {
  try {
    const solicitudData = {
      ...req.body,
      estado_solicitud: "Pendiente", // Siempre inicia como Pendiente
      fecha_creacion: new Date().toISOString(),
      fecha_actualizacion: new Date().toISOString(),
    }

    const { data, error } = await supabase.from("solicitudes").insert([solicitudData]).select()

    if (error) {
      console.error("Error al insertar solicitud:", error)
      return res.status(400).json({ error: error.message })
    }

    res.status(201).json({
      message: "Solicitud creada exitosamente",
      data: data[0],
      id: data[0].id, // Devolver el ID generado
    })
  } catch (error) {
    console.error("Error en POST /api/solicitudes:", error)
    res.status(500).json({ error: "Error interno del servidor" })
  }
})

// GET /api/solicitudes - Obtener todas las solicitudes (con nombres de técnicos)
router.get("/", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("solicitudes")
      .select(
        `
        *,
        tecnico_1:technicians!fk_solicitud_tecnico_1(nombre),
        tecnico_2:technicians!fk_solicitud_tecnico_2(nombre)
      `,
      )
      .order("fecha_creacion", { ascending: false })

    if (error) {
      console.error("Error al obtener solicitudes:", error)
      return res.status(400).json({ error: error.message })
    }

    // Formatear los nombres de los técnicos
    const formattedData = data.map((sol) => ({
      ...sol,
      tecnico_1_nombre: sol.tecnico_1 ? sol.tecnico_1.nombre : null,
      tecnico_2_nombre: sol.tecnico_2 ? sol.tecnico_2.nombre : null,
    }))

    res.json(formattedData)
  } catch (error) {
    console.error("Error en GET /api/solicitudes:", error)
    res.status(500).json({ error: "Error interno del servidor" })
  }
})

// GET /api/solicitudes/:id - Obtener una solicitud por ID
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params
    const { data, error } = await supabase
      .from("solicitudes")
      .select(
        `
        *,
        tecnico_1:technicians!fk_solicitud_tecnico_1(nombre),
        tecnico_2:technicians!fk_solicitud_tecnico_2(nombre)
      `,
      )
      .eq("id", id)
      .single()

    if (error) {
      console.error(`Error al obtener solicitud con ID ${id}:`, error)
      return res.status(404).json({ error: "Solicitud no encontrada" })
    }

    const formattedData = {
      ...data,
      tecnico_1_nombre: data.tecnico_1 ? data.tecnico_1.nombre : null,
      tecnico_2_nombre: data.tecnico_2 ? data.tecnico_2.nombre : null,
    }

    res.json(formattedData)
  } catch (error) {
    console.error("Error en GET /api/solicitudes/:id:", error)
    res.status(500).json({ error: "Error interno del servidor" })
  }
})

// PUT /api/solicitudes/:id - Actualizar estado y/o asignación de solicitud
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params
    const updateData = {
      ...req.body,
      fecha_actualizacion: new Date().toISOString(),
    }

    const { data, error } = await supabase.from("solicitudes").update(updateData).eq("id", id).select()

    if (error) {
      console.error(`Error al actualizar solicitud con ID ${id}:`, error)
      return res.status(400).json({ error: error.message })
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ message: "Solicitud no encontrada para actualizar" })
    }

    res.json({
      message: "Solicitud actualizada exitosamente",
      data: data[0],
    })
  } catch (error) {
    console.error("Error en PUT /api/solicitudes/:id:", error)
    res.status(500).json({ error: "Error interno del servidor" })
  }
})

module.exports = router
