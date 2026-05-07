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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { TripsService } from './trips.service';
import { CreateTripDto } from './dto/create-trip.dto';
import { CreateDriverBookingDto } from './dto/create-driver-booking.dto';
import { CreateAdminDriverBookingDto } from './dto/create-admin-driver-booking.dto';
import { SearchTripsDto } from './dto/search-trips.dto';
import { UpdateTripStatusDto } from './dto/update-trip-status.dto';
import { TripStockQueryDto } from './dto/trip-stock-query.dto';
import { PublishTripStockDto } from './dto/publish-trip-stock.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Trips')
@ApiBearerAuth()
@Controller('trips')
export class TripsController {
  constructor(private readonly tripsService: TripsService) {}

  // ─── Driver / Admin ───────────────────────────────────────────────────────────

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create a new trip (driver or admin)' })
  create(@CurrentUser() user: any, @Body() dto: CreateTripDto) {
    return this.tripsService.create(user.id, dto);
  }

  @Post('driver-booking')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Driver: create trip + booking with passengers in one step' })
  createDriverBooking(@CurrentUser() user: any, @Body() dto: CreateDriverBookingDto) {
    return this.tripsService.createDriverBooking(user.id, dto);
  }

  @Post('admin-driver-booking')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: '[Admin] Create trip + booking manifest and assign it by selected car' })
  createAdminDriverBooking(@CurrentUser() user: any, @Body() dto: CreateAdminDriverBookingDto) {
    return this.tripsService.createAdminDriverBooking(user.id, dto);
  }

  @Get('my')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get my trips (driver)' })
  findMyTrips(@CurrentUser() user: any) {
    return this.tripsService.findMyTrips(user.id);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update trip status (driver or admin)' })
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
    @Body() dto: UpdateTripStatusDto,
  ) {
    return this.tripsService.updateStatus(id, user.id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Cancel a trip (driver or admin)' })
  cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    return this.tripsService.cancel(id, user.id);
  }

  @Delete(':id/hard')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: '[Admin] Hard-delete a trip from the database' })
  hardDelete(@Param('id', ParseUUIDPipe) id: string) {
    return this.tripsService.hardDelete(id);
  }

  // ─── Public (authenticated) ───────────────────────────────────────────────────

  @Get('search')
  @ApiOperation({ summary: 'Search available trips by route, date, car type, booking mode' })
  search(@Query() dto: SearchTripsDto) {
    return this.tripsService.search(dto);
  }

  // ─── Admin ────────────────────────────────────────────────────────────────────

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: '[Admin] List all trips' })
  @ApiQuery({ name: 'status', required: false, enum: ['scheduled', 'in_progress', 'completed', 'cancelled'] })
  findAll(@Query('status') status?: string) {
    return this.tripsService.findAll(status);
  }

  @Get('stock')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: '[Admin] Get real car stock for a route + service date' })
  getDailyStock(@Query() dto: TripStockQueryDto) {
    return this.tripsService.getDailyStock(dto);
  }

  @Post('stock/publish')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: '[Admin] Publish selected stock cars as trips' })
  publishFromStock(@CurrentUser() user: any, @Body() dto: PublishTripStockDto) {
    return this.tripsService.publishFromStock(user.id, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get full trip details including seat map and bookings' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.tripsService.findOne(id);
  }
}
