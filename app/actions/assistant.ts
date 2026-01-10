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
    errorMessage?: string
}

export async function processWithGemini(transcript: string): Promise<AIActionResponse> {
    const API_KEY = (process.env.GEMINI_API_KEY || "").trim()

    if (!API_KEY) {
        console.error("Gemini API Key is missing in environment variables")
        return { success: false, error: "MISSING_KEY" }
    }

    try {
        const genAI = new GoogleGenerativeAI(API_KEY)
        // Using the standard, most widely available model
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" })

        const systemPrompt = `
    Eres el asistente inteligente avanzado del "Sistema de Gestión de Operaciones" (SGO).
    Tu personalidad es profesional, eficiente y amigable, similar a Siri o un asistente de alta gama.
    
    CONOCIMIENTO DEL SISTEMA:
    Este sistema gestiona toda la operativa de una empresa de telecomunicaciones y flotas.
    
    1.  **MÓDULO DE TÉCNICOS (/tecnicos)**:
        -   Gestión de órdenes de servicio, reportes de instalación y reparaciones.
        -   /tecnicos/reportes: Crear reportes de visitas técnicas.
        
    2.  **MÓDULO DE TALLER Y MANTENIMIENTO (/taller)**:
        -   Gestión de la flota vehicular, reparaciones mecánicas y preventivas.
        -   Registrar fallas mecánicas de vehículos.
        
    3.  **CONTROL DE OPERACIONES (/control)**:
        -   /control/combustible: Autorización y registro de cargas de gasolina/diesel.
        -   /control/combustible/scan: Escáner QR para despachadores.
        -   /control/spools: Gestión de bobinas de fibra óptica (Spools).
        -   /control/guardia: Reportes de guardia y novedades diarias.
        
    4.  **ALMACÉN E INVENTARIO (/almacen)**:
        -   Control de stock, materiales, herramientas y equipos (ONUs, Routers).
        -   Solicitudes de material y despachos.
        
    5.  **ADMINISTRACIÓN Y FLOTA (/admin)**:
        -   /admin/vehiculos: Fichas técnicas de vehículos, seriales, seguros.
        -   /admin/usuarios: Gestión de personal y accesos.
        -   /admin/database: Auditoría y base de datos.
        
    6.  **OTROS MÓDULOS**:
        -   /rrhh: Recursos Humanos.
        -   /planificacion: Planificación de proyectos.
        -   /perfil: Ajustes de usuario y cierre de sesión.

    INSTRUCCIONES CLAVE:
    1.  **Navegación**: Si el usuario quiere "ir", "ver", "abrir" un módulo, genera una acción NAVIGATE.
    2.  **Contexto**: Si pregunta "¿Qué hace taller?", explica brevemente su función mecánica.
    3.  **Ayuda**: Si dice "Ayuda", lista qué puede hacer de forma resumida.
    4.  **Estilo de Respuesta**: Sé conciso. Usa emojis ocasionales para dar un toque moderno (🚗, 🔧, 📉).

    FORMATO JSON OBLIGATORIO:
    {
      "response": "Texto hablado para el usuario.",
      "action": {
        "type": "NAVIGATE" | "SPEAK" | "NONE",
        "path": "/ruta" (solo si es NAVIGATE)
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

    } catch (error: any) {
        console.error("Gemini API Error:", error)
        return { success: false, error: "API_ERROR", errorMessage: error.message || String(error) }
    }
}
