export const DEPARTMENTS = [
    "Altos Mandos",
    "Transporte",
    "Administración"
] as const

export const JOB_TITLES_BY_DEPARTMENT: Record<string, string[]> = {
    "Altos Mandos": [
        "Presidente",
        "Gerente General",
        "Gerente de Operaciones"
    ],
    "Transporte": [
        "Encomendador",
        "Chofer",
        "Mecánico"
    ],
    "Administración": [
        "Encargado",
        "Supervisor",
        "Atención al Cliente",
        "Taquillero",
        "Call Center"
    ]
}

// Helper to get flat list if needed, though we should prefer hierarchical
export const ALL_JOB_TITLES = Array.from(new Set(
    Object.values(JOB_TITLES_BY_DEPARTMENT).flat()
)).sort()

// Module Feature Flags (Initial State)
export const INITIAL_MODULES_CONFIG = [
    { key: "module_transporte", label: "Transporte / Chofer", path: "/transporte", default: true },
    { key: "module_taller", label: "Taller Mecánico", path: "/taller", default: true },
    { key: "module_control", label: "Auditoría / Control", path: "/control", default: true },
    { key: "module_combustible", label: "Combustible", path: "/control/combustible", default: true },
] as const
