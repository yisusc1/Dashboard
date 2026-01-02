"use client"
import { Users2 } from "lucide-react"
import { DepartmentPageLayout } from "@/components/department-page-layout"

export default function RRHHPage() {
    return (
        <DepartmentPageLayout
            title="Recursos Humanos"
            description="Gestión de personal, nómina y bienestar laboral."
            icon={Users2}
            colorClass="bg-rose-600 text-rose-600"
        />
    )
}
