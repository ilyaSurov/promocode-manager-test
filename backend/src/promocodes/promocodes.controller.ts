import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { CreatePromocodeDto } from './dto/create-promocode.dto';
import { UpdatePromocodeDto } from './dto/update-promocode.dto';
import { PromocodesService } from './promocodes.service';

class PromocodeListQueryDto {
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
  pageSize = 20;
}

@Controller('promocodes')
export class PromocodesController {
  constructor(private readonly promocodes: PromocodesService) {}

  @Post()
  create(@Body() dto: CreatePromocodeDto) {
    return this.promocodes.create(dto);
  }

  @Get()
  findAll(@Query() q: PromocodeListQueryDto) {
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 20;
    return this.promocodes.findAll((page - 1) * pageSize, pageSize);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.promocodes.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePromocodeDto) {
    return this.promocodes.update(id, dto);
  }

  @Patch(':id/deactivate')
  deactivate(@Param('id') id: string) {
    return this.promocodes.deactivate(id);
  }
}
