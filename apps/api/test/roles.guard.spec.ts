import { Reflector } from "@nestjs/core";
import type { ExecutionContext } from "@nestjs/common";
import { RolesGuard } from "../src/common/guards/roles.guard";
import { ROLES_KEY } from "../src/common/decorators/roles.decorator";
import type { Role } from "@sbr/shared-types";

function contextWithUser(user: { role: Role } | undefined, requiredRoles: Role[] | undefined) {
  const reflector = {
    getAllAndOverride: () => requiredRoles,
  } as unknown as Reflector;

  const context = {
    getHandler: () => undefined,
    getClass: () => undefined,
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;

  return { guard: new RolesGuard(reflector), context };
}

describe("RolesGuard", () => {
  it("laisse passer une route sans @Roles()", () => {
    const { guard, context } = contextWithUser({ role: "user" }, undefined);
    expect(guard.canActivate(context)).toBe(true);
  });

  it("autorise un admin sur une route @Roles(\"admin\")", () => {
    const { guard, context } = contextWithUser({ role: "admin" }, ["admin"]);
    expect(guard.canActivate(context)).toBe(true);
  });

  it("rejette un utilisateur non-admin sur une route @Roles(\"admin\")", () => {
    const { guard, context } = contextWithUser({ role: "user" }, ["admin"]);
    expect(guard.canActivate(context)).toBe(false);
  });

  it("rejette une requête sans utilisateur authentifié", () => {
    const { guard, context } = contextWithUser(undefined, ["admin"]);
    expect(guard.canActivate(context)).toBe(false);
  });

  it("ROLES_KEY reste la clé de métadonnées attendue par @Roles()", () => {
    expect(ROLES_KEY).toBe("roles");
  });
});
