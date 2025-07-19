const express = require("express")
const cors = require("cors")
const path = require("path")
require("dotenv").config()

const app = express()
const PORT = process.env.PORT || 3000

// --- Middleware ---
app.use(cors())
app.use(express.json())
app.use(express.static(path.join(__dirname, "public")))
// Si tu carpeta 'scripts' está en la raíz, esta línea es necesaria.
// Si moviste 'scripts' a 'public', puedes borrarla.
app.use('/scripts', express.static(path.join(__dirname, 'scripts'))) 

// --- Rutas de la API ---
const solicitudesRouter = require("./api/solicitudes")
const planificacionRouter = require("./api/planificacion")
const temporaryKeyRouter = require("./api/temporary-key")
const techniciansRouter = require("./api/technicians")
const reportesRouter = require("./api/reportes")
const soportesRouter = require("./api/soportes")
const statsRouter = require('./api/stats')
const factibilidadRouter = require('./api/factibilidad'); // Ruta para el cálculo

app.use("/api/solicitudes", solicitudesRouter)
app.use("/api/planificacion", planificacionRouter)
app.use("/api/temporary-key", temporaryKeyRouter)
app.use("/api/technicians", techniciansRouter)
app.use("/api/reportes", reportesRouter)
app.use("/api/soportes", soportesRouter)
app.use('/api/stats', statsRouter)
app.use('/api/factibilidad', factibilidadRouter); // Ruta activa

// --- Rutas para servir archivos HTML ---
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"))
})

app.get("/solicitud", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "solicitud.html"))
})

app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin.html"))
})

app.get("/reporte", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "reporte.html"))
})

app.get("/soporte", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "soporte.html"))
})

app.get("/factibilidad", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "factibilidad.html"))
})

// --- Iniciar el Servidor ---
app.listen(PORT, '0.0.0.0', () => {
  const localUrl = `http://localhost:${PORT}`
  console.log(`🚀 Servidor corriendo...`)
  console.log(`- En este PC: ${localUrl}`)
  console.log(`- En tu red local (móvil): Usa la IP de tu PC (ej: http://192.168.1.5:${PORT})`)
})

