"use server"

import { GoogleGenerativeAI } from "@google/generative-ai"



export type AIActionResponse = {
    success: boolean
    data?: {
        response: string
        action: {
            type: 'NAVIGATE' | 'SPEAK' | 'NONE'
            path?: string
        }
    }
    error?: string
}

export async function processWithGemini(transcript: string): Promise<AIActionResponse> {
    const API_KEY = process.env.GEMINI_API_KEY || ""

    if (!API_KEY) {
        console.error("Gemini API Key is missing in environment variables")
        return { success: false, error: "MISSING_KEY" }
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
    `

        const result = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: `System: ${systemPrompt}\nUser Input: "${transcript}"\nResponse (JSON):` }] }],
            generationConfig: { responseMimeType: "application/json" }
        })

        const text = result.response.text()
        console.log("Gemini Raw Response:", text)

        try {
            const data = JSON.parse(text)
            return { success: true, data }
        } catch (parseError) {
            console.error("Error parsing Gemini JSON", parseError)
            return { success: false, error: "PARSE_ERROR" }
        }

    } catch (error) {
        console.error("Gemini API Error:", error)
        return { success: false, error: "API_ERROR" }
    }
}
