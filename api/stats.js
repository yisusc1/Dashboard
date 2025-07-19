// /api/stats.js (NUEVO ARCHIVO)

const express = require("express");
const router = express.Router();
const supabase = require("../config/supabase"); // Asegúrate de que la ruta a tu config sea correcta

// GET /api/stats - Obtener las estadísticas del día
router.get("/", async (req, res) => {
    try {
        // Obtener la fecha de hoy en formato YYYY-MM-DD
        const today = new Date();
        // Ajuste para la zona horaria de Venezuela (UTC-4)
        today.setUTCHours(today.getUTCHours() - 4);
        const todayISOString = today.toISOString().split('T')[0];

        // 1. Contar solicitudes pendientes
        const { count: pendientes, error: pendientesError } = await supabase
            .from("solicitudes")
            .select('*', { count: 'exact', head: true })
            .eq("estado_solicitud", "Pendiente");

        if (pendientesError) throw pendientesError;

        // 2. Contar solicitudes "En Proceso" (Planificadas)
        const { count: enProceso, error: enProcesoError } = await supabase
            .from("solicitudes")
            .select('*', { count: 'exact', head: true })
            .eq("estado_solicitud", "Planificada");

        if (enProcesoError) throw enProcesoError;

        // 3. Contar instalaciones de "Hoy"
        const { count: instalacionesHoy, error: instalacionesError } = await supabase
            .from("reportes_instalacion")
            .select('*', { count: 'exact', head: true })
            .eq("fecha_reporte", todayISOString);

        if (instalacionesError) throw instalacionesError;

        // 4. Contar soportes de "Hoy"
        const { count: soportesHoy, error: soportesError } = await supabase
            .from("reportes_soporte")
            .select('*', { count: 'exact', head: true })
            .eq("fecha_reporte", todayISOString);

        if (soportesError) throw soportesError;

        // Enviar todas las estadísticas en un solo objeto JSON
        res.status(200).json({
            pendientes,
            enProceso,
            instalacionesHoy,
            soportesActivos: soportesHoy
        });

    } catch (error) {
        console.error("Error al obtener las estadísticas:", error.message);
        res.status(500).json({ error: "Error interno del servidor al obtener estadísticas." });
    }
});

module.exports = router;