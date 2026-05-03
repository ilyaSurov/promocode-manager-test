import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AnalyticsService } from '../analytics/analytics.service';
import { MongoChSyncService } from '../sync/mongo-ch-sync.service';
import { CreatePromocodeDto } from './dto/create-promocode.dto';
import { UpdatePromocodeDto } from './dto/update-promocode.dto';
import { Promocode, PromocodeDocument } from './promocode.schema';

@Injectable()
export class PromocodesService {
  constructor(
    @InjectModel(Promocode.name)
    private readonly promocodeModel: Model<PromocodeDocument>,
    private readonly sync: MongoChSyncService,
    private readonly analytics: AnalyticsService,
  ) {}

  async create(dto: CreatePromocodeDto): Promise<PromocodeDocument> {
    const code = dto.code.trim().toUpperCase();
    const exists = await this.promocodeModel.exists({ code }).exec();
    if (exists) {
      throw new ConflictException('Promocode code already exists');
    }
    const doc = await this.promocodeModel.create({
      code,
      discountPercent: dto.discountPercent,
      maxUsesTotal: dto.maxUsesTotal,
      maxUsesPerUser: dto.maxUsesPerUser,
      validFrom: dto.validFrom ? new Date(dto.validFrom) : null,
      validTo: dto.validTo ? new Date(dto.validTo) : null,
      isActive: dto.isActive ?? true,
    });
    void this.sync.syncPromocode(doc);
    void this.analytics.clearCache();
    return doc;
  }

  async findAll(skip: number, limit: number): Promise<PromocodeDocument[]> {
    return this.promocodeModel
      .find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();
  }

  async findOne(id: string): Promise<PromocodeDocument> {
    const doc = await this.promocodeModel.findById(id).exec();
    if (!doc) {
      throw new NotFoundException('Promocode not found');
    }
    return doc;
  }

  async findByCode(code: string): Promise<PromocodeDocument | null> {
    return this.promocodeModel
      .findOne({ code: code.trim().toUpperCase() })
      .exec();
  }

  async update(
    id: string,
    dto: UpdatePromocodeDto,
  ): Promise<PromocodeDocument> {
    const doc = await this.findOne(id);
    if (dto.code !== undefined) {
      const code = dto.code.trim().toUpperCase();
      const other = await this.promocodeModel
        .findOne({ code, _id: { $ne: doc._id } })
        .exec();
      if (other) {
        throw new ConflictException('Promocode code already exists');
      }
      doc.code = code;
    }
    if (dto.discountPercent !== undefined) {
      doc.discountPercent = dto.discountPercent;
    }
    if (dto.maxUsesTotal !== undefined) {
      doc.maxUsesTotal = dto.maxUsesTotal;
    }
    if (dto.maxUsesPerUser !== undefined) {
      doc.maxUsesPerUser = dto.maxUsesPerUser;
    }
    if (dto.validFrom !== undefined) {
      doc.validFrom = dto.validFrom ? new Date(dto.validFrom) : null;
    }
    if (dto.validTo !== undefined) {
      doc.validTo = dto.validTo ? new Date(dto.validTo) : null;
    }
    if (dto.isActive !== undefined) {
      doc.isActive = dto.isActive;
    }
    await doc.save();
    void this.sync.syncPromocode(doc);
    void this.analytics.clearCache();
    return doc;
  }

  async deactivate(id: string): Promise<PromocodeDocument> {
    return this.update(id, { isActive: false });
  }
}
