
import { createClient } from 'npm:@supabase/supabase-js@2'
import jwt from 'npm:jsonwebtoken@9.0.2'

// Hardcoded Service Account (Cleaned up for reliability)
const serviceAccount = {
    "type": "service_account",
    "project_id": "asistente-483918",
    "private_key_id": "d650aebb54f069448f54a8e8da0b921eedb4bb95",
    "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC2VjTrkUIJamaA\nLRSlnaMv14kHClAOOpGAwAK4pkf87bJb2qYOEXQGRceqjsRyjoIOSMdMfkRzuB58\njUo2ilqIYky6Kdjk38NM5lNutBvFab4HEQwTd3VnkTx5GOni/6+epRzaQRL+8uBb\n1afxUf9wbWi29WcVlz2AkPtPznUU6xddsC5E4+q+BPYrHcXQhO6aU1PFR7L8oqLn\n7Zwe5hwn3iqR0ShSPx3KkAzh0D94YqaGI/FFzjCDW0QCm8qXSFd1lfs4XXV/a8JN\nxxJUDtrpshRV+jA+DnNyhdo+fZIlbsBy5MVhBjCgKD4qQeNOQ4j7449za9FZcFsM\ne4zMnVhjAgMBAAECggEACyCcrymYtZlkMvtNUMQbgt5s8tyKwSuK2KgfImSnbQSW\nh2uDCcW/5mgYxMxcqb8Pqc6ANydXhxZb6e73cfekicEx/IR0Q5dyRD2kJtPgA/6t\nhaHhMkjuhckDv0Ipd9xxu8VIyvsArUVmMsSJsLz30UUkCFJWnacyridq5tZrJ8EM\ngy7NR96b3npwjwRd1wPrEGM7SVVG0ktwigJqu38w8+pTMVQrjs3Kdp0NFmi65tOy\nJgYahSWc/OS5R0VFQ0kxgJKDzx/3ReqWA1/Q9hibATtuEy16N8elQyTqrgqJAayl\nqrq4tTVvJJJrLHFW/3cE72eJIs3GBRO9i5eENj6mYQKBgQD0vo0cV99P7pA7y4qX\nyP10V1z7ggwNmaH/MWxaD090GBr7qqyqTz3BV8+z++TWTbR1S/P4IeBsVH8jbc2B\nkPUQVDOdHgD9oqtqGX//mAUItYt155f9QgbFeuIrO/N0CDhCm6MuzQ9R5XM0YmdP\nkHtcJoFcEF2Ev21mzbzotZdLgwKBgQC+uOl/RcWrajUiOqWnv4ki/8RX6Ayvr/zH\nFKGpoaCtTawiJ8ymBLYSE7sFj+++U2Iez5kST7vU21Dd6tRU9WXiv7T6PdYGo8Lg\nm5jzLycIx+rhN3Ycwdr/0KWlqt3mq3X3NToiocft/q4DfBl4AaEaycScRjneMoak\niKuD4I/JoQKBgD/KswkiNkilS97qDLPHZZi/dLLxkKay1rCndzB6MSF3bwEN2XeC\ns/wDIVYuX9Uj59dy9qJEYjSaSZE4e4o7+ERLTjCzs1po3fkHsH80ZouAllsjBFC0\ntwMeJnlSZQBnbBKgcoYuWMHl5oNO6tKoPB8mwiz27wk8xA05rvWQ72B1AoGBAI+N\n/Wrn6JZSlfXSsPenqqBmZbJJHqtqythKRji5SIjJiwQWcuqPZ0AKC95u7eSTPKq2\nVaA71cSs45x18iaUo4DeDWnB+4P55WhMlf6NglMQr1Gf/k48+AtPUC93ghjq/Br7\nvGtu3F7eMLq8wSrcBxhzwIJkNZBy9XeIy5izAWehAoGAZ+if9uQtdfrkWlnDbZ8d\nVxbb/oqWATYEvmryCb6252dG9PimOFL/7u4YKVVz90bJjEZMx4JE2Kcu+02xQzaE\ne+UUOy9c0ibk9AZ4TB4ymfjsjUhuP0KORiX55vhTq5k7iGm3jYOCcH1USoFXvWKG\nK7ZsWOXhy88JS7EfB7yjNVI=\n-----END PRIVATE KEY-----\n",
    "client_email": "firebase-adminsdk-fbsvc@asistente-483918.iam.gserviceaccount.com",
}

const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

// Helper to get Google Access Token
async function getAccessToken() {
    try {
        const now = Math.floor(Date.now() / 1000)
        const payload = {
            iss: serviceAccount.client_email,
            scope: "https://www.googleapis.com/auth/firebase.messaging",
            aud: "https://oauth2.googleapis.com/token",
            exp: now + 3600,
            iat: now,
        }

        const token = jwt.sign(payload, serviceAccount.private_key, { algorithm: 'RS256' })

        const res = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
                grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
                assertion: token,
            }),
        })

        const data = await res.json()
        if (!res.ok) throw new Error(data.error_description || "Failed to get access token")

        return data.access_token

    } catch (e) {
        console.error("AccessToken Error:", e)
        throw e
    }
}

