import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Role } from '../../domain/models/role.enum.js';
import { ROLES_KEY } from '../decorators/roles.decorator.js';
import { InsufficientPermissionsException } from '../../domain/exceptions/insufficient-permissions.exception.js';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    if (!user?.role) {
      throw new InsufficientPermissionsException();
    }

    const hasRole = requiredRoles.includes(user.role as Role);
    if (!hasRole) {
      throw new InsufficientPermissionsException(
        `Se requiere uno de los roles: ${requiredRoles.join(', ')}`,
      );
    }

    return true;
  }
}
