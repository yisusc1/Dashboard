"use client"

import { useState } from "react"
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd"
import { Calendar, MapPin, User, Phone, Clock } from "lucide-react"

interface Task {
  id: string
  title: string
  client: string
  phone: string
  address: string
  priority: "alta" | "media" | "baja"
  assignedTo?: string
  dueDate: string
  description: string
}

interface Column {
  id: string
  title: string
  color: string
  tasks: Task[]
}

const initialData: Column[] = [
  {
    id: "pendientes",
    title: "Pendientes",
    color: "#6c757d",
    tasks: [
      {
        id: "1",
        title: "Instalación Internet Fibra",
        client: "Juan Pérez",
        phone: "+1234567890",
        address: "Calle 123, Ciudad",
        priority: "alta",
        dueDate: "2024-01-20",
        description: "Instalación de internet fibra óptica 100MB",
      },
      {
        id: "2",
        title: "Soporte Técnico Router",
        client: "María García",
        phone: "+1234567891",
        address: "Avenida 456, Ciudad",
        priority: "media",
        dueDate: "2024-01-21",
        description: "Problemas de conectividad con router",
      },
    ],
  },
  {
    id: "asignadas",
    title: "Asignadas",
    color: "#007AFF",
    tasks: [
      {
        id: "3",
        title: "Mantenimiento Preventivo",
        client: "Carlos López",
        phone: "+1234567892",
        address: "Plaza 789, Ciudad",
        priority: "baja",
        assignedTo: "Equipo A",
        dueDate: "2024-01-22",
        description: "Mantenimiento preventivo de equipos",
      },
    ],
  },
  {
    id: "en-proceso",
    title: "En Proceso",
    color: "#fd7e14",
    tasks: [
      {
        id: "4",
        title: "Instalación Cámaras",
        client: "Ana Martín",
        phone: "+1234567893",
        address: "Sector 321, Ciudad",
        priority: "alta",
        assignedTo: "Equipo B",
        dueDate: "2024-01-19",
        description: "Instalación sistema de cámaras de seguridad",
      },
    ],
  },
  {
    id: "completadas",
    title: "Completadas",
    color: "#198754",
    tasks: [
      {
        id: "5",
        title: "Reparación Cable",
        client: "Luis Rodríguez",
        phone: "+1234567894",
        address: "Barrio 654, Ciudad",
        priority: "media",
        assignedTo: "Equipo C",
        dueDate: "2024-01-18",
        description: "Reparación de cable dañado",
      },
    ],
  },
]

const priorityColors = {
  alta: "#dc3545",
  media: "#fd7e14",
  baja: "#198754",
}

export default function KanbanBoard() {
  const [columns, setColumns] = useState(initialData)

  const onDragEnd = (result: any) => {
    const { destination, source, draggableId } = result

    if (!destination) return

    if (destination.droppableId === source.droppableId && destination.index === source.index) {
      return
    }

    const sourceColumn = columns.find((col) => col.id === source.droppableId)!
    const destColumn = columns.find((col) => col.id === destination.droppableId)!
    const task = sourceColumn.tasks.find((task) => task.id === draggableId)!

    // Remove from source
    const newSourceTasks = sourceColumn.tasks.filter((task) => task.id !== draggableId)

    // Add to destination
    const newDestTasks = [...destColumn.tasks]
    newDestTasks.splice(destination.index, 0, task)

    const newColumns = columns.map((col) => {
      if (col.id === source.droppableId) {
        return { ...col, tasks: newSourceTasks }
      }
      if (col.id === destination.droppableId) {
        return { ...col, tasks: newDestTasks }
      }
      return col
    })

    setColumns(newColumns)
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Tablero Kanban - Gestión de Tareas</h1>
        <p className="text-gray-600">Arrastra las tareas entre columnas para cambiar su estado</p>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {columns.map((column) => (
            <div key={column.id} className="bg-white rounded-lg shadow-sm border">
              <div className="p-4 border-b" style={{ borderTopColor: column.color, borderTopWidth: "3px" }}>
                <h3 className="font-semibold text-gray-900 flex items-center justify-between">
                  {column.title}
                  <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full">
                    {column.tasks.length}
                  </span>
                </h3>
              </div>

              <Droppable droppableId={column.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`p-4 min-h-[200px] ${snapshot.isDraggingOver ? "bg-blue-50" : ""}`}
                  >
                    {column.tasks.map((task, index) => (
                      <Draggable key={task.id} draggableId={task.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`bg-white border rounded-lg p-4 mb-3 shadow-sm hover:shadow-md transition-shadow ${
                              snapshot.isDragging ? "rotate-2 shadow-lg" : ""
                            }`}
                          >
                            <div className="flex items-start justify-between mb-2">
                              <h4 className="font-medium text-gray-900 text-sm">{task.title}</h4>
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: priorityColors[task.priority] }}
                                title={`Prioridad ${task.priority}`}
                              />
                            </div>

                            <div className="space-y-2 text-xs text-gray-600">
                              <div className="flex items-center gap-1">
                                <User className="w-3 h-3" />
                                <span>{task.client}</span>
                              </div>

                              <div className="flex items-center gap-1">
                                <Phone className="w-3 h-3" />
                                <span>{task.phone}</span>
                              </div>

                              <div className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                <span className="truncate">{task.address}</span>
                              </div>

                              <div className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                <span>{task.dueDate}</span>
                              </div>

                              {task.assignedTo && (
                                <div className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  <span>{task.assignedTo}</span>
                                </div>
                              )}
                            </div>

                            <p className="text-xs text-gray-500 mt-2 line-clamp-2">{task.description}</p>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </div>
      </DragDropContext>
    </div>
  )
}
