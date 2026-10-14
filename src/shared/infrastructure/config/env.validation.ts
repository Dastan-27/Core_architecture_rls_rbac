interface ValidationRule {
  readonly check: (config: Record<string, unknown>) => boolean;
  readonly message: string;
}

const rules: readonly ValidationRule[] = [
  {
    check: (config) =>
      Boolean(config.DATABASE_URL) ||
      Boolean(config.DB_HOST && config.DB_USERNAME && config.DB_DATABASE),
    message:
      'Base de datos no configurada: proporciona DATABASE_URL o (DB_HOST + DB_USERNAME + DB_DATABASE)',
  },
  {
    check: (config) =>
      Boolean(config.DATABASE_URL) || Boolean(config.DB_PASSWORD),
    message:
      'DB_PASSWORD es obligatorio cuando se usan variables individuales de conexion',
  },
];

export function validateEnvironment(
  config: Record<string, unknown>,
): Record<string, unknown> {
  const errors = rules
    .filter((rule) => !rule.check(config))
    .map((rule) => rule.message);

  if (errors.length > 0) {
    throw new Error(
      `\nValidación de entorno fallida:\n  - ${errors.join('\n  - ')}\n`,
    );
  }

  return config;
}
