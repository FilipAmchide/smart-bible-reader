import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { AuthService } from "./auth.service";
import { RegisterDto } from "./dto/register.dto";
import { RequestOtpDto } from "./dto/request-otp.dto";
import { VerifyOtpDto } from "./dto/verify-otp.dto";
import { LoginDto } from "./dto/login.dto";
import { Verify2faDto } from "./dto/verify-2fa.dto";
import { Confirm2faSetupDto } from "./dto/confirm-2fa-setup.dto";
import { Disable2faDto } from "./dto/disable-2fa.dto";
import { RefreshTokenDto } from "./dto/refresh-token.dto";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import type { JwtPayload } from "./types/jwt-payload.type";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("register")
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  // Limité à 3 demandes / minute par IP : un OTP coûte un SMS et se prête aux abus.
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @Post("otp/request")
  requestOtp(@Body() dto: RequestOtpDto) {
    return this.authService.requestOtp(dto);
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post("otp/verify")
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyOtp(dto);
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post("login")
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post("2fa/verify")
  verify2fa(@Body() dto: Verify2faDto) {
    return this.authService.verify2fa(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post("2fa/setup")
  setup2fa(@CurrentUser() user: JwtPayload) {
    return this.authService.setup2fa(user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Post("2fa/confirm")
  confirm2faSetup(@CurrentUser() user: JwtPayload, @Body() dto: Confirm2faSetupDto) {
    return this.authService.confirm2faSetup(user.sub, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post("2fa/disable")
  disable2fa(@CurrentUser() user: JwtPayload, @Body() dto: Disable2faDto) {
    return this.authService.disable2fa(user.sub, dto);
  }

  @Post("refresh")
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto.refreshToken);
  }
}
