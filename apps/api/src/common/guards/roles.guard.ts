import { Injectable, type CanActivate, type ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Role } from "@sbr/shared-types";
import { ROLES_KEY } from "../decorators/roles.decorator";
import type { JwtPayload } from "../../auth/types/jwt-payload.type";

/** Utilisé aux côtés de JwtAuthGuard : suppose que request.user est déjà posé. */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const request = context.switchToHttp().getRequest();
    const user: JwtPayload | undefined = request.user;
    return !!user && requiredRoles.includes(user.role);
  }
}
