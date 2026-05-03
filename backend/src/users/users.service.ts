import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import { Model } from 'mongoose';
import { AnalyticsService } from '../analytics/analytics.service';
import { MongoChSyncService } from '../sync/mongo-ch-sync.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User, UserDocument } from './user.schema';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly sync: MongoChSyncService,
    private readonly analytics: AnalyticsService,
  ) {}

  async create(dto: CreateUserDto): Promise<UserDocument> {
    const email = dto.email.toLowerCase().trim();
    const exists = await this.userModel.exists({ email }).exec();
    if (exists) {
      throw new ConflictException('Email already registered');
    }
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.userModel.create({
      email,
      name: dto.name.trim(),
      phone: dto.phone.trim(),
      passwordHash,
      isActive: true,
    });
    void this.sync.syncUser(user);
    void this.analytics.clearCache();
    return user;
  }

  async findByEmailWithPassword(
    email: string,
  ): Promise<UserDocument | null> {
    return this.userModel
      .findOne({ email: email.toLowerCase().trim() })
      .select('+passwordHash')
      .exec();
  }

  async findByIdOrFail(id: string): Promise<UserDocument> {
    const user = await this.userModel.findById(id).exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async findAll(skip: number, limit: number): Promise<UserDocument[]> {
    return this.userModel
      .find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(false)
      .exec();
  }

  async findOne(id: string): Promise<UserDocument> {
    const user = await this.userModel.findById(id).exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async update(id: string, dto: UpdateUserDto): Promise<UserDocument> {
    const user = await this.findOne(id);
    if (dto.email && dto.email.toLowerCase() !== user.email) {
      const exists = await this.userModel
        .exists({ email: dto.email.toLowerCase() })
        .exec();
      if (exists) {
        throw new ConflictException('Email already in use');
      }
      user.email = dto.email.toLowerCase().trim();
    }
    if (dto.name !== undefined) {
      user.name = dto.name.trim();
    }
    if (dto.phone !== undefined) {
      user.phone = dto.phone.trim();
    }
    if (dto.password !== undefined) {
      user.passwordHash = await bcrypt.hash(dto.password, 10);
    }
    if (dto.isActive !== undefined) {
      user.isActive = dto.isActive;
    }
    await user.save();
    void this.sync.syncUser(user);
    void this.analytics.clearCache();
    return user;
  }

  async deactivate(id: string): Promise<UserDocument> {
    return this.update(id, { isActive: false });
  }
}
