"use client"
import { CalendarRange } from "lucide-react"
import { DepartmentPageLayout } from "@/components/department-page-layout"

export default function PlanificacionPage() {
    return (
        <DepartmentPageLayout
            title="Planificación"
            description="Coordinación de agendas, citas y gestión de clientes."
            icon={CalendarRange}
            colorClass="bg-pink-600 text-pink-600"
        />
    )
}
