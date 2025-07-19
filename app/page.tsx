"use client"

import type React from "react"

import { useState } from "react"
import { Users, ClipboardList, Settings, Headphones, BarChart3, MapPin } from "lucide-react"

interface UserRole {
  id: string
  name: string
  description: string
  icon: React.ReactNode
  color: string
  pages: string[]
}

const roles: UserRole[] = [
  {
    id: "asesor",
    name: "Asesor de Ventas",
    description: "Registrar nuevos clientes y solicitudes",
    icon: <Users className="w-6 h-6" />,
    color: "#007AFF",
    pages: ["Formulario de Solicitud"],
  },
  {
    id: "admin",
    name: "Planificador/Admin",
    description: "Gestionar solicitudes y asignar equipos",
    icon: <Settings className="w-6 h-6" />,
    color: "#198754",
    pages: ["Panel de Administración", "Tablero Kanban"],
  },
  {
    id: "instalacion",
    name: "Técnico de Instalación",
    description: "Reportar instalaciones técnicas",
    icon: <ClipboardList className="w-6 h-6" />,
    color: "#fd7e14",
    pages: ["Reporte de Instalación", "Búsqueda de Tareas"],
  },
  {
    id: "soporte",
    name: "Técnico de Soporte",
    description: "Documentar visitas de soporte",
    icon: <Headphones className="w-6 h-6" />,
    color: "#6f42c1",
    pages: ["Reporte de Soporte", "Historial de Visitas"],
  },
]

export default function Dashboard() {
  const [selectedRole, setSelectedRole] = useState<string | null>(null)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="navbar">
        <div className="container navbar-content">
          <div className="logo">
            <BarChart3 className="w-8 h-8 inline-block mr-2" />
            Sistema de Gestión de Operaciones
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">Panel Principal</span>
          </div>
        </div>
      </nav>

      <div className="container py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Bienvenido al Sistema de Gestión</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Selecciona tu rol para acceder a las herramientas correspondientes
          </p>
        </div>

        {/* Role Selection Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {roles.map((role) => (
            <div
              key={role.id}
              className={`card cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-1 ${
                selectedRole === role.id ? "ring-2 ring-blue-500" : ""
              }`}
              onClick={() => setSelectedRole(selectedRole === role.id ? null : role.id)}
            >
              <div className="text-center">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                  style={{ backgroundColor: `${role.color}20`, color: role.color }}
                >
                  {role.icon}
                </div>
                <h3 className="text-lg font-semibold mb-2">{role.name}</h3>
                <p className="text-sm text-gray-600 mb-4">{role.description}</p>
                <div className="space-y-1">
                  {role.pages.map((page, index) => (
                    <div key={index} className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                      {page}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        {selectedRole && (
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Acciones Rápidas</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {selectedRole === "asesor" && (
                <>
                  <button className="btn btn-primary">
                    <Users className="w-4 h-4" />
                    Nueva Solicitud
                  </button>
                  <button className="btn btn-primary">
                    <ClipboardList className="w-4 h-4" />
                    Ver Solicitudes
                  </button>
                  <button className="btn btn-primary">
                    <MapPin className="w-4 h-4" />
                    Ubicar Cliente
                  </button>
                </>
              )}

              {selectedRole === "admin" && (
                <>
                  <button className="btn btn-success">
                    <Settings className="w-4 h-4" />
                    Panel Admin
                  </button>
                  <button className="btn btn-success">
                    <BarChart3 className="w-4 h-4" />
                    Tablero Kanban
                  </button>
                  <button className="btn btn-success">
                    <ClipboardList className="w-4 h-4" />
                    Reportes
                  </button>
                </>
              )}

              {selectedRole === "instalacion" && (
                <>
                  <button className="btn" style={{ backgroundColor: "#fd7e14", color: "white" }}>
                    <ClipboardList className="w-4 h-4" />
                    Nuevo Reporte
                  </button>
                  <button className="btn" style={{ backgroundColor: "#fd7e14", color: "white" }}>
                    <Users className="w-4 h-4" />
                    Mis Tareas
                  </button>
                  <button className="btn" style={{ backgroundColor: "#fd7e14", color: "white" }}>
                    <MapPin className="w-4 h-4" />
                    Mi Ubicación
                  </button>
                </>
              )}

              {selectedRole === "soporte" && (
                <>
                  <button className="btn" style={{ backgroundColor: "#6f42c1", color: "white" }}>
                    <Headphones className="w-4 h-4" />
                    Nuevo Soporte
                  </button>
                  <button className="btn" style={{ backgroundColor: "#6f42c1", color: "white" }}>
                    <ClipboardList className="w-4 h-4" />
                    Historial
                  </button>
                  <button className="btn" style={{ backgroundColor: "#6f42c1", color: "white" }}>
                    <Users className="w-4 h-4" />
                    Clientes Asignados
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-8">
          <div className="card text-center">
            <div className="text-2xl font-bold text-blue-600 mb-2">24</div>
            <div className="text-sm text-gray-600">Solicitudes Pendientes</div>
          </div>
          <div className="card text-center">
            <div className="text-2xl font-bold text-green-600 mb-2">18</div>
            <div className="text-sm text-gray-600">En Proceso</div>
          </div>
          <div className="card text-center">
            <div className="text-2xl font-bold text-orange-600 mb-2">12</div>
            <div className="text-sm text-gray-600">Instalaciones Hoy</div>
          </div>
          <div className="card text-center">
            <div className="text-2xl font-bold text-purple-600 mb-2">8</div>
            <div className="text-sm text-gray-600">Soportes Activos</div>
          </div>
        </div>
      </div>
    </div>
  )
}
