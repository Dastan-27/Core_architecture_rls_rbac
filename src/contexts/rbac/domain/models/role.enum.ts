export const ROLES = [
  'OWNER',
  'ADMIN',
  'ACCOUNTANT',
  'WAREHOUSE_MANAGER',
  'CASHIER',
] as const;

export type Role = (typeof ROLES)[number];
