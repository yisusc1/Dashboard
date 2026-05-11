import { redirect } from "next/navigation"

// Control module now only has Combustible
// Redirect to combustible directly
export default function ControlPage() {
    redirect("/control/combustible")
}
