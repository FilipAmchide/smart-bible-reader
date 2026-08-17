import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import type { UserProfile } from "@sbr/shared-types";
import { BibleVersionService } from "../bible/bible-version.service";
import { User, type UserDocument } from "./schemas/user.schema";
import { toUserProfile } from "./user.mapper";
import type { UpdateProfileDto } from "./dto/update-profile.dto";

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly bibleVersionService: BibleVersionService,
  ) {}

  async getProfile(userId: string): Promise<UserProfile> {
    const user = await this.userModel.findById(userId);
    if (!user) throw new NotFoundException("Compte introuvable.");
    return toUserProfile(user);
  }

  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<UserProfile> {
    const user = await this.userModel.findById(userId);
    if (!user) throw new NotFoundException("Compte introuvable.");

    if (dto.fullName !== undefined) user.fullName = dto.fullName;
    if (dto.language !== undefined) user.language = dto.language;
    if (dto.timezone !== undefined) user.timezone = dto.timezone;
    if (dto.preferredVersionCode !== undefined) {
      const version = await this.bibleVersionService.findByCode(dto.preferredVersionCode);
      if (!version) throw new BadRequestException("Version biblique inconnue.");
      user.preferredVersionCode = dto.preferredVersionCode;
    }

    await user.save();
    return toUserProfile(user);
  }
}
