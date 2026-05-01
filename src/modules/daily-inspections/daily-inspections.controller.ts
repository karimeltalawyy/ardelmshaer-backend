import { Controller, Get, Post, Body, Param, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { DailyInspectionsService } from './daily-inspections.service';
import { SubmitDailyInspectionDto } from './dto/submit-daily-inspection.dto';

@ApiTags('Daily Inspections')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class DailyInspectionsController {
  constructor(private readonly service: DailyInspectionsService) {}

  // ─── Driver endpoints ────────────────────────────────────────────────────────

  @Get('drivers/me/daily-inspection/today')
  @Roles('driver')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: "Get today's inspection status for the current driver" })
  getToday(@CurrentUser() user: any) {
    return this.service.getToday(user.id);
  }

  @Post('drivers/me/daily-inspection')
  @Roles('driver')
  @UseGuards(RolesGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Submit daily vehicle inspection (once per calendar day)' })
  submit(@CurrentUser() user: any, @Body() dto: SubmitDailyInspectionDto) {
    return this.service.submit(user.id, dto);
  }

  @Get('drivers/me/daily-inspection/history')
  @Roles('driver')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: "Get current driver's inspection history" })
  getHistory(@CurrentUser() user: any) {
    return this.service.getHistory(user.id);
  }

  // ─── Admin endpoints ─────────────────────────────────────────────────────────

  @Get('admin/daily-inspections')
  @Roles('admin')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'List daily inspections by date (admin)' })
  @ApiQuery({ name: 'date', required: false, description: 'YYYY-MM-DD (defaults to today)' })
  findByDate(@Query('date') date?: string) {
    const target = date ?? new Date().toISOString().slice(0, 10);
    return this.service.findByDate(target);
  }

  @Get('admin/daily-inspections/drivers/today-status')
  @Roles('admin')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'All drivers with today inspection status (admin)' })
  getDriversTodayStatus() {
    return this.service.getDriversTodayStatus();
  }

  @Get('admin/daily-inspections/driver/:driverId/history')
  @Roles('admin')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: "Get a specific driver's full inspection history (admin)" })
  getDriverInspectionHistory(@Param('driverId') driverId: string) {
    return this.service.getDriverInspectionHistory(driverId);
  }
}
