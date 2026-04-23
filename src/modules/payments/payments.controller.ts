import {
  Controller,
  Get,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { CollectPaymentDto } from './dto/collect-payment.dto';
import { OverridePaymentDto } from './dto/override-payment.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Payments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  // ─── Rider ────────────────────────────────────────────────────────────────────

  @Get('my')
  @ApiOperation({ summary: 'Get my payment history (rider)' })
  findMyPayments(@CurrentUser() user: any) {
    return this.paymentsService.findMyPayments(user.id);
  }

  @Get('bookings/:bookingId')
  @ApiOperation({ summary: 'Get payment details for a booking (rider/driver/admin)' })
  findOne(
    @Param('bookingId', ParseUUIDPipe) bookingId: string,
    @CurrentUser() user: any,
  ) {
    return this.paymentsService.findOne(bookingId, user.id);
  }

  // ─── Driver ───────────────────────────────────────────────────────────────────

  @Patch('bookings/:bookingId/collect')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirm cash collected from rider (driver only)' })
  collectCash(
    @Param('bookingId', ParseUUIDPipe) bookingId: string,
    @CurrentUser() user: any,
    @Body() dto: CollectPaymentDto,
  ) {
    return this.paymentsService.collectCash(bookingId, user.id, dto);
  }

  @Get('driver/summary')
  @ApiOperation({ summary: 'Get my earnings summary and payment list (driver)' })
  findDriverPayments(@CurrentUser() user: any) {
    return this.paymentsService.findDriverPayments(user.id);
  }

  // ─── Admin ────────────────────────────────────────────────────────────────────

  @Get()
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: '[Admin] List all payments with filters' })
  @ApiQuery({ name: 'paymentStatus', required: false, enum: ['pending', 'paid', 'refunded'] })
  @ApiQuery({ name: 'paymentMethod', required: false, enum: ['cash', 'card', 'mada'] })
  @ApiQuery({ name: 'dateFrom', required: false, type: String, example: '2026-01-01' })
  @ApiQuery({ name: 'dateTo', required: false, type: String, example: '2026-12-31' })
  findAll(
    @Query('paymentStatus') paymentStatus?: string,
    @Query('paymentMethod') paymentMethod?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.paymentsService.findAll({ paymentStatus, paymentMethod, dateFrom, dateTo });
  }

  @Get('summary')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: '[Admin] Financial summary — revenue, fees, payouts' })
  getSummary() {
    return this.paymentsService.getSummary();
  }

  @Patch('bookings/:bookingId/status')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: '[Admin] Override payment status' })
  overrideStatus(
    @Param('bookingId', ParseUUIDPipe) bookingId: string,
    @Body() dto: OverridePaymentDto,
  ) {
    return this.paymentsService.overrideStatus(bookingId, dto);
  }
}
