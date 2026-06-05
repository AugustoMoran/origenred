export const PERMISSIONS = {
  INVENTORY_VIEW: 'inventory:view',
  INVENTORY_EDIT: 'inventory:edit',
  SALES_VIEW: 'sales:view',
  SALES_EDIT: 'sales:edit',
  CLIENTS_VIEW: 'clients:view',
  CLIENTS_EDIT: 'clients:edit',
  REPORTS_VIEW: 'reports:view',
  USERS_MANAGE: 'users:manage', // Solo admin generalmente
} as const;

export type PermissionType = typeof PERMISSIONS[keyof typeof PERMISSIONS];