Deno.serve(async (req) => {
    // CORS Headers
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    }

    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const payload = await req.json()
        const { type, table, record, old_record } = payload

        console.log(`Received Webhook: ${type} on ${table}`)

        // 1. Construct Notification Payload
        let title = ''
        let body = ''
        let shouldSend = false

        if (table === 'reportes' && (type === 'INSERT' || type === 'UPDATE')) {
            const isEntry = !!record.fecha_entrada

            // Logic:
            // INSERT + !fecha_entrada = New Exit (SALIDA) -> Notify
            // UPDATE + !fecha_entrada -> Still open (Edit Salida) -> Ignore? Maybe not.
            // UPDATE + fecha_entrada -> Trip Closed (ENTRADA)

            if (type === 'UPDATE') {
                const wasAlreadyClosed = old_record && !!old_record.fecha_entrada

                // If it was already closed, this is just a minor edit (e.g. correcting typo), don't spam.
                if (wasAlreadyClosed) {
                    return new Response(JSON.stringify({ message: 'Ignoring update on closed report' }), { headers: corsHeaders })
                }

                // If it's still open (no entry date), ignore updates too (unless we want "Exit Updated"?)
                if (!isEntry) {
                    return new Response(JSON.stringify({ message: 'Ignoring update on open report' }), { headers: corsHeaders })
                }

                // If we get here: It was OPEN, and now it is CLOSED. This is the ENTRY event.
            }

            const opType = isEntry ? 'ENTRADA' : 'SALIDA'
            title = `🚗 Vehículo: ${opType}`

            // Fetch vehicle name
            let vehicleInfo = 'Desconocido'
            if (record.vehiculo_id) {
                const { data: vData } = await supabase
                    .from('vehiculos')
                    .select('modelo, placa')
                    .eq('id', record.vehiculo_id)
                    .single()

                if (vData) {
                    vehicleInfo = `${vData.modelo} (${vData.placa})`
                }
            }

            // Format: "Toyota Hilux (ABC-123) - Conductor: Juan Perez"
            body = `${vehicleInfo}\nConductor: ${record.conductor || 'No registrado'}`
            shouldSend = true
        } else if (table === 'fuel_logs' && type === 'INSERT') {
            title = '⛽ Carga de Combustible'
            body = `Vehículo ${record.vehicle_id} cargó ${record.liters}L (${record.mileage} Km)`
            shouldSend = true
        } else if (table === 'fallas' && type === 'INSERT') {
            title = '🛠️ Nueva Falla Reportada'

            // Fetch vehicle name for better context
            let vehicleInfo = 'Desconocido'
            const vId = record.vehicle_id || record.vehiculo_id // Try both common implementations

            if (vId) {
                const { data: vData } = await supabase
                    .from('vehiculos')
                    .select('modelo, placa')
                    .eq('id', vId)
                    .single()

                if (vData) {
                    vehicleInfo = `${vData.modelo} (${vData.placa})`
                }
            }

            // User requested: Model + Plate + Failure Description (No code)
            body = `${vehicleInfo}\n${record.descripcion?.substring(0, 100) || 'Sin descripción'}`
            shouldSend = true
        }

        if (!shouldSend) {
            return new Response(JSON.stringify({ message: 'No notification needed' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            })
        }

        // 2. Determine Audience
        const baseTitles = ['Presidente', 'Gerente General', 'Gerente de Operaciones']
        let targetTitles = [...baseTitles]
        if (table === 'fallas') targetTitles.push('Mecánico')

        const { data: managers } = await supabase
            .from('profiles')
            .select('id')
            .in('job_title', targetTitles)

        if (!managers?.length) {
            return new Response(JSON.stringify({ message: 'No managers found' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        const managerIds = managers.map(m => m.id)
        const { data: devices } = await supabase
            .from('user_devices')
            .select('fcm_token')
            .in('user_id', managerIds)

        if (!devices?.length) {
            return new Response(JSON.stringify({ message: 'No devices found' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        const uniqueTokens = [...new Set(devices.map(d => d.fcm_token))]
        console.log(`Sending to ${uniqueTokens.length} devices...`)

        // 3. Authenticate with Google
        let accessToken;
        try {
            accessToken = await getAccessToken()
        } catch (e) {
            return new Response(JSON.stringify({ error: "Google Auth Failed: " + e.message }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            })
        }

        // 4. Send Individual Requests (Batch sending in v1 requires HTTP/2 or loop)
        // For simplicity and clarity, we loop promise.all for now.
        const promises = uniqueTokens.map(async (token) => {
            const fcmPayload = {
                message: {
                    token: token,
                    notification: {
                        title,
                        body,
                    },
                    data: {
                        title: title || '',
                        body: body || '',
                    },
                    android: {
                        priority: "HIGH",
                        notification: {
                            channelId: "default",
                            defaultSound: true,
                            // priority key was invalid here
                        }
                    }
                }
            }

            const res = await fetch(`https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(fcmPayload)
            })

            if (!res.ok) {
                const txt = await res.text()
                console.error(`Failed for token ${token.substring(0, 5)}...: ${txt}`)
                // Return valid JSON error object even if text is returned
                let errorJson = { message: txt }
                try { errorJson = JSON.parse(txt) } catch (e) { }

                return { success: false, error: errorJson }
            }
            return { success: true }
        })

        const results = await Promise.all(promises)
        const successCount = results.filter(r => r.success).length
        const failureCount = results.filter(r => !r.success).length

        return new Response(JSON.stringify({ success: true, successCount, failureCount, results }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })

    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })
    }
})
