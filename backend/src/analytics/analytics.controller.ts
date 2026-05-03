import { Controller, Get, Query } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { AnalyticsTableQueryDto } from './dto/analytics-table.query.dto';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get('users')
  users(@Query() q: AnalyticsTableQueryDto) {
    return this.analytics.usersTable(q);
  }

  @Get('promocodes')
  promocodes(@Query() q: AnalyticsTableQueryDto) {
    return this.analytics.promocodesTable(q);
  }

  @Get('promo-usages')
  promoUsages(@Query() q: AnalyticsTableQueryDto) {
    return this.analytics.promoUsagesTable(q);
  }
}
