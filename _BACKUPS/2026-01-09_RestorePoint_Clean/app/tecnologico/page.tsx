"use client"
import { Cpu } from "lucide-react"
import { DepartmentPageLayout } from "@/components/department-page-layout"

export default function TecnologicoPage() {
    return (
        <DepartmentPageLayout
            title="Tecnológico"
            description="Desarrollo, integraciones y mantenimiento de sistemas."
            icon={Cpu}
            colorClass="bg-slate-800 text-slate-800"
        />
    )
}
