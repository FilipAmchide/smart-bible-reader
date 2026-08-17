import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Device, type DeviceDocument } from "./schemas/device.schema";
import type { RegisterDeviceDto } from "./dto/register-device.dto";

@Injectable()
export class DevicesService {
  constructor(@InjectModel(Device.name) private readonly deviceModel: Model<DeviceDocument>) {}

  async register(userId: string, dto: RegisterDeviceDto): Promise<void> {
    await this.deviceModel.updateOne(
      { userId, endpoint: dto.endpoint },
      { $set: { p256dh: dto.keys.p256dh, auth: dto.keys.auth } },
      { upsert: true },
    );
  }

  async unregister(userId: string, endpoint: string): Promise<void> {
    await this.deviceModel.deleteOne({ userId, endpoint });
  }

  findByUser(userId: string): Promise<DeviceDocument[]> {
    return this.deviceModel.find({ userId });
  }

  /** Retire un abonnement mort (410 Gone renvoyé par le service de push). */
  removeById(deviceId: string): Promise<unknown> {
    return this.deviceModel.deleteOne({ _id: deviceId });
  }
}
