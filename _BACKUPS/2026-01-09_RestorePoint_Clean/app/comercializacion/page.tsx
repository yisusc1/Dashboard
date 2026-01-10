"use client"
import { ShoppingBag } from "lucide-react"
import { DepartmentPageLayout } from "@/components/department-page-layout"

export default function ComercializacionPage() {
    return (
        <DepartmentPageLayout
            title="Comercialización"
            description="Ventas, promociones y atención comercial."
            icon={ShoppingBag}
            colorClass="bg-emerald-600 text-emerald-600"
        />
    )
}
