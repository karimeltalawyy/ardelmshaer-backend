import { IsString, IsEmail, IsOptional, IsEnum, MinLength } from 'class-validator';

export class UpdateAdminUserDto {
  @IsString()
  @IsOptional()
  fullName?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @MinLength(4)
  @IsOptional()
  password?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  nationality?: string;

  @IsString()
  @IsOptional()
  idNumber?: string;

  @IsEnum(['rider', 'driver', 'admin'])
  @IsOptional()
  role?: string;

  @IsEnum(['active', 'suspended'])
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  licenseNumber?: string;
}
