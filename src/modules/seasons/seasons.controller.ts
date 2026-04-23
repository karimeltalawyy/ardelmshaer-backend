import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SeasonsService } from './seasons.service';
import { CreateSeasonDto } from './dto/create-season.dto';
import { UpdateSeasonDto } from './dto/update-season.dto';
import { CreateOverrideDto } from './dto/create-override.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Seasons')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('seasons')
export class SeasonsController {
  constructor(private readonly seasonsService: SeasonsService) {}

  @Get('active')
  @ApiOperation({ summary: 'Get the currently active season (if any)' })
  getActiveSeason() {
    return this.seasonsService.getActiveSeason();
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: '[Admin] List all seasons' })
  findAll() {
    return this.seasonsService.findAll();
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: '[Admin] Get a season by ID with all overrides' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.seasonsService.findOne(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: '[Admin] Create a season' })
  create(@Body() dto: CreateSeasonDto) {
    return this.seasonsService.create(dto);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: '[Admin] Update a season' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSeasonDto,
  ) {
    return this.seasonsService.update(id, dto);
  }

  @Post(':id/overrides')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: '[Admin] Add or update a price override for a route pricing' })
  addOverride(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateOverrideDto,
  ) {
    return this.seasonsService.addOverride(id, dto);
  }

  @Delete('overrides/:overrideId')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: '[Admin] Remove a price override' })
  removeOverride(@Param('overrideId', ParseUUIDPipe) overrideId: string) {
    return this.seasonsService.removeOverride(overrideId);
  }
}
