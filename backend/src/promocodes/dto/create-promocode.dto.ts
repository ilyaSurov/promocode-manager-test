import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreatePromocodeDto {
  @IsString()
  @MinLength(2)
  @MaxLength(64)
  code!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  discountPercent!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxUsesTotal!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxUsesPerUser!: number;

  @IsOptional()
  @IsDateString()
  validFrom?: string;

  @IsOptional()
  @IsDateString()
  validTo?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
