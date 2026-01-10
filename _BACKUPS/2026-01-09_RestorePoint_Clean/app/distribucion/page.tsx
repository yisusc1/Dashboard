"use client"
import { Network } from "lucide-react"
import { DepartmentPageLayout } from "@/components/department-page-layout"

export default function DistribucionPage() {
    return (
        <DepartmentPageLayout
            title="Distribución"
            description="Mantenimiento y expansión de la red de fibra óptica."
            icon={Network}
            colorClass="bg-cyan-600 text-cyan-600"
        />
    )
}
