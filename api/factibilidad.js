// Contenido CORRECTO para: /api/factibilidad.js

const express = require("express");
const router = express.Router();
const supabase = require("../config/supabase");

const MAX_DISTANCE_METERS = 400;

function getDistanceInMeters(lat1, lon1, lat2, lon2) {
    const R = 6371e3;
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

router.post("/", async (req, res) => {
    const { latitud: clientLat, longitud: clientLon } = req.body;
    if (!clientLat || !clientLon) {
        return res.status(400).json({ error: "Faltan coordenadas de latitud o longitud." });
    }
    try {
        const { data: cajas, error: cajasError } = await supabase.from("cajas_nap").select("id, nombre_caja, latitud, longitud");
        if (cajasError) throw cajasError;
        if (!cajas || cajas.length === 0) {
            return res.status(404).json({ error: "No se encontraron cajas NAP en la base de datos." });
        }
        let nap_cercana = null;
        let distancia_metros = Infinity;
        for (const caja of cajas) {
            if (caja.latitud && caja.longitud) {
                const distancia = getDistanceInMeters(clientLat, clientLon, caja.latitud, caja.longitud);
                if (distancia < distancia_metros) {
                    distancia_metros = distancia;
                    nap_cercana = caja;
                }
            }
        }
        distancia_metros = Math.round(distancia_metros);
        const es_factible = distancia_metros <= MAX_DISTANCE_METERS;
        res.status(200).json({
            es_factible,
            distancia_metros,
            nap_cercana: {
                id: nap_cercana.id,
                nombre_nap: nap_cercana.nombre_caja,
                latitud: nap_cercana.latitud,
                longitud: nap_cercana.longitud
            },
            cliente: { latitud: clientLat, longitud: clientLon }
        });
    } catch (error) {
        console.error("Error en la API de factibilidad:", error.message);
        res.status(500).json({ error: "Error al procesar la factibilidad." });
    }
});

module.exports = router;