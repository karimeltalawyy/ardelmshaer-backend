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
import { CarsService } from './cars.service';
import { CreateCarDto } from './dto/create-car.dto';
import { UpdateCarDto } from './dto/update-car.dto';
import { CreateSeatsDto } from './dto/create-seats.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CarType } from '@prisma/client';

@ApiTags('Cars')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('cars')
export class CarsController {
  constructor(private readonly carsService: CarsService) {}

  // ─── Car type configs (public to authenticated users) ─────────────────────────

  @Get('types')
  @ApiOperation({ summary: 'Get all active car types with booking mode info' })
  getCarTypes() {
    return this.carsService.getCarTypes();
  }

  @Get('catalog')
  @ApiOperation({ summary: 'Get backend-driven car catalog (carType > brand > model > seat options)' })
  @ApiQuery({ name: 'carType', required: false, enum: CarType })
  getCatalog(@Query('carType') carType?: CarType) {
    return this.carsService.getCatalog(carType);
  }

  // ─── Driver endpoints ─────────────────────────────────────────────────────────

  @Post()
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: '[Admin] Register a new car and assign it to an approved driver' })
  create(@CurrentUser() user: any, @Body() dto: CreateCarDto) {
    return this.carsService.create(user.id, dto);
  }

  @Get('my')
  @ApiOperation({ summary: 'Get all my cars' })
  findMyCars(@CurrentUser() user: any) {
    return this.carsService.findMyCars(user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a car (owner only)' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
    @Body() dto: UpdateCarDto,
  ) {
    return this.carsService.update(id, user.id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Deactivate a car (owner only)' })
  deactivate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    return this.carsService.deactivate(id, user.id);
  }

  @Post(':id/seats')
  @ApiOperation({
    summary: 'Set the seat layout for a per_seat car — replaces existing seats',
  })
  setSeats(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
    @Body() dto: CreateSeatsDto,
  ) {
    return this.carsService.setSeats(id, user.id, dto);
  }

  @Get(':id/seats')
  @ApiOperation({ summary: 'Get seats for a car' })
  getSeats(@Param('id', ParseUUIDPipe) id: string) {
    return this.carsService.getSeats(id);
  }

  // ─── Admin endpoints ──────────────────────────────────────────────────────────

  @Get()
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: '[Admin] List all cars' })
  @ApiQuery({ name: 'carType', required: false })
  @ApiQuery({ name: 'status', required: false, enum: ['active', 'inactive'] })
  findAll(
    @Query('carType') carType?: string,
    @Query('status') status?: string,
  ) {
    return this.carsService.findAll(carType, status);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a car by ID' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.carsService.findOne(id);
  }
}
