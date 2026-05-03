import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class AnalyticsTableQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 10;

  @IsISO8601()
  dateFrom!: string;

  @IsISO8601()
  dateTo!: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  sortBy?: string;

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder: 'asc' | 'desc' = 'desc';

  @IsOptional()
  @IsString()
  @MaxLength(200)
  filterEmail?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  filterCode?: string;

  @IsOptional()
  @Type(() => Number)
  @IsIn([0, 1])
  filterActive?: number;
}
