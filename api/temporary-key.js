const express = require("express")
const router = express.Router()

// Generar clave temporal aleatoria
function generateTempKey() {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

let currentTempKey = generateTempKey()

// GET /api/temporary-key - Obtener clave temporal actual
router.get("/", (req, res) => {
  // Generar nueva clave cada vez que se solicite
  currentTempKey = generateTempKey()

  res.json({
    key: currentTempKey,
    timestamp: new Date().toISOString(),
  })
})

module.exports = router
