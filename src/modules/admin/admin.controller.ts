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
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { UpsertConfigDto } from './dto/upsert-config.dto';
import { CreateCancellationPolicyDto, UpdateCancellationPolicyDto } from './dto/cancellation-policy.dto';
import { CreateAdminUserDto } from './dto/create-user.dto';
import { UpdateAdminUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ─── Dashboard ────────────────────────────────────────────────────────────────

  @Get('dashboard')
  @ApiOperation({ summary: 'Platform KPI dashboard' })
  getDashboard() {
    return this.adminService.getDashboard();
  }

  // ─── Users ────────────────────────────────────────────────────────────────────

  @Get('drivers-for-cars')
  @ApiOperation({ summary: 'List all driver-role users with their driverProfile.id for car management' })
  getDriversForCarManagement() {
    return this.adminService.getDriversForCarManagement();
  }

  @Get('users')
  @ApiOperation({ summary: 'List all users' })
  @ApiQuery({ name: 'role', required: false, enum: ['rider', 'driver', 'admin'] })
  @ApiQuery({ name: 'status', required: false, enum: ['active', 'suspended'] })
  @ApiQuery({ name: 'search', required: false, description: 'Search by name, email, or phone' })
  getUsers(
    @Query('role') role?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.adminService.getUsers(role, status, search);
  }

  @Post('users')
  @ApiOperation({ summary: 'Create a user (admin/rider/driver)' })
  createUser(@CurrentUser() admin: any, @Body() dto: CreateAdminUserDto) {
    return this.adminService.createUser(admin.id, dto);
  }

  @Get('users/:id')
  @ApiOperation({ summary: 'Get user detail with driver profile and booking history' })
  getUserById(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.getUserById(id);
  }

  @Patch('users/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update user details (name, email, password, phone, role, status, licenseNumber)' })
  updateUser(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() admin: any,
    @Body() dto: UpdateAdminUserDto,
  ) {
    return this.adminService.updateUser(id, admin.id, dto);
  }

  @Patch('users/:id/status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Activate or suspend a user' })
  updateUserStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() admin: any,
    @Body() dto: UpdateUserStatusDto,
  ) {
    return this.adminService.updateUserStatus(id, admin.id, dto);
  }

  @Patch('users/:id/role')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change user role (e.g. grant admin)' })
  updateUserRole(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() admin: any,
    @Body() dto: UpdateUserRoleDto,
  ) {
    return this.adminService.updateUserRole(id, admin.id, dto);
  }

  @Delete('users/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete user if safe, otherwise suspend' })
  deleteUser(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() admin: any,
  ) {
    return this.adminService.deleteUser(id, admin.id);
  }

  @Post('users/:id/profile-image')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Upload or replace driver profile image' })
  @UseInterceptors(FileInterceptor('file', {
    storage: memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
        return cb(new BadRequestException('Only JPEG, PNG, and WebP images are allowed'), false);
      }
      cb(null, true);
    },
  }))
  uploadProfileImage(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() admin: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('No file uploaded');
    return this.adminService.uploadProfileImage(id, admin.id, file);
  }

  // ─── Platform Config ──────────────────────────────────────────────────────────

  @Get('config')
  @ApiOperation({ summary: 'List all platform configuration entries' })
  getConfigs() {
    return this.adminService.getConfigs();
  }

  @Post('config')
  @ApiOperation({ summary: 'Create or update a platform config entry' })
  upsertConfig(@CurrentUser() admin: any, @Body() dto: UpsertConfigDto) {
    return this.adminService.upsertConfig(admin.id, dto);
  }

  @Delete('config/:key')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a platform config entry' })
  deleteConfig(@Param('key') key: string, @CurrentUser() admin: any) {
    return this.adminService.deleteConfig(key, admin.id);
  }

  // ─── Cancellation Policies ────────────────────────────────────────────────────

  @Get('cancellation-policies')
  @ApiOperation({ summary: 'List all cancellation policies' })
  getCancellationPolicies() {
    return this.adminService.getCancellationPolicies();
  }

  @Post('cancellation-policies')
  @ApiOperation({ summary: 'Create a cancellation policy' })
  createCancellationPolicy(
    @CurrentUser() admin: any,
    @Body() dto: CreateCancellationPolicyDto,
  ) {
    return this.adminService.createCancellationPolicy(admin.id, dto);
  }

  @Patch('cancellation-policies/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a cancellation policy' })
  updateCancellationPolicy(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() admin: any,
    @Body() dto: UpdateCancellationPolicyDto,
  ) {
    return this.adminService.updateCancellationPolicy(id, admin.id, dto);
  }

  @Delete('cancellation-policies/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Deactivate a cancellation policy (soft delete)' })
  deleteCancellationPolicy(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() admin: any,
  ) {
    return this.adminService.deleteCancellationPolicy(id, admin.id);
  }

  // ─── Bookings ─────────────────────────────────────────────────────────────────

  @Delete('bookings/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Hard-delete a booking (admin only)' })
  deleteBooking(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() admin: any,
  ) {
    return this.adminService.deleteBooking(id, admin.id);
  }

  // ─── Audit Logs ───────────────────────────────────────────────────────────────

  @Get('audit-logs')
  @ApiOperation({ summary: 'View admin action audit trail' })
  @ApiQuery({ name: 'entityType', required: false })
  @ApiQuery({ name: 'adminId', required: false })
  @ApiQuery({ name: 'action', required: false })
  @ApiQuery({ name: 'search', required: false, description: 'Search by admin name' })
  @ApiQuery({ name: 'from', required: false, description: 'Start date YYYY-MM-DD' })
  @ApiQuery({ name: 'to', required: false, description: 'End date YYYY-MM-DD' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  getAuditLogs(
    @Query('entityType') entityType?: string,
    @Query('adminId') adminId?: string,
    @Query('action') action?: string,
    @Query('search') search?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminService.getAuditLogs({
      entityType,
      adminId,
      action,
      search,
      from,
      to,
      page: page ? +page : 1,
      limit: limit ? +limit : 50,
    });
  }
}
