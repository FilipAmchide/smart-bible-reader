import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectModel } from "@nestjs/mongoose";
import { JwtService } from "@nestjs/jwt";
import * as argon2 from "argon2";
import { Model, type FilterQuery } from "mongoose";
import {
  DEFAULT_NOTIFICATION_SETTINGS,
  detectIdentifierKind,
  type OtpPurpose,
  type UserProfile,
} from "@sbr/shared-types";
import type { AppConfig } from "../config/configuration";
import { SecretBox } from "../common/utils/crypto.util";
import { NotificationSenderService } from "../common/messaging/notification-sender.service";
import { User, type UserDocument } from "../users/schemas/user.schema";
import { toUserProfile } from "../users/user.mapper";
import { OtpService } from "./otp.service";
import { TotpService } from "./totp.service";
import type { RegisterDto } from "./dto/register.dto";
import type { RequestOtpDto } from "./dto/request-otp.dto";
import type { VerifyOtpDto } from "./dto/verify-otp.dto";
import type { LoginDto } from "./dto/login.dto";
import type { Verify2faDto } from "./dto/verify-2fa.dto";
import type { Confirm2faSetupDto } from "./dto/confirm-2fa-setup.dto";
import type { Disable2faDto } from "./dto/disable-2fa.dto";
import type {
  JwtPayload,
  Pre2faPayload,
  Setup2faPayload,
  TokenPair,
} from "./types/jwt-payload.type";
import type { TotpSetup } from "./totp.service";

interface OtpVerifyResult {
  requires2FA: boolean;
  preAuthToken?: string;
  tokens?: TokenPair;
  user?: UserProfile;
}

