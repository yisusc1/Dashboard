"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter, usePathname } from "next/navigation"
import { Mic, MicOff, X, Activity } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { processWithGemini } from "@/app/actions/assistant"

// Extend Window interface for Web Speech API
declare global {
    interface Window {
        SpeechRecognition: any
        webkitSpeechRecognition: any
        speechSynthesis: any
        SpeechSynthesisUtterance: any
    }
}

export function VoiceAssistant() {
    const router = useRouter()
    const pathname = usePathname()
    const [isListening, setIsListening] = useState(false)
    const [isProcessing, setIsProcessing] = useState(false)
    const [transcript, setTranscript] = useState("")
    const [feedback, setFeedback] = useState("")

    const recognitionRef = useRef<any>(null)

    // Initialize Speech Recognition
    useEffect(() => {
        if (typeof window !== "undefined") {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
            if (SpeechRecognition) {
                const recognition = new SpeechRecognition()
                recognition.continuous = false
                recognition.lang = "es-ES"
                recognition.interimResults = false

                recognition.onstart = () => {
                    setIsListening(true)
                    setFeedback("Escuchando...")
                    playPing()
                }

                recognition.onend = () => {
                    setIsListening(false)
                }

                recognition.onresult = (event: any) => {
                    const text = event.results[0][0].transcript
                    setTranscript(text)
                    processCommand(text)
                }

                recognition.onerror = (event: any) => {
                    console.error("Speech recognition error", event.error)
                    setIsListening(false)
                    setFeedback("Error al escuchar")
                    if (event.error === 'not-allowed') {
                        toast.error("Permiso de micrófono denegado")
                    }
                }

                recognitionRef.current = recognition
            } else {
                console.warn("Speech Recognition not supported")
            }
        }
    }, [])

    const startListening = () => {
        if (recognitionRef.current) {
            try {
                recognitionRef.current.start()
            } catch (e) {
                // Already started
            }
        } else {
            toast.error("Tu navegador no soporta comandos de voz")
        }
    }

    const stopListening = () => {
        if (recognitionRef.current) {
            recognitionRef.current.stop()
        }
    }

    const speak = (text: string) => {
        if (typeof window !== "undefined" && window.speechSynthesis) {
            // Cancel previous
            window.speechSynthesis.cancel()
            const utterance = new window.SpeechSynthesisUtterance(text)
            utterance.lang = "es-ES"
            utterance.rate = 1.0
            utterance.pitch = 1.0
            window.speechSynthesis.speak(utterance)
        }
    }

    const playPing = () => {
        // Simple audio feedback could go here
    }

    const processCommand = async (text: string) => {
        setIsProcessing(true)

        let response = ""
        let action: any = { type: 'NONE' }

        // Use AI (Gemini) ONLY
        try {
            const result = await processWithGemini(text)

            if (result.success && result.data) {
                response = result.data.response
                action = result.data.action
            } else {
                // Handle specific errors
                if (result.error === "MISSING_KEY") {
                    response = "Error: Falta la API Key de Gemini en el servidor."
                    toast.error("Falta Variable de Entorno: GEMINI_API_KEY")
                } else if (result.error === "API_ERROR") {
                    response = `Error de IA: ${result.errorMessage || "Falló la conexión"}`
                    console.error("Detalle Error IA:", result.errorMessage)
                } else if (result.error === "PARSE_ERROR") {
                    response = "El asistente generó una respuesta inválida."
                } else {
                    response = "Ocurrió un error desconocido."
                }
            }
        } catch (e) {
            console.error("Client processing failed", e)
            response = "Error de conexión."
        }

        setFeedback(response)
        speak(response)

        // Execute Action
        if (action.type === 'NAVIGATE') {
            if (action.path === 'BACK') {
                router.back()
            } else if (action.path) {
                router.push(action.path)
            }
        }

        // AUTO-CLOSE LOGIC:
        // Only close if it appears to be a successful interaction
        const isError = response.startsWith("Error") || response.startsWith("No pude") || response.startsWith("Falta");

        if (!isError) {
            setTimeout(() => {
                setIsProcessing(false)
                setTranscript("")
            }, 2000)
        } else {
            // Stop processing spinner but keep window open for reading
            setIsProcessing(false)
        }
    }

    if (!recognitionRef.current) return null // Hide if not supported

    return (
        <>
            {/* Floating Trigger Button */}
            {!isListening && (
                <Button
                    onClick={startListening}
                    className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-2xl bg-black text-white hover:bg-zinc-800 hover:scale-110 transition-all duration-300 z-50 flex items-center justify-center group"
                >
                    <Mic className="h-6 w-6 group-hover:animate-pulse" />
                    <span className="sr-only">Asistente de Voz</span>
                </Button>
            )}

            {/* Active Interface Overlay */}
            {isListening && (
                <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                    {/* Click outside to close */}
                    <div className="absolute inset-0" onClick={stopListening} />

                    <div className="relative w-full max-w-md bg-white rounded-[2rem] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 zoom-in-95 duration-300 p-6 flex flex-col items-center gap-6">

                        {/* Close Button */}
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute top-4 right-4 rounded-full text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100"
                            onClick={stopListening}
                        >
                            <X size={20} />
                        </Button>

                        {/* Visualizer */}
                        <div className="relative h-24 w-24 flex items-center justify-center mt-4">
                            <div className="absolute inset-0 bg-blue-500/20 rounded-full animate-ping" />
                            <div className="absolute inset-2 bg-blue-500/30 rounded-full animate-pulse delay-75" />
                            <div className="relative h-16 w-16 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-full flex items-center justify-center shadow-lg shadow-blue-500/50">
                                <Mic className="text-white h-8 w-8" />
                            </div>
                        </div>

                        {/* Status Text */}
                        {/* Status Text */}
                        <div className="text-center space-y-2 max-w-[90%] w-full">
                            {feedback ? (
                                <div className={cn(
                                    "p-3 rounded-lg text-left max-h-60 overflow-y-auto border",
                                    (feedback.startsWith("Error") || feedback.startsWith("No pude") || feedback.startsWith("Falta"))
                                        ? "bg-red-50 border-red-100"
                                        : "bg-blue-50 border-blue-100"
                                )}>
                                    <p className={cn(
                                        "text-sm font-bold mb-1",
                                        (feedback.startsWith("Error") || feedback.startsWith("No pude") || feedback.startsWith("Falta"))
                                            ? "text-red-800"
                                            : "text-blue-800"
                                    )}>
                                        {(feedback.startsWith("Error") || feedback.startsWith("No pude") || feedback.startsWith("Falta")) ? "⚠️ Algo salió mal:" : "🤖 Asistente:"}
                                    </p>
                                    <p className={cn(
                                        "text-sm font-mono break-words select-text whitespace-pre-wrap",
                                        (feedback.startsWith("Error") || feedback.startsWith("No pude") || feedback.startsWith("Falta"))
                                            ? "text-red-700"
                                            : "text-zinc-700"
                                    )}>
                                        {feedback}
                                    </p>
                                </div>
                            ) : (
                                <>
                                    <h3 className="text-xl font-bold text-zinc-900">
                                        {isProcessing ? "Procesando..." : "Te escucho..."}
                                    </h3>
                                    <p className="text-lg font-medium text-blue-600 min-h-[1.75rem]">
                                        {transcript || "Di un comando..."}
                                    </p>
                                    <p className="text-sm text-zinc-400">
                                        Prueba: "Ir a Taller", "Escanear QR", "Volver"
                                    </p>
                                </>
                            )}
                        </div>

                        {/* Feedback Toast style in-card */}
                        {feedback && isProcessing && (
                            <div className="bg-zinc-100 px-4 py-2 rounded-xl text-zinc-600 text-sm font-medium animate-in fade-in slide-in-from-bottom-2">
                                {feedback}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    )
}
