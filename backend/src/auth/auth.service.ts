import {
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { parseShortTtlToSeconds } from '../common/utils/ttl';
import { RedisService } from '../redis/redis.service';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly redis: RedisService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const user = await this.users.create({
      email: dto.email,
      password: dto.password,
      name: dto.name,
      phone: dto.phone,
    });
    return this.issueTokens(user._id.toString(), user.email);
  }

  async login(dto: LoginDto, clientIp: string) {
    await this.assertLoginRateLimit(clientIp);
    const user = await this.users.findByEmailWithPassword(dto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }
    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return this.issueTokens(user._id.toString(), user.email);
  }

  async refresh(dto: RefreshDto) {
    const key = `rt:${dto.refreshToken}`;
    const userId = await this.redis.getClient().get(key);
    if (!userId) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    await this.redis.getClient().del(key);
    const user = await this.users.findByIdOrFail(userId);
    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }
    return this.issueTokens(userId, user.email);
  }

  async logout(dto: RefreshDto): Promise<void> {
    await this.redis.getClient().del(`rt:${dto.refreshToken}`);
  }

  private async issueTokens(userId: string, email: string) {
    const accessToken = await this.jwt.signAsync({ sub: userId, email });
    const refreshToken = randomBytes(48).toString('hex');
    const refreshTtl = this.config.get<string>('JWT_REFRESH_EXPIRES', '7d');
    const ttlSec = parseShortTtlToSeconds(refreshTtl, 7 * 24 * 3600);
    await this.redis
      .getClient()
      .setex(`rt:${refreshToken}`, ttlSec, userId);
    return { accessToken, refreshToken, expiresIn: refreshTtl };
  }

  private async assertLoginRateLimit(clientIp: string): Promise<void> {
    const key = `rl:login:${clientIp}`;
    const n = await this.redis.getClient().incr(key);
    if (n === 1) {
      await this.redis.getClient().expire(key, 60);
    }
    if (n > 40) {
      this.logger.warn(`Login rate limit exceeded for ${clientIp}`);
      throw new HttpException('Too many login attempts', HttpStatus.TOO_MANY_REQUESTS);
    }
  }
}
