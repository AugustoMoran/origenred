export const PERMISSIONS = {
  INVENTORY_VIEW: 'inventory:view',
  INVENTORY_EDIT: 'inventory:edit',
  SALES_VIEW: 'sales:view',
  SALES_EDIT: 'sales:edit',
  CLIENTS_VIEW: 'clients:view',
  CLIENTS_EDIT: 'clients:edit',
  REPORTS_VIEW: 'reports:view',
  USERS_MANAGE: 'users:manage',
} as const;

export const PERMISSION_LABELS: Record<string, string> = {
  'inventory:view': 'Ver Inventario',
  'inventory:edit': 'Modificar Inventario',
  'sales:view': 'Ver Ventas',
  'sales:edit': 'Crear/Editar Ventas',
  'clients:view': 'Ver Clientes',
  'clients:edit': 'Gestionar Clientes',
  'reports:view': 'Ver Reportes',
  'users:manage': 'Gestionar Usuarios',
};
