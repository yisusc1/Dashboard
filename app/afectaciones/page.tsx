"use client"
import { Activity } from "lucide-react"
import { DepartmentPageLayout } from "@/components/department-page-layout"

export default function AfectacionesPage() {
    return (
        <DepartmentPageLayout
            title="Afectaciones"
            description="Resolución de incidencias masivas y fallas de red."
            icon={Activity}
            colorClass="bg-red-600 text-red-600"
        />
    )
}
