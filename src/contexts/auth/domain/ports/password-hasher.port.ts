export interface PasswordHasherPort {
  hash(plain: string): Promise<string>;
  compare(plain: string, hash: string): Promise<boolean>;
}

export const PASSWORD_HASHER_PORT = Symbol('PASSWORD_HASHER_PORT');
