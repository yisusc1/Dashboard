
export const PROJECT_CONTEXT = `
NOMBRE DEL SISTEMA: Sistema de Gestión de Operaciones (SGO) - Telecomunicaciones

DESCRIPCIÓN GENERAL:
Este sistema es una plataforma integral para gestionar las operaciones de una empresa de telecomunicaciones, incluyendo gestión de flota vehicular, mantenimiento, control de inventario y combustible.

MÓDULOS PRINCIPALES:

1.  **Transporte (/transporte)**:
    -   Registro de salidas y entradas de vehículos.
    -   Control de kilometraje y estado de vehículos.

2.  **Taller y Mantenimiento (/taller)**:
    -   Gestión de la flota de vehículos.
    -   Registro de mantenimientos preventivos y correctivos (fallas).
    -   Control de kilometraje.

3.  **Chofer (/chofer)**:
    -   Vista para conductores con su vehículo asignado.

4.  **Control de Operaciones (/control)**:
    -   Supervisión de combustible (Cargas de gasolina/diesel).
    -   Auditoría de inventario.

5.  **Gerencia (/gerencia)**:
    -   Dashboard ejecutivo con métricas de flota y operaciones.

6.  **Administración (/admin)**:
    -   Gestión de usuarios y permisos (Roles: Admin, Supervisor, Taller, Transporte).
    -   Gestión de equipos de trabajo.
    -   Base de datos y auditoría del sistema.

ROLES DE USUARIO:
-   **Admin**: Acceso total.
-   **Supervisor**: Acceso a control y auditoría.
-   **Taller**: Acceso a vehículos y mantenimientos.
-   **Transporte**: Acceso a reportes de vehículos.
`

export const DB_SCHEMA = `
TABLAS PRINCIPALES (SUPABASE - POSTGRESQL):

1.  **profiles** (Usuarios del sistema):
    -   id (uuid), email, first_name, last_name, roles (array), department, job_title, team_id.

2.  **vehiculos** (Flota de vehículos):
    -   id, codigo (ej: V-01), placa, modelo, tipo_combustible, kilometraje.
    -   last_oil_change_km (último km cambio aceite).

3.  **reportes** (Salidas/Entradas de vehículos):
    -   id, vehiculo_id, conductor, km_salida, km_entrada, fecha_salida, fecha_entrada.

4.  **fallas** (Fallas mecánicas):
    -   id, vehiculo_id, descripcion, tipo_falla, prioridad, estado.

5.  **maintenance_logs** (Mantenimientos):
    -   id, vehicle_id, service_type, mileage, service_date, notes, cost.

6.  **fuel_logs** (Cargas de Combustible):
    -   id, vehicle_id, liters, mileage, fuel_date, driver_name, ticket_number.

7.  **inventory_products** (Catálogo de Productos):
    -   id, sku (código único), name, current_stock, category.

8.  **inventory_assignments** (Asignaciones de material):
    -   id, assigned_to, team_id, status (ACTIVE, RETURNED), created_at.

9.  **teams** (Equipos de trabajo):
    -   id, name. Relacionado con profiles via team_id.

NOTAS TÉCNICAS:
-   Usa "snake_case" para nombres de columnas.
-   Las fechas suelen estar en ISO (timestamptz) o YYYY-MM-DD.
-   Para consultas de usuario actual, usa 'auth.uid()'.
`
