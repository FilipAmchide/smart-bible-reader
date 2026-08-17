import { IsString } from "class-validator";

export class UnregisterDeviceDto {
  @IsString()
  endpoint!: string;
}
