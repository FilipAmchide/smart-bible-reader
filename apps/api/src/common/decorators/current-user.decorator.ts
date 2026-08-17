import { createParamDecorator, type ExecutionContext } from "@nestjs/common";
import type { JwtPayload } from "../../auth/types/jwt-payload.type";

/** Injecte l'utilisateur authentifié (issu du JwtStrategy) dans un handler. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtPayload => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
