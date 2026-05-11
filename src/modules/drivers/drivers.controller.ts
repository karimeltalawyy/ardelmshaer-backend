import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  ParseUUIDPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { DriversService } from './drivers.service';
import { ApplyDriverDto } from './dto/apply-driver.dto';
import { ReviewDriverDto } from './dto/review-driver.dto';
import { UploadDocumentDto } from './dto/upload-document.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Drivers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('drivers')
export class DriversController {
  constructor(private readonly driversService: DriversService) {}

  // ─── Driver-facing ────────────────────────────────────────────────────────────

  @Post('apply')
  @ApiOperation({ summary: 'Submit a driver application' })
  apply(@CurrentUser() user: any, @Body() dto: ApplyDriverDto) {
    return this.driversService.apply(user.id, dto);
  }

  @Get('me')
  @ApiOperation({ summary: 'Get my driver profile and documents' })
  getMyProfile(@CurrentUser() user: any) {
    return this.driversService.getMyProfile(user.id);
  }

  @Get('me/booking-documents')
  @ApiOperation({ summary: 'List all generated PDF documents for this driver across all bookings' })
  getMyBookingDocuments(@CurrentUser() user: any) {
    return this.driversService.getMyBookingDocuments(user.id);
  }

  @Post('documents')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  @ApiOperation({ summary: 'Upload a driver document (national_id, license, car_registration, car_photo)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'docType'],
      properties: {
        file: { type: 'string', format: 'binary' },
        docType: { type: 'string', enum: ['national_id', 'license', 'car_registration', 'car_photo'] },
      },
    },
  })
  uploadDocument(
    @CurrentUser() user: any,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: UploadDocumentDto,
  ) {
    if (!file) throw new BadRequestException('File is required');
    if (file.size > 10 * 1024 * 1024) throw new BadRequestException('File must be under 10 MB');
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowed.includes(file.mimetype)) {
      throw new BadRequestException('Only JPEG, PNG, WEBP, or PDF files are allowed');
    }
    return this.driversService.uploadDocument(user.id, body.docType, file);
  }

  // ─── Admin-facing ─────────────────────────────────────────────────────────────

  @Get()
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: '[Admin] List all driver applications' })
  @ApiQuery({ name: 'status', required: false, enum: ['pending', 'approved', 'rejected'] })
  findAll(@Query('status') status?: string) {
    return this.driversService.findAll(status);
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: '[Admin] Get a driver profile by ID' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.driversService.findOne(id);
  }

  @Patch(':id/review')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: '[Admin] Approve or reject a driver application' })
  review(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() admin: any,
    @Body() dto: ReviewDriverDto,
  ) {
    return this.driversService.review(id, admin.id, dto);
  }
}
