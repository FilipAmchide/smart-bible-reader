import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { MongooseModule } from "@nestjs/mongoose";
import { PassportModule } from "@nestjs/passport";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { OtpService } from "./otp.service";
import { TotpService } from "./totp.service";
import { JwtStrategy } from "./strategies/jwt.strategy";
import { OtpCode, OtpCodeSchema } from "./schemas/otp-code.schema";
import { User, UserSchema } from "../users/schemas/user.schema";
import { NotificationSenderService } from "../common/messaging/notification-sender.service";

@Module({
  imports: [
    PassportModule,
    JwtModule.register({}), // secrets/TTL passés explicitement à chaque sign()/verify()
    MongooseModule.forFeature([
      { name: OtpCode.name, schema: OtpCodeSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [AuthController],
  providers: [AuthService, OtpService, TotpService, JwtStrategy, NotificationSenderService],
  exports: [JwtStrategy, PassportModule],
})
export class AuthModule {}
