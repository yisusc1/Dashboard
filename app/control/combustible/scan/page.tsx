"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Html5Qrcode } from "html5-qrcode"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, QrCode } from "lucide-react"
import Link from "next/link"

export default function ScanPage() {
    const router = useRouter()
    const [error, setError] = useState<string | null>(null)
    const [scanning, setScanning] = useState(true)

    useEffect(() => {
        let isMounted = true
        // Use a unique ID logic or handle cleanup strictly.
        // NOTE: Html5Qrcode needs the element to exist.
        const scannerId = "reader"
        let html5QrCode: Html5Qrcode | null = null

        const initScanner = async () => {
            try {
                if (!document.getElementById(scannerId)) return

                html5QrCode = new Html5Qrcode(scannerId)

                await html5QrCode.start(
                    { facingMode: "environment" },
                    {
                        fps: 10,
                        qrbox: { width: 250, height: 250 },
                        aspectRatio: 1.0
                    },
                    (decodedText) => {
                        if (!isMounted) return
                        const cleanText = decodedText.trim()
                        console.log(`Scan result: ${cleanText}`)

                        try {
                            const data = JSON.parse(cleanText)
                            if (data.type === 'FUEL_AUTH') {
                                // STOP first then navigate
                                html5QrCode?.stop().then(() => {
                                    if (!isMounted) return
                                    const params = new URLSearchParams()
                                    if (data.vehicleId) params.set('vehicleId', data.vehicleId)
                                    if (data.driverName) params.set('driverName', data.driverName)
                                    if (data.driverId) params.set('driverId', data.driverId)
                                    router.push(`/control/combustible/new?${params.toString()}`)
                                }).catch(err => console.error("Error stopping on success", err))
                            }
                        } catch (e) {
                            // ignore
                        }
                    },
                    (errorMessage) => {
                        // ignore
                    }
                )
            } catch (err) {
                if (isMounted) {
                    console.error("Error starting scanner", err)
                    setError("No se pudo iniciar la cámara. Verifique permisos.")
                }
            }
        }

        // Small delay to ensure DOM is ready and previous cleanup finished
        const timer = setTimeout(() => {
            initScanner()
        }, 100)

        return () => {
            isMounted = false
            clearTimeout(timer)
            if (html5QrCode) {
                html5QrCode.stop().then(() => {
                    html5QrCode?.clear()
                }).catch(err => {
                    console.warn("Scanner stop error", err)
                    // Force clear if stop fails state
                    try { html5QrCode?.clear() } catch (e) { }
                })
            }
        }
    }, [router])

    return (
        <div className="p-6 max-w-lg mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/control/combustible">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft size={20} />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Escanear Conductor</h1>
                    <p className="text-muted-foreground">Escanea el código QR del chofer para autorizar.</p>
                </div>
            </div>

            <Card className="border-slate-200 shadow-sm overflow-hidden bg-black">
                <CardContent className="p-0 relative min-h-[300px]">
                    {error ? (
                        <div className="absolute inset-0 flex items-center justify-center text-white p-4 text-center">
                            {error}
                        </div>
                    ) : (
                        <div id="reader" className="w-full h-full"></div>
                    )}
                </CardContent>
            </Card>

            <div className="text-center text-sm text-zinc-400">
                Asegúrese de tener permisos de cámara habilitados y buena iluminación.
            </div>
        </div>
    )
}
