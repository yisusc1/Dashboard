"use server"

import { GoogleGenerativeAI } from "@google/generative-ai"

const API_KEY = process.env.GEMINI_API_KEY || ""

export type AIActionResponse = {
    response: string
    action: {
        type: 'NAVIGATE' | 'SPEAK' | 'NONE'
        path?: string
    }
}

export async function processWithGemini(transcript: string): Promise<AIActionResponse | null> {
    if (!API_KEY) {
        console.warn("Gemini API Key missing")
        return null
    }

    try {
        const genAI = new GoogleGenerativeAI(API_KEY)
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })

        const systemPrompt = `
    Eres el asistente inteligente del "Sistema de Gestión de Operaciones".
    Tu objetivo es ayudar al usuario a navegar y entender el sistema.
    
    RUTAS DISPONIBLES:
    - /taller : Módulo de Taller, Mantenimiento, Reporte de Fallas mecánicas.
    - /admin/vehiculos : Lista de Vehículos, Flota, Detalles de unidades.
    - /control/combustible : Cargas de combustible, gasolina, diesel.
    - /control/combustible/scan : Escáner QR para autorizar combustible.
    - /almacen : Inventario, Materiales, Stock, Herramientas.
    - /perfil : Perfil del usuario, cargo, departamento.
    - / : Inicio, Dashboard, Casa.

    INSTRUCCIONES:
    1. Analiza la intención del usuario.
    2. Si quiere ir a un sitio, genera una acción NAVIGATE.
    3. Si pregunta qué es el sistema, responde brevemente.
    4. Responde SIEMPRE en formato JSON estricto.

    FORMATO DE RESPUESTA JSON:
    {
      "response": "Texto que el asistente hablará al usuario (sé amable, breve y servicial)",
      "action": {
        "type": "NAVIGATE" | "SPEAK" | "NONE",
        "path": "/ruta/correspondiente" (solo si type es NAVIGATE)
      }
    }
    
    Ejemplos:
    User: "Llévale a donde reparan los carros"
    JSON: { "response": "Abriendo el módulo de taller mecácnico.", "action": { "type": "NAVIGATE", "path": "/taller" } }

    User: "¿Qué haces?"
    JSON: { "response": "Ayudo a gestionar la flota y el almacén. Puedo llevarte a cualquier módulo.", "action": { "type": "SPEAK" } }
    `

        const result = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: `System: ${systemPrompt}\nUser Input: "${transcript}"\nResponse (JSON):` }] }],
            generationConfig: { responseMimeType: "application/json" }
        })

        const text = result.response.text()
        console.log("Gemini Response:", text)

        try {
            const data = JSON.parse(text) as AIActionResponse
            return data
        } catch (parseError) {
            console.error("Error parsing Gemini JSON", parseError)
            return null
        }

    } catch (error) {
        console.error("Gemini API Error:", error)
        return null
    }
}