@Injectable()
export class AuthService {
  private readonly config: AppConfig;
  private readonly secretBox: SecretBox;

  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly otpService: OtpService,
    private readonly totpService: TotpService,
    private readonly jwtService: JwtService,
    private readonly notificationSender: NotificationSenderService,
    configService: ConfigService,
  ) {
    this.config = configService.get<AppConfig>("app")!;
    this.secretBox = new SecretBox(this.config.secretsEncryptionKey);
  }

  // ---------------------------------------------------------------------
  // Inscription
  // ---------------------------------------------------------------------

  async register(dto: RegisterDto): Promise<{ user: UserProfile; otpSent: boolean }> {
    if (!dto.email && !dto.phone) {
      throw new BadRequestException("Un email ou un numéro de téléphone est requis.");
    }

    const identifierFilters: FilterQuery<UserDocument>[] = [];
    if (dto.email) identifierFilters.push({ email: dto.email });
    if (dto.phone) identifierFilters.push({ phone: dto.phone });

    const existing = await this.userModel.findOne({ $or: identifierFilters });
    if (existing) {
      throw new ConflictException("Cet email ou ce téléphone est déjà utilisé.");
    }

    const user = await this.userModel.create({
      fullName: dto.fullName,
      email: dto.email,
      phone: dto.phone,
      passwordHash: dto.password ? await argon2.hash(dto.password) : undefined,
      role: "user",
      language: "fr",
      timezone: "UTC",
      notificationSettings: DEFAULT_NOTIFICATION_SETTINGS,
    });

    // On vérifie immédiatement l'identifiant fourni (email ou téléphone)
    // par le même mécanisme OTP que la connexion.
    const identifier = dto.email ?? dto.phone!;
    await this.sendOtp(user, identifier, "verify_identifier");

    return { user: toUserProfile(user), otpSent: true };
  }

  // ---------------------------------------------------------------------
  // Connexion par OTP
  // ---------------------------------------------------------------------

  async requestOtp(dto: RequestOtpDto): Promise<{ sent: true; expiresInSeconds: number }> {
    const purpose: OtpPurpose = dto.purpose ?? "login";
    const user = await this.findByIdentifier(dto.identifier);
    if (!user) {
      throw new NotFoundException("Aucun compte ne correspond à cet identifiant.");
    }
    await this.sendOtp(user, dto.identifier, purpose);
    return { sent: true, expiresInSeconds: this.config.otp.ttlSeconds };
  }

  async verifyOtp(dto: VerifyOtpDto): Promise<OtpVerifyResult> {
    const purpose: OtpPurpose = dto.purpose ?? "login";
    const userId = await this.otpService.verify(dto.identifier, purpose, dto.code);
    const user = await this.userModel.findById(userId);
    if (!user) throw new NotFoundException("Compte introuvable.");

    if (purpose === "verify_identifier") {
      const kind = detectIdentifierKind(dto.identifier);
      if (kind === "email") user.emailVerifiedAt = new Date();
      else user.phoneVerifiedAt = new Date();
      await user.save();
    }

    return this.completeFirstFactor(user);
  }

  // ---------------------------------------------------------------------
  // Connexion classique (mot de passe) + 2FA
  // ---------------------------------------------------------------------

  async login(dto: LoginDto): Promise<OtpVerifyResult> {
    const user = await this.findByIdentifier(dto.identifier);
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException("Identifiant ou mot de passe incorrect.");
    }
    const valid = await argon2.verify(user.passwordHash, dto.password);
    if (!valid) {
      throw new UnauthorizedException("Identifiant ou mot de passe incorrect.");
    }
    return this.completeFirstFactor(user);
  }

  private async completeFirstFactor(user: UserDocument): Promise<OtpVerifyResult> {
    if (!user.twoFAEnabled) {
      return { requires2FA: false, tokens: this.issueTokens(user), user: toUserProfile(user) };
    }
    const preAuthToken = this.jwtService.sign(
      { sub: user.id, purpose: "pre-2fa" } satisfies Pre2faPayload,
      { secret: this.config.jwt.pre2faSecret, expiresIn: this.config.jwt.pre2faTtl },
    );
    return { requires2FA: true, preAuthToken };
  }

  async verify2fa(dto: Verify2faDto): Promise<{ tokens: TokenPair; user: UserProfile }> {
    const payload = this.verifyToken<Pre2faPayload>(dto.preAuthToken, this.config.jwt.pre2faSecret);
    if (payload.purpose !== "pre-2fa") throw new UnauthorizedException("Jeton invalide.");

    const user = await this.userModel.findById(payload.sub);
    if (!user || !user.twoFAEnabled) throw new UnauthorizedException("Jeton invalide.");

    if (dto.code) {
      const secret = this.secretBox.decrypt(user.twoFASecretEncrypted!);
      if (!this.totpService.verify(dto.code, secret)) {
        throw new UnauthorizedException("Code invalide.");
      }
    } else if (dto.backupCode) {
      const matched = await this.consumeBackupCode(user, dto.backupCode);
      if (!matched) throw new UnauthorizedException("Code de secours invalide.");
    } else {
      throw new BadRequestException("Fournissez un code authenticator ou un code de secours.");
    }

    return { tokens: this.issueTokens(user), user: toUserProfile(user) };
  }

  // ---------------------------------------------------------------------
  // Activation / désactivation du 2FA (utilisateur déjà authentifié)
  // ---------------------------------------------------------------------

  async setup2fa(userId: string): Promise<Omit<TotpSetup, "secret"> & { setupToken: string }> {
    const user = await this.getUserOrThrow(userId);
    const { secret, otpauthUrl, qrCodeDataUrl } = await this.totpService.generateSetup(
      user.email ?? user.phone ?? user.id,
    );
    const setupToken = this.jwtService.sign(
      { sub: user.id, secret, purpose: "2fa-setup" } satisfies Setup2faPayload,
      { secret: this.config.jwt.pre2faSecret, expiresIn: this.config.jwt.pre2faTtl },
    );
    return { otpauthUrl, qrCodeDataUrl, setupToken };
  }

  async confirm2faSetup(
    userId: string,
    dto: Confirm2faSetupDto,
  ): Promise<{ backupCodes: string[] }> {
    const payload = this.verifyToken<Setup2faPayload>(dto.setupToken, this.config.jwt.pre2faSecret);
    if (payload.purpose !== "2fa-setup" || payload.sub !== userId) {
      throw new UnauthorizedException("Jeton de configuration invalide.");
    }
    if (!this.totpService.verify(dto.code, payload.secret)) {
      throw new UnauthorizedException("Code invalide.");
    }

    const user = await this.getUserOrThrow(userId);
    const backupCodes = this.totpService.generateBackupCodes();

    user.twoFAEnabled = true;
    user.twoFASecretEncrypted = this.secretBox.encrypt(payload.secret);
    user.backupCodeHashes = await Promise.all(backupCodes.map((c) => argon2.hash(c)));
    await user.save();

    return { backupCodes }; // affichés une seule fois côté client
  }

  async disable2fa(userId: string, dto: Disable2faDto): Promise<void> {
    const user = await this.getUserOrThrow(userId);
    if (!user.twoFAEnabled) return;

    let authorized = false;
    if (dto.code && user.twoFASecretEncrypted) {
      authorized = this.totpService.verify(dto.code, this.secretBox.decrypt(user.twoFASecretEncrypted));
    } else if (dto.backupCode) {
      authorized = await this.consumeBackupCode(user, dto.backupCode);
    }
    if (!authorized) throw new UnauthorizedException("Code invalide.");

    user.twoFAEnabled = false;
    user.twoFASecretEncrypted = undefined;
    user.backupCodeHashes = [];
    await user.save();
  }

  // ---------------------------------------------------------------------
  // Jetons
  // ---------------------------------------------------------------------

  async refresh(refreshToken: string): Promise<TokenPair> {
    const payload = this.verifyToken<JwtPayload>(refreshToken, this.config.jwt.refreshSecret);
    const user = await this.userModel.findById(payload.sub);
    if (!user) throw new UnauthorizedException("Session invalide.");
    return this.issueTokens(user);
  }

  private issueTokens(user: UserDocument): TokenPair {
    const payload: JwtPayload = { sub: user.id, role: user.role };
    return {
      accessToken: this.jwtService.sign(payload, {
        secret: this.config.jwt.accessSecret,
        expiresIn: this.config.jwt.accessTtl,
      }),
      refreshToken: this.jwtService.sign(payload, {
        secret: this.config.jwt.refreshSecret,
        expiresIn: this.config.jwt.refreshTtl,
      }),
    };
  }

  private verifyToken<T extends object>(token: string, secret: string): T {
    try {
      return this.jwtService.verify<T>(token, { secret });
    } catch {
      throw new UnauthorizedException("Jeton invalide ou expiré.");
    }
  }

  // ---------------------------------------------------------------------
  // Aides
  // ---------------------------------------------------------------------

  private async findByIdentifier(identifier: string): Promise<UserDocument | null> {
    const kind = detectIdentifierKind(identifier);
    return this.userModel.findOne(kind === "email" ? { email: identifier } : { phone: identifier });
  }

  private async getUserOrThrow(userId: string): Promise<UserDocument> {
    const user = await this.userModel.findById(userId);
    if (!user) throw new NotFoundException("Compte introuvable.");
    return user;
  }

  private async sendOtp(user: UserDocument, identifier: string, purpose: OtpPurpose): Promise<void> {
    const code = await this.otpService.generate(user._id, identifier, purpose);
    const message = `Smart Bible Reader — votre code : ${code} (valable ${Math.round(
      this.config.otp.ttlSeconds / 60,
    )} min)`;
    if (detectIdentifierKind(identifier) === "email") {
      await this.notificationSender.sendEmail(identifier, "Votre code de vérification", message);
    } else {
      await this.notificationSender.sendSms(identifier, message);
    }
  }

  private async consumeBackupCode(user: UserDocument, candidate: string): Promise<boolean> {
    for (let i = 0; i < user.backupCodeHashes.length; i++) {
      if (await argon2.verify(user.backupCodeHashes[i], candidate)) {
        user.backupCodeHashes.splice(i, 1);
        await user.save();
        return true;
      }
    }
    return false;
  }
}
