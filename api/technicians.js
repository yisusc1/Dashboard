const express = require("express")
const router = express.Router()
const supabase = require("../config/supabase")

// GET /api/technicians - Obtener todos los técnicos activos
router.get("/", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("technicians")
      .select("id, nombre") // Seleccionar solo el ID y el nombre
      .eq("activo", true) // Filtrar por técnicos activos
      .order("nombre", { ascending: true }) // Ordenar por nombre

    if (error) {
      console.error("Error al obtener técnicos:", error)
      return res.status(500).json({ error: error.message })
    }

    res.json(data)
  } catch (error) {
    console.error("Error inesperado en GET /api/technicians:", error)
    res.status(500).json({ error: "Error interno del servidor" })
  }
})

module.exports = router
