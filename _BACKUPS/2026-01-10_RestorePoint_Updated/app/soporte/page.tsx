"use client"
import { Headset } from "lucide-react"
import { DepartmentPageLayout } from "@/components/department-page-layout"

export default function SoportePage() {
    return (
        <DepartmentPageLayout
            title="Soporte Técnico"
            description="Gestión de tickets, atención remota y soporte operativo."
            icon={Headset}
            colorClass="bg-indigo-600 text-indigo-600"
        />
    )
}
