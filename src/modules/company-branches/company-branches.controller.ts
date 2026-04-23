import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CompanyBranchesService } from './company-branches.service';
import { CreateCompanyBranchDto } from './dto/create-company-branch.dto';
import { UpdateCompanyBranchDto } from './dto/update-company-branch.dto';

@ApiTags('Company Branches')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('company-branches')
export class CompanyBranchesController {
  constructor(private readonly service: CompanyBranchesService) {}

  @Get()
  @ApiOperation({ summary: 'List company pickup branches' })
  @ApiQuery({ name: 'activeOnly', required: false, type: Boolean })
  findAll(@Query('activeOnly') activeOnly?: string) {
    return this.service.findAll(activeOnly === 'true' ? true : undefined);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get company branch by ID' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: '[Admin] Create company branch' })
  create(@Body() dto: CreateCompanyBranchDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: '[Admin] Update company branch' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCompanyBranchDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: '[Admin] Deactivate company branch' })
  deactivate(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.deactivate(id);
  }
}

