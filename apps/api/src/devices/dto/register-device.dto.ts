import { Type } from "class-transformer";
import { IsString, ValidateNested } from "class-validator";

class PushKeysDto {
  @IsString()
  p256dh!: string;

  @IsString()
  auth!: string;
}

/** Reflète PushSubscription.toJSON() côté navigateur. */
export class RegisterDeviceDto {
  @IsString()
  endpoint!: string;

  @ValidateNested()
  @Type(() => PushKeysDto)
  keys!: PushKeysDto;
}
