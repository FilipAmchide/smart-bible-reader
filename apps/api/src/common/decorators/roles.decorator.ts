import { SetMetadata } from "@nestjs/common";
import type { Role } from "@sbr/shared-types";

export const ROLES_KEY = "roles";

/** Restreint un handler aux rôles listés (vérifié par RolesGuard). */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
