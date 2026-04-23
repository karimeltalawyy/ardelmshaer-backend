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
import { RoutesService } from './routes.service';
import { CreateRouteDto } from './dto/create-route.dto';
import { UpdateRouteDto } from './dto/update-route.dto';
import { SetPricingDto } from './dto/set-pricing.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Routes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('routes')
export class RoutesController {
  constructor(private readonly routesService: RoutesService) {}

  @Get()
  @ApiOperation({ summary: 'List all routes' })
  @ApiQuery({ name: 'originId', required: false })
  @ApiQuery({ name: 'destinationId', required: false })
  findAll(
    @Query('originId') originId?: string,
    @Query('destinationId') destinationId?: string,
  ) {
    return this.routesService.findAll(originId, destinationId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a route by ID' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.routesService.findOne(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: '[Admin] Create a route' })
  create(@Body() dto: CreateRouteDto) {
    return this.routesService.create(dto);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: '[Admin] Update a route' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRouteDto,
  ) {
    return this.routesService.update(id, dto);
  }

  @Post(':id/pricing')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: '[Admin] Set or update pricing for a car type on this route' })
  setPricing(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetPricingDto,
  ) {
    return this.routesService.setPricing(id, dto);
  }

  @Delete('pricing/:pricingId')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: '[Admin] Remove a pricing entry' })
  removePricing(@Param('pricingId', ParseUUIDPipe) pricingId: string) {
    return this.routesService.removePricing(pricingId);
  }
}
