import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
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
import { Throttle } from '@nestjs/throttler';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { CreateGuestBookingDto } from './dto/create-guest-booking.dto';
import { CancelBookingDto } from './dto/cancel-booking.dto';
import { UpdateBookingPassengersDto } from './dto/update-booking-passengers.dto';
import { AssignTripDto } from './dto/assign-trip.dto';
import { FulfillRequestDto } from './dto/fulfill-request.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Bookings')
@UseGuards(JwtAuthGuard)
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post('guest')
  @Public()
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @ApiOperation({ summary: '[Public] Create a guest booking without authentication' })
  // NO @ApiBearerAuth here — this endpoint is public
  async createGuest(@Body() dto: CreateGuestBookingDto) {
    return this.bookingsService.createGuest(dto);
  }

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a booking (seat selection + passenger details)' })
  create(@CurrentUser() user: any, @Body() dto: CreateBookingDto) {
    return this.bookingsService.create(user.id, dto);
  }

  @Get('my')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my booking history' })
  findMyBookings(@CurrentUser() user: any) {
    return this.bookingsService.findMyBookings(user.id);
  }

  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a booking by ID' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    return this.bookingsService.findOne(id, user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel a booking (applies cancellation policy for refund)' })
  cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
    @Body() dto: CancelBookingDto,
  ) {
    return this.bookingsService.cancel(id, user.id, dto);
  }

  @Patch(':id/no-show')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mark booking as no-show (driver of trip or admin)' })
  markNoShow(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    return this.bookingsService.markNoShow(id, user.id);
  }

  @Patch(':id/passengers')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update booking passenger manifest (assigned driver or admin)' })
  updatePassengers(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
    @Body() dto: UpdateBookingPassengersDto,
  ) {
    return this.bookingsService.updatePassengers(id, user.id, dto);
  }

  // ─── Admin ────────────────────────────────────────────────────────────────────

  @Post(':id/fulfill-request')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: '[Admin] Create a trip for a demand booking request and confirm it' })
  fulfillRequest(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
    @Body() dto: FulfillRequestDto,
  ) {
    return this.bookingsService.fulfillRequest(id, dto, user.id);
  }

  @Patch(':id/assign-trip')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: '[Admin] Assign a scheduled trip to a demand booking request' })
  assignTrip(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignTripDto,
  ) {
    return this.bookingsService.assignTrip(id, dto.tripId);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: '[Admin] List all bookings' })
  @ApiQuery({ name: 'status', required: false, enum: ['pending', 'confirmed', 'no_show', 'cancelled'] })
  @ApiQuery({ name: 'tripId', required: false })
  findAll(
    @Query('status') status?: string,
    @Query('tripId') tripId?: string,
  ) {
    return this.bookingsService.findAll(status, tripId);
  }
}
